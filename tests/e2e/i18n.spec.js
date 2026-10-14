import { test, expect } from '@playwright/test';
import { mockSets } from '../fixtures/mock-sets.js';
import { mockAPIForSet, mockAPIForSetWithVersions, loadTestSet, fillQuantity, clearLocalStorage } from '../helpers/test-utils.js';

// Switch the running app to German. Works whether the page has translations
// embedded at build time (vercel dev, production) or fetches them (static server).
async function switchToGerman(page) {
  await page.evaluate(async () => {
    const de = await (await fetch('/locales/de.json')).json();
    i18next.addResourceBundle('de', 'translation', de);
    await i18next.changeLanguage('de');
  });
}

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

  test('18.7: Section headers stay translated after loading and completing a set', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-004']); // parts, spares and a minifig
    await page.goto('/');
    await switchToGerman(page);
    await loadTestSet(page, '99004');

    await expect(page.locator('#partsHeader')).toHaveText('Teile');
    await expect(page.locator('#sparePartsHeader')).toHaveText('Ersatzteile');
    await expect(page.locator('#minifigHeader')).toHaveText('Minifiguren');

    // Completing the regular parts switches to the "done" header variant
    await fillQuantity(page, 0);
    await fillQuantity(page, 1);
    await expect(page.locator('#partsHeader')).toContainText('Teile');
    await expect(page.locator('#partsHeader')).not.toContainText('Parts');
  });

  test('18.8: Version picker details are translated', async ({ page }) => {
    await mockAPIForSetWithVersions(page, mockSets['TEST-008'], mockSets['TEST-008-ALT']);
    await page.goto('/');
    await switchToGerman(page);
    await page.locator('#setNumber').evaluate(el => { el.type = 'text'; });
    await page.locator('#setNumber').fill('99008');
    await page.locator('#setNumber').press('Enter');

    const firstVersion = page.locator('.version-select-btn').first();
    await expect(firstVersion).toContainText('Set-Nummer:');
    await expect(firstVersion).toContainText('Jahr:');
    await expect(firstVersion).not.toContainText('Year:');
  });

  test('18.9: Restore preview of a new set is translated', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await page.reload();
    await switchToGerman(page);

    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      app: 'BrickTally/1.41.3',
      sets: [{
        fullNumber: '10294-1',
        info: { number: '10294', fullNumber: '10294-1', name: 'Titanic', year: 2021, numParts: 9090 },
        progress: '',
        lastWorkedOn: Date.now()
      }]
    };
    await page.locator('#restoreFileInput').setInputFiles({
      name: 'backup.bricktally',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(backup))
    });

    const item = page.locator('.restore-set-item');
    await expect(item).toContainText('Wiederherstellen: 0%');
    await expect(item).not.toContainText('complete');
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
