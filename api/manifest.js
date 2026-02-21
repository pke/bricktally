// Dynamic manifest endpoint that serves the appropriate manifest based on host

import { readFileSync } from 'fs';
import { join } from 'path';

export default function handler(req, res) {
  const host = req.headers.host || '';
  const filename = host.includes('preview.bricktally.app') ? 'manifest-preview.json' : 'manifest-prod.json';
  const manifest = JSON.parse(readFileSync(join(process.cwd(), filename), 'utf-8'));

  res.setHeader('Content-Type', 'application/manifest+json');
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  res.status(200).json(manifest);
}
