// Dynamic manifest endpoint that returns different manifests based on host
const fs = require('fs');
const path = require('path');

export default function handler(req, res) {
  const host = req.headers.host || '';

  // Determine which manifest to serve
  let manifestFile = 'manifest.json';
  if (host.includes('preview.bricktally.app')) {
    manifestFile = 'manifest-preview.json';
  }

  // Read the appropriate manifest file
  const manifestPath = path.join(process.cwd(), manifestFile);

  try {
    const manifest = fs.readFileSync(manifestPath, 'utf8');

    // Set appropriate headers
    res.setHeader('Content-Type', 'application/manifest+json');
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');

    // Send the manifest
    res.status(200).send(manifest);
  } catch (error) {
    console.error('Error reading manifest:', error);
    res.status(500).json({ error: 'Failed to load manifest' });
  }
}
