// Vercel Serverless Function to proxy Rebrickable API requests
// This keeps the API key secure on the server side

// Simple per-IP rate limiter (in-memory, per serverless instance)
const rateLimit = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 30; // requests per window

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateLimit.get(ip);

  if (!entry || now - entry.start > RATE_LIMIT_WINDOW) {
    rateLimit.set(ip, { start: now, count: 1 });
    return false;
  }

  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://bricktally.app',
  'https://www.bricktally.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];

function getAllowedOrigin(req) {
  const origin = req.headers.origin;
  const isProduction = process.env.VERCEL_ENV === 'production';

  // Explicit origin match
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return origin;
  }

  // Same-origin requests have no origin header — allow in all environments
  if (!origin) {
    return '*';
  }

  // Development: be permissive
  if (!isProduction) {
    return origin;
  }

  return null;
}

export default async function handler(req, res) {
  // Check origin
  const allowedOrigin = getAllowedOrigin(req);
  if (!allowedOrigin) {
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
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
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  const API_KEY = process.env.REBRICKABLE_API_KEY;
  if (!API_KEY) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const { endpoint, ...otherParams } = req.query;

  if (!endpoint) {
    return res.status(400).json({ error: 'Missing endpoint parameter' });
  }

  try {
    const baseUrl = 'https://rebrickable.com/api/v3';
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    const url = new URL(cleanEndpoint, baseUrl + '/');

    // Prevent SSRF — ensure the resolved URL stays within the Rebrickable API
    if (!url.href.startsWith(baseUrl)) {
      return res.status(400).json({ error: 'Invalid endpoint' });
    }

    Object.keys(otherParams).forEach(key => {
      url.searchParams.append(key, otherParams[key]);
    });

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'Authorization': `key ${API_KEY}`
      }
    });

    const data = await response.json();
    return res.status(response.status).json(data);

  } catch (error) {
    console.error('Rebrickable API error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch from Rebrickable API' });
  }
}
