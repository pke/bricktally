// Vercel Serverless Function to proxy Rebrickable API requests
// This keeps the API key secure on the server side

import { isRateLimited } from './_rate-limit.js';

const RATE_LIMIT_MAX = 30; // requests per window

// Allowlisted endpoint shape: /lego/sets/ or /lego/sets/<num>-<ver>/[parts/|minifigs/]
const ENDPOINT_RE = /^lego\/sets\/(?:[A-Za-z0-9][A-Za-z0-9._]*-\d+\/(?:parts\/|minifigs\/)?)?$/;

// Only these query params are forwarded upstream
const ALLOWED_QUERY_PARAMS = ['search', 'page', 'page_size'];

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://bricktally.app',
  'https://www.bricktally.app',
  'https://preview.bricktally.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:8080',
  'http://127.0.0.1:8080'
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

  // Non-production: allow the deployment's own Vercel URLs only
  if (!isProduction) {
    const deploymentOrigins = [
      process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`,
      process.env.VERCEL_BRANCH_URL && `https://${process.env.VERCEL_BRANCH_URL}`
    ].filter(Boolean);
    if (deploymentOrigins.includes(origin)) {
      return origin;
    }
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
  if (isRateLimited(ip, RATE_LIMIT_MAX)) {
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

  // Repeated query params arrive as an array — reject non-string endpoints
  if (typeof endpoint !== 'string') {
    return res.status(400).json({ error: 'Invalid endpoint' });
  }

  try {
    const baseUrl = 'https://rebrickable.com/api/v3';
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;

    // Allowlist: only Rebrickable set lookups. This also rejects '#', '?'
    // and anything that could escape the base URL.
    if (!ENDPOINT_RE.test(cleanEndpoint)) {
      return res.status(400).json({ error: 'Invalid endpoint' });
    }

    const url = new URL(cleanEndpoint, baseUrl + '/');

    // Prevent SSRF — ensure the resolved URL stays within the Rebrickable API
    if (!url.href.startsWith(baseUrl)) {
      return res.status(400).json({ error: 'Invalid endpoint' });
    }

    // Forward only the allowlisted query params; silently drop the rest
    ALLOWED_QUERY_PARAMS.forEach(key => {
      const value = otherParams[key];
      if (value === undefined) return;
      (Array.isArray(value) ? value : [value]).forEach(v => {
        url.searchParams.append(key, v);
      });
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
