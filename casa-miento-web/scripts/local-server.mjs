import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import rsvpHandler from '../api/rsvp.js';
import adminSummaryHandler from '../api/admin-summary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, '..', 'dist');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

const enhanceResponse = (res) => {
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (payload) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(payload));
  };
  res.send = (payload) => {
    res.end(payload);
  };
  return res;
};

const serveStatic = async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let pathname = url.pathname;
  if (pathname === '/') pathname = '/index.html';

  const filePath = path.join(distDir, pathname);
  if (!filePath.startsWith(distDir)) {
    res.status(403).end('Forbidden');
    return;
  }

  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath);
    const mime = mimeTypes[ext] || 'application/octet-stream';
    res.status(200);
    res.setHeader('Content-Type', mime);
    res.end(data);
  } catch (err) {
    if (pathname !== '/index.html') {
      try {
        const indexHtml = await fs.readFile(path.join(distDir, 'index.html'));
        res.status(200);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(indexHtml);
        return;
      } catch (err2) {
        res.status(404).end('Not found');
        return;
      }
    }
    res.status(404).end('Not found');
  }
};

const server = http.createServer((req, res) => {
  enhanceResponse(res);

  if (req.url.startsWith('/api/rsvp')) {
    return rsvpHandler(req, res);
  }
  if (req.url.startsWith('/api/admin-summary')) {
    return adminSummaryHandler(req, res);
  }

  return serveStatic(req, res);
});

const rawServerPort = process.env.SERVER_PORT;
if (!rawServerPort) {
  throw new Error('Falta SERVER_PORT en variables de entorno.');
}
const serverPort = Number(rawServerPort);
if (!Number.isFinite(serverPort) || serverPort <= 0) {
  throw new Error('SERVER_PORT debe ser un numero valido.');
}

server.listen(serverPort, () => {
  console.log(`Servidor local de produccion listo en http://localhost:${serverPort}`);
});
