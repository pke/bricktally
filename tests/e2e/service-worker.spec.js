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

test.describe('Service Worker runtime', () => {
  test.use({ serviceWorkers: 'allow' });

  // The static test server has no clean URLs; serve /changelog like Vercel does
  async function routeCleanUrls(context) {
    await context.route(/\/changelog$/, route =>
      route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Changelog</title>' })
    );
  }

  // Wait for the first worker of the registration to settle and report its state
  async function settledWorkerState(page) {
    return page.evaluate(async () => {
      const settled = state => state === 'activated' || state === 'redundant';
      let worker;
      while (!worker) {
        const reg = await navigator.serviceWorker.getRegistration();
        worker = reg && (reg.installing || reg.waiting || reg.active);
        if (!worker) await new Promise(resolve => setTimeout(resolve, 20));
      }
      if (settled(worker.state)) return worker.state;
      return new Promise(resolve => {
        worker.addEventListener('statechange', () => {
          if (settled(worker.state)) resolve(worker.state);
        });
      });
    });
  }

  test('does not activate when precaching fails', async ({ page, context }) => {
    await routeCleanUrls(context);
    await context.route('**/js/pako.min.js', (route, request) =>
      // Fail only the service worker's precache request, not the page's script
      request.serviceWorker() ? route.fulfill({ status: 500, body: '' }) : route.fallback()
    );

    await page.goto('/');
    expect(await settledWorkerState(page)).toBe('redundant');
  });

  test('caches Rebrickable CDN images for offline use', async ({ page, context }) => {
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
    await routeCleanUrls(context);
    await context.route('https://cdn.rebrickable.com/**', route =>
      route.fulfill({ status: 200, contentType: 'image/png', body: png })
    );

    await page.goto('/');
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
    await page.reload(); // make sure the page is controlled
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);

    const imageUrl = 'https://cdn.rebrickable.com/media/parts/elements/300121.jpg';
    await page.evaluate(url => new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = resolve;
      img.onerror = () => reject(new Error('image failed to load'));
      img.src = url;
    }), imageUrl);

    await expect.poll(() => page.evaluate(async url => {
      const name = (await caches.keys()).find(key => key.startsWith('bricktally-images-'));
      if (!name) return false;
      const cache = await caches.open(name);
      return !!(await cache.match(url));
    }, imageUrl)).toBe(true);
  });
});
