import { test, expect } from '@playwright/test';

/**
 * Service worker precache must cover every script the app shell needs.
 * On the first visit scripts load before the SW controls the page, so anything
 * missing from STATIC_ASSETS is never cached and the next offline launch breaks.
 */
test.describe('Service Worker precache', () => {
  async function getStaticAssets(request) {
    const sw = await (await request.get('/sw.js')).text();
    const match = sw.match(/const STATIC_ASSETS = (\[[\s\S]*?\]);/);
    expect(match, 'STATIC_ASSETS array not found in sw.js').not.toBeNull();
    // Strip line comments, then evaluate the array literal
    const literal = match[1].replace(/\/\/.*$/gm, '');
    return new Function('return ' + literal)();
  }

  test('precaches every script loaded by index.html', async ({ request }) => {
    const staticAssets = await getStaticAssets(request);
    const html = await (await request.get('/index.html')).text();
    const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m => m[1]);

    expect(scripts.length).toBeGreaterThan(0);
    for (const src of scripts) {
      expect(staticAssets, `${src} is not precached`).toContain(src);
    }
  });
});
