// Shared per-IP rate limiter (in-memory, per serverless instance)
// The underscore prefix keeps Vercel from exposing this file as a route.

const rateLimit = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_ENTRIES = 5000;

export function isRateLimited(ip, max) {
  const now = Date.now();

  // Prune expired entries so the map cannot grow unbounded
  if (rateLimit.size > MAX_ENTRIES) {
    for (const [key, entry] of rateLimit) {
      if (now - entry.start > RATE_LIMIT_WINDOW) {
        rateLimit.delete(key);
      }
    }
  }

  const entry = rateLimit.get(ip);

  if (!entry || now - entry.start > RATE_LIMIT_WINDOW) {
    rateLimit.set(ip, { start: now, count: 1 });
    return false;
  }

  entry.count++;
  return entry.count > max;
}
