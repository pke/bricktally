import { test, expect } from '@playwright/test';

/**
 * fetchWithRetry backs off on HTTP 429 and must give up after a bounded
 * number of retries instead of hammering the rate-limited API forever.
 */
test.describe('API retry on rate limit', () => {
  test('gives up after 3 retries and shows an error', async ({ page }) => {
    // Count requests per endpoint: loadSet first searches for versions and,
    // when that fails, falls back to loading the set directly
    const requests = {};
    await page.route('**/api/rebrickable**', async (route) => {
      const url = new URL(route.request().url());
      const key = url.searchParams.get('endpoint') + (url.searchParams.has('search') ? '?search' : '');
      requests[key] = (requests[key] || 0) + 1;
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Too many requests' })
      });
    });

    await page.clock.install();
    await page.goto('/');

    await page.locator('#setNumber').evaluate(el => { el.type = 'text'; });
    await page.locator('#setNumber').fill('10294-1');
    await page.locator('#setNumber').press('Enter');

    // Backoff is 1s, 2s, 4s — keep fast-forwarding until the app gives up
    await expect.poll(async () => {
      await page.clock.runFor(5000);
      return page.locator('#error').isVisible();
    }, { timeout: 15000 }).toBe(true);

    // ...and make sure nothing keeps retrying in the background
    await page.clock.runFor(120000);
    // 1 initial attempt + 3 retries for each endpoint
    expect(requests).toEqual({
      '/lego/sets/?search': 4,
      '/lego/sets/10294-1/': 4
    });
  });
});
