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
});
