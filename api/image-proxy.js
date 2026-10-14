// Vercel Serverless Function to proxy images with CORS headers
// This allows cross-origin images to be drawn on canvas without tainting it
// This function only allows images from the Rebrickable CDN for security reasons
// Required for badge creation with canvas.

import { isRateLimited } from './_rate-limit.js';

const RATE_LIMIT_MAX = 300; // requests per window per IP
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_HOSTNAMES = ['cdn.rebrickable.com', 'rebrickable.com'];

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limit by IP
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  if (isRateLimited(ip, RATE_LIMIT_MAX)) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  try {
    // Repeated query params arrive as an array — require a single string
    if (typeof url !== 'string') {
      return res.status(400).json({ error: 'Invalid url parameter' });
    }

    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid url parameter' });
    }

    // Only allow HTTPS URLs on the Rebrickable hostnames
    if (parsed.protocol !== 'https:' || !ALLOWED_HOSTNAMES.includes(parsed.hostname)) {
      return res.status(403).json({ error: 'Only Rebrickable URLs are allowed' });
    }

    const response = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      return res.status(502).json({ error: 'Failed to fetch image' });
    }

    // Reject oversized responses early via the content-length header
    const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
    if (contentLength > MAX_BYTES) {
      return res.status(413).json({ error: 'Image too large' });
    }

    const contentType = response.headers.get('content-type') || '';
    const mimeType = contentType.split(';')[0].trim();

    if (!ALLOWED_TYPES.includes(mimeType)) {
      return res.status(415).json({ error: 'Unsupported content type' });
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_BYTES) {
      return res.status(413).json({ error: 'Image too large' });
    }

    res.setHeader('Content-Type', mimeType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
    return res.send(Buffer.from(buffer));

  } catch (error) {
    console.error('Image proxy error:', error);
    return res.status(500).json({ error: 'Failed to proxy image' });
  }
}
