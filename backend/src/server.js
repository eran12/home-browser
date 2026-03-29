const express = require('express');
const Docker = require('dockerode');
const cors = require('cors');
const path = require('path');

const app = express();
const docker = new Docker({ socketPath: process.env.DOCKER_SOCKET || '/var/run/docker.sock' });

const SERVER_HOST = process.env.SERVER_HOST || 'localhost';
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(cors());
app.use(express.json());

// Serve compiled React frontend
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

function buildUrl(container, labels) {
  if (labels['homepage.url']) return labels['homepage.url'];

  const publishedPort = (container.Ports || []).find(
    (p) => p.PublicPort && p.Type === 'tcp'
  );
  if (publishedPort) {
    return `http://${SERVER_HOST}:${publishedPort.PublicPort}`;
  }
  return null;
}

function cleanImageName(image) {
  // Strip registry prefix (e.g. ghcr.io/org/name:tag → org/name:tag)
  const parts = image.split('/');
  if (parts.length >= 3 && parts[0].includes('.')) {
    return parts.slice(1).join('/');
  }
  return image;
}

// Headers that block iframe embedding — strip these when proxying
const STRIP_HEADERS = new Set([
  'x-frame-options',
  'content-security-policy',
  'x-xss-protection',
  'strict-transport-security',
  'transfer-encoding', // express handles this itself
  'connection',
]);

app.get('/api/proxy', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).json({ error: 'Missing url parameter' });

  let url;
  try {
    url = new URL(targetUrl);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Invalid protocol');
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (HomeBrowser proxy)',
        'Accept': req.headers['accept'] || 'text/html,*/*',
        'Accept-Language': req.headers['accept-language'] || 'en',
        'Cookie': req.headers['cookie'] || '',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    });

    // Forward status
    res.status(response.status);

    // Forward headers, stripping the ones that block embedding
    for (const [key, value] of response.headers.entries()) {
      if (!STRIP_HEADERS.has(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    }

    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('text/html')) {
      let html = await response.text();
      // Inject a <base> tag so relative URLs (CSS, JS, images) still load
      // directly from the service. This makes simple pages work out of the box.
      // JS-heavy SPAs may not function fully since their JS API calls are
      // same-origin relative and will target the dashboard, not the service.
      const origin = url.origin;
      const basePath = url.pathname.endsWith('/') ? url.pathname : url.pathname.replace(/\/[^/]*$/, '/');
      const baseTag = `<base href="${origin}${basePath}">`;
      if (/<head[^>]*>/i.test(html)) {
        html = html.replace(/<head[^>]*>/i, (m) => `${m}\n  ${baseTag}`);
      } else {
        html = baseTag + html;
      }
      res.setHeader('content-type', 'text/html; charset=utf-8');
      res.send(html);
    } else {
      // Stream binary / non-HTML content through unchanged
      const { Readable } = require('stream');
      Readable.fromWeb(response.body).pipe(res);
    }
  } catch (err) {
    console.error('Proxy error:', err.message);
    res.status(502).json({ error: 'Proxy error', details: err.message });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/containers', async (_req, res) => {
  try {
    const containers = await docker.listContainers({ all: false });

    const services = containers
      .map((container) => {
        const labels = container.Labels || {};

        if (labels['homepage.hide'] === 'true') return null;

        const rawName = (container.Names?.[0] || container.Id.slice(0, 12)).replace(/^\//, '');
        const name = labels['homepage.name'] || rawName;

        const url = buildUrl(container, labels);

        const ports = (container.Ports || [])
          .filter((p) => p.PublicPort)
          .map((p) => `${p.PublicPort}→${p.PrivatePort}`)
          // Deduplicate
          .filter((v, i, a) => a.indexOf(v) === i);

        return {
          id: container.Id.slice(0, 12),
          name,
          image: cleanImageName(container.Image),
          status: container.Status,
          state: container.State,
          url,
          ports,
          icon: labels['homepage.icon'] || null,
          description: labels['homepage.description'] || null,
          group: labels['homepage.group'] || null,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name));

    res.json({ services, serverHost: SERVER_HOST, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.error('Docker API error:', err.message);
    res.status(500).json({
      error: 'Failed to connect to Docker',
      details: err.message,
    });
  }
});

// Fallback: serve React app for all non-API routes
app.get('*', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Home Browser listening on port ${PORT}`);
  console.log(`Server host for links: ${SERVER_HOST}`);
  console.log(`Docker socket: ${process.env.DOCKER_SOCKET || '/var/run/docker.sock'}`);
});
