import { test, expect } from '@playwright/test';

test.describe('Category 18: Internationalization', () => {

  test('18.1: Default page is English', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('#landingContent h2')).toContainText('Verify Your LEGO Sets Are Complete');
  });

  test('18.2: Language switcher navigates to locale', async ({ page }) => {
    await page.goto('/');
    // Switch to German
    await page.selectOption('#languageSelect', 'de');
    await page.waitForURL(/\/de(\/|$)/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'de');
  });

  // Requires built locale pages (node scripts/build-i18n.js) — skip in dev mode
  test.skip('18.3: Direct locale URL serves translated page', async ({ page }) => {
    await page.goto('/de/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'de');
    await expect(page.locator('#languageSelect')).toHaveValue('de');
  });

  test('18.4: Locale preference persists via localStorage', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('locale', 'fr'));
    await page.goto('/');
    // Should redirect to /fr/
    await page.waitForURL(/\/fr(\/|$)/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  });

  test('18.6: Language picker has a visible themed border', async ({ page }) => {
    await page.goto('/');
    const border = await page.locator('#languageSelect').evaluate(el => {
      const cs = getComputedStyle(el);
      const token = getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim();
      const probe = document.createElement('div');
      probe.style.color = token;
      document.body.appendChild(probe);
      const expected = getComputedStyle(probe).color;
      probe.remove();
      return { width: cs.borderTopWidth, style: cs.borderTopStyle, color: cs.borderTopColor, expected };
    });
    expect(border.width).toBe('1px');
    expect(border.style).toBe('solid');
    expect(border.color).toBe(border.expected);
  });

  test('18.5: Locale redirect keeps the deep-link query string', async ({ page }) => {
    // Serve a stub for the locale page so this works without the Vercel locale routes
    await page.route('**/de/**', route => route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<!doctype html><html lang="de"><body>de</body></html>'
    }));
    await page.addInitScript(() => localStorage.setItem('locale', 'de'));

    await page.goto('/?set=10294-1#top');

    await page.waitForURL(/\/de\//);
    const url = new URL(page.url());
    expect(url.pathname).toBe('/de/');
    expect(url.search).toBe('?set=10294-1');
    expect(url.hash).toBe('#top');
  });

});
