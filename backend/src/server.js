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

        // Skip containers with no way to access them
        if (!url) return null;

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
