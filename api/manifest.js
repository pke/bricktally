// Dynamic manifest endpoint that redirects based on host

export default function handler(req, res) {
  const host = req.headers.host || '';

  // Determine which manifest to redirect to
  const manifestFile = host.includes('preview.bricktally.app')
    ? '/manifest-preview.json'
    : '/manifest-prod.json';

  // Redirect to the appropriate manifest
  res.setHeader('Location', manifestFile);
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  res.status(302).end();
}
