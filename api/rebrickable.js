// Vercel Serverless Function to proxy Rebrickable API requests
// This keeps the API key secure on the server side

export default async function handler(req, res) {
  console.log('=== API Request ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Query:', req.query);
  console.log('Origin:', req.headers.origin);
  console.log('VERCEL_ENV:', process.env.VERCEL_ENV);
  console.log('API Key exists:', !!process.env.REBRICKABLE_API_KEY);
  console.log('API Key length:', process.env.REBRICKABLE_API_KEY?.length);
  console.log('API Key preview:', process.env.REBRICKABLE_API_KEY?.substring(0, 10) + '...');

  // Define allowed origins
  const allowedOrigins = [
    'https://bricktally.app',
    'https://www.bricktally.app',
    'http://localhost:3000',  // Vercel dev
    'http://127.0.0.1:3000',  // Vercel dev alternative
    'http://localhost:5173',  // Vite dev server
    'http://127.0.0.1:5173'   // Vite dev alternative
  ];

  // Get the request origin and host
  const origin = req.headers.origin;
  const host = req.headers.host;
  const referer = req.headers.referer;

  console.log('Host:', host);
  console.log('Referer:', referer);

  // Allow requests from Vercel preview deployments
  const isVercelDeployment = host && host.includes('vercel.app');

  // Check if origin is allowed
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin || origin === 'null') {
    // Allow requests with no origin (same-origin requests from the same domain)
    // Also allow in development
    const isProduction = process.env.VERCEL_ENV === 'production';
    if (!isProduction || isVercelDeployment) {
      res.setHeader('Access-Control-Allow-Origin', '*');
    } else {
      // In production without origin, allow if referer matches our domain
      if (referer && (referer.includes('bricktally.app') || referer.includes(host))) {
        res.setHeader('Access-Control-Allow-Origin', '*');
      } else {
        console.error('Origin not allowed - origin:', origin, 'host:', host, 'referer:', referer);
        return res.status(403).json({ error: 'Origin not allowed' });
      }
    }
  } else if (isVercelDeployment && origin.includes('vercel.app')) {
    // Allow Vercel preview deployments
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    console.error('Origin not allowed - origin:', origin, 'allowedOrigins:', allowedOrigins);
    return res.status(403).json({ error: 'Origin not allowed', receivedOrigin: origin });
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get the API key from environment variables
  const API_KEY = process.env.REBRICKABLE_API_KEY;

  if (!API_KEY) {
    console.error('❌ API key not configured!');
    return res.status(500).json({ error: 'API key not configured' });
  }

  // Get the endpoint path from query parameter
  // Example: /api/rebrickable?endpoint=/lego/sets/10294-1/
  const { endpoint, ...otherParams } = req.query;

  if (!endpoint) {
    console.error('❌ Missing endpoint parameter');
    return res.status(400).json({ error: 'Missing endpoint parameter' });
  }

  console.log('Endpoint:', endpoint);
  console.log('Other params:', otherParams);

  try {
    // Build the Rebrickable URL
    const baseUrl = 'https://rebrickable.com/api/v3';
    // Remove leading slash from endpoint if present
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    const url = new URL(cleanEndpoint, baseUrl + '/');

    // Prevent SSRF — ensure the resolved URL stays within the Rebrickable API
    if (!url.href.startsWith(baseUrl)) {
      return res.status(400).json({ error: 'Invalid endpoint' });
    }

    // Add any additional query parameters (like page, page_size)
    Object.keys(otherParams).forEach(key => {
      url.searchParams.append(key, otherParams[key]);
    });

    console.log('Fetching from:', url.toString());

    // Make the request to Rebrickable
    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'Authorization': `key ${API_KEY}`
      }
    });

    console.log('Rebrickable response status:', response.status);

    // Get the response data
    const data = await response.json();

    console.log('✅ Success - returning data');

    // Forward the status code and data
    return res.status(response.status).json(data);

  } catch (error) {
    console.error('❌ Rebrickable API error:', error);
    return res.status(500).json({ error: 'Failed to fetch from Rebrickable API' });
  }
}
