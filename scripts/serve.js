import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const port = Number(process.env.PORT || 8080);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  try {
    const url = new URL(req.url, `http://localhost:${port}`);
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    if (url.pathname === '/manifest.json' || url.pathname === '/api/manifest') {
      const manifest = JSON.parse(await readFile(resolve(root, 'manifest-prod.json'), 'utf8'));
      manifest.name = 'BrickTally (local)';
      manifest.short_name = 'BrickTally Local';
      res.writeHead(200, { 'Content-Type': 'application/manifest+json' });
      res.end(req.method === 'HEAD' ? undefined : JSON.stringify(manifest));
      return;
    }

    // Reuse the public, read-only backend without requiring a local API key.
    // Forward neither browser cookies nor authorization headers.
    if (['/api/rebrickable', '/api/image-proxy'].includes(url.pathname)) {
      const upstream = await fetch(`https://bricktally.app${url.pathname}${url.search}`, {
        signal: AbortSignal.timeout(20000),
        redirect: 'error'
      });
      const body = Buffer.from(await upstream.arrayBuffer());
      res.writeHead(upstream.status, {
        'Content-Type': upstream.headers.get('content-type') || 'application/octet-stream'
      });
      res.end(req.method === 'HEAD' ? undefined : body);
      return;
    }

    const path = decodeURIComponent(url.pathname);
    if (path.startsWith('/api/')) {
      res.writeHead(404).end();
      return;
    }
    let file = resolve(dist, '.' + path);
    if (file !== dist && !file.startsWith(dist + sep)) {
      res.writeHead(403).end();
      return;
    }
    if (/^\/(?:de|fr|es|nl|da|ja|ko|ru|zh-CN|zh-TW)\/changelog\/?$/.test(path)) {
      file = resolve(dist, 'changelog.html');
    } else {
      const info = await stat(file).catch(() => null);
      if (info?.isDirectory()) file = resolve(file, 'index.html');
      else if (!info && !extname(file)) file += '.html';
    }
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch (error) {
    const status = error.code === 'ENOENT' || error.code === 'ENOTDIR' ? 404
      : error instanceof URIError ? 400 : 502;
    res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' }).end(
      status === 502 ? 'Backend unavailable. Please try again.' : http.STATUS_CODES[status]
    );
  }
});

server.on('error', error => {
  console.error(error.message);
  process.exitCode = 1;
});
server.listen(port, 'localhost', () => {
  console.log(`BrickTally local PWA: http://localhost:${port}/de/`);
  console.log('Set data and images use the existing bricktally.app backend.');
});
