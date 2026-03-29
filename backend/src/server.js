const express = require('express');
const Docker = require('dockerode');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const DATA_DIR = process.env.DATA_DIR || '/data';
const LINKS_FILE = path.join(DATA_DIR, 'links.json');

function readLinks() {
  try {
    return JSON.parse(fs.readFileSync(LINKS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeLinks(links) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(LINKS_FILE, JSON.stringify(links, null, 2));
}

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

// Headers that block iframe embedding or cause decode issues — strip when proxying
const STRIP_HEADERS = new Set([
  'x-frame-options',
  'content-security-policy',
  'x-xss-protection',
  'strict-transport-security',
  'content-encoding',  // Node fetch auto-decompresses; don't tell browser it's still encoded
  'content-length',    // changes after decompression + URL rewriting
  'transfer-encoding',
  'connection',
]);

// Resolve a URL found in the proxied page and wrap it so it goes through our proxy.
// Handles absolute, root-relative, and path-relative URLs.
function toProxyHref(href, base) {
  if (!href) return href;
  const trimmed = href.trim();
  if (/^(#|javascript:|data:|blob:|mailto:|tel:)/.test(trimmed)) return trimmed;
  try {
    const abs = new URL(trimmed, base).toString();
    return `/api/proxy?url=${encodeURIComponent(abs)}`;
  } catch { return trimmed; }
}

// Rewrite all resource URLs in an HTML document so every asset (scripts,
// stylesheets, images, fonts, form actions) loads through /api/proxy.
// Also inject a tiny fetch/XHR shim so JS-initiated API calls from the
// page's own scripts are also routed through the proxy.
function rewriteHtml(html, targetUrl) {
  const base = new URL(targetUrl);
  const p = (href) => toProxyHref(href, base);

  // Rewrite HTML attribute URLs (src, href, action) — double and single quotes
  html = html
    .replace(/((?:src|href|action)\s*=\s*")([^"#][^"]*?)(")/gi, (_, pre, val, post) => `${pre}${p(val)}${post}`)
    .replace(/((?:src|href|action)\s*=\s*')([^'#][^']*?)(')/gi, (_, pre, val, post) => `${pre}${p(val)}${post}`)
    // CSS url() in inline styles and <style> blocks
    .replace(/url\(\s*["']?([^"')]+?)["']?\s*\)/g, (_, u) => `url("${p(u)}")`);

  // JS shim: intercepts fetch() and XMLHttpRequest from the proxied page so
  // same-origin API calls (e.g. /api/states) are routed through our proxy.
  const origin = JSON.stringify(base.origin);
  const shim = `<script>(function(){` +
    `var _o=${origin};` +
    `function _p(u){` +
      `if(!u||typeof u!=="string")return u;` +
      `if(/^(#|data:|blob:|javascript:)/.test(u))return u;` +
      `try{var a=new URL(u,_o).href;` +
        `if(a.startsWith(_o))return"/api/proxy?url="+encodeURIComponent(a);}` +
      `catch(e){}return u;}` +
    // Shim fetch
    `var _f=window.fetch;` +
    `window.fetch=function(i,o){return _f.call(this,typeof i==="string"?_p(i):i,o);};` +
    // Shim XHR
    `var _x=XMLHttpRequest.prototype.open;` +
    `XMLHttpRequest.prototype.open=function(){` +
      `arguments[1]=_p(arguments[1]);return _x.apply(this,arguments);};` +
  `})();</script>`;

  // Inject shim as early as possible so it runs before the page's own scripts
  if (/<head[^>]*>/i.test(html)) {
    html = html.replace(/<head[^>]*>/i, (m) => `${m}\n${shim}`);
  } else {
    html = shim + html;
  }

  return html;
}

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
        'Accept': req.headers['accept'] || 'text/html,application/xhtml+xml,*/*',
        'Accept-Language': req.headers['accept-language'] || 'en',
        'Cookie': req.headers['cookie'] || '',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    });

    res.status(response.status);

    // Forward headers minus the ones that break embedding or decoding
    for (const [key, value] of response.headers.entries()) {
      if (!STRIP_HEADERS.has(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    }
    // Allow the dashboard to load this as a same-origin resource
    res.setHeader('Access-Control-Allow-Origin', '*');

    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('text/html')) {
      const html = rewriteHtml(await response.text(), url.toString());
      res.setHeader('content-type', 'text/html; charset=utf-8');
      res.send(html);
    } else if (contentType.includes('text/css')) {
      // Also rewrite url() references inside CSS files
      let css = await response.text();
      css = css.replace(/url\(\s*["']?([^"')]+?)["']?\s*\)/g,
        (_, u) => `url("${toProxyHref(u, url.toString())}")`);
      res.setHeader('content-type', 'text/css');
      res.send(css);
    } else {
      // Stream everything else (JS, images, fonts, JSON) unchanged
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

// ── Custom links CRUD ────────────────────────────────────────────────────────

app.get('/api/links', (_req, res) => {
  res.json(readLinks());
});

app.post('/api/links', (req, res) => {
  const { name, url, icon, description } = req.body;
  if (!name || !url) return res.status(400).json({ error: 'name and url are required' });
  const links = readLinks();
  const link = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    name,
    url,
    icon: icon || null,
    description: description || null,
  };
  links.push(link);
  writeLinks(links);
  res.status(201).json(link);
});

app.put('/api/links/:id', (req, res) => {
  const links = readLinks();
  const idx = links.findIndex((l) => l.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const { name, url, icon, description } = req.body;
  links[idx] = {
    ...links[idx],
    ...(name !== undefined && { name }),
    ...(url !== undefined && { url }),
    ...(icon !== undefined && { icon: icon || null }),
    ...(description !== undefined && { description: description || null }),
  };
  writeLinks(links);
  res.json(links[idx]);
});

app.delete('/api/links/:id', (req, res) => {
  const links = readLinks();
  const filtered = links.filter((l) => l.id !== req.params.id);
  if (filtered.length === links.length) return res.status(404).json({ error: 'Not found' });
  writeLinks(filtered);
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
