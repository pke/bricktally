import { test, expect } from '@playwright/test';

/**
 * API Security Tests
 *
 * Tests that the API proxy correctly rejects attempts to escape
 * the Rebrickable API base URL (SSRF prevention).
 *
 * Requires Vercel serverless functions (runs via `vercel dev` in CI).
 */

test.describe('API Security', () => {
  test('SSRF: rejects protocol-relative URL that escapes base URL', async ({ page }) => {
    await page.goto('/');

    const response = await page.request.get('/api/rebrickable?endpoint=//evil.com/steal');
    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.error).toBe('Invalid endpoint');
  });

  test('SSRF: rejects absolute URL that escapes base URL', async ({ page }) => {
    await page.goto('/');

    const response = await page.request.get('/api/rebrickable?endpoint=https://evil.com/steal');
    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.error).toBe('Invalid endpoint');
  });

  test('SSRF: allows valid Rebrickable endpoint', async ({ page }) => {
    await page.goto('/');

    // This should pass validation (actual API call may fail without key, but shouldn't return 400)
    const response = await page.request.get('/api/rebrickable?endpoint=/lego/sets/10294-1/');
    expect(response.status()).not.toBe(400);
  });

  test('SSRF: rejects endpoint with fragment injection', async ({ page }) => {
    await page.goto('/');

    const response = await page.request.get('/api/rebrickable?endpoint=/lego/sets/10179-1%23x/');
    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.error).toBe('Invalid endpoint');
  });

  test('Allowlist: rejects non-set endpoints', async ({ page }) => {
    await page.goto('/');

    const response = await page.request.get('/api/rebrickable?endpoint=/users/abc/sets/');
    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.error).toBe('Invalid endpoint');
  });

  test('Rejects repeated endpoint params', async ({ page }) => {
    await page.goto('/');

    const response = await page.request.get('/api/rebrickable?endpoint=a&endpoint=b');
    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.error).toBe('Invalid endpoint');
  });

  test('Image proxy: rejects non-Rebrickable host', async ({ page }) => {
    await page.goto('/');

    const response = await page.request.get('/api/image-proxy?url=' + encodeURIComponent('https://evil.com/x.png'));
    expect(response.status()).toBe(403);
  });

  test('Image proxy: rejects lookalike hostname', async ({ page }) => {
    await page.goto('/');

    const response = await page.request.get('/api/image-proxy?url=' + encodeURIComponent('https://cdn.rebrickable.com.evil.com/x.png'));
    expect(response.status()).toBe(403);
  });

  test('Image proxy: rejects repeated url param', async ({ page }) => {
    await page.goto('/');

    const response = await page.request.get('/api/image-proxy?url=a&url=b');
    expect(response.status()).toBe(400);
  });

  test('CSP header is present on pages', async ({ page }) => {
    const response = await page.request.get('/');
    const csp = response.headers()['content-security-policy'] || '';
    expect(csp).toContain("object-src 'none'");
  });
});
