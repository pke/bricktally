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

});
