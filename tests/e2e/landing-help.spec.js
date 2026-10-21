import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/de/');
});

test('translated HTML replaces the complete introduction including its nested link', async ({ page }) => {
  const introduction = page.locator('#landingContent > p');
  await expect(introduction).toContainText('Rebrickable');
  await expect(introduction).not.toContainText('database');
  await expect(introduction.locator('a')).toHaveCount(1);
  await expect(introduction).toContainText('LEGO®');
  await expect(page.locator('[data-i18n="landing.featureBadge"]')).toHaveJSProperty('tagName', 'A');
  await expect(page.locator('[data-i18n="landing.featurePwa"]')).toHaveJSProperty('tagName', 'A');
});

test('badge examples use the real badge renderer without creating inventory data', async ({ page }) => {
  const before = await page.evaluate(() => JSON.stringify(localStorage));
  await page.locator('[data-i18n="landing.featureBadge"]').click();
  const dialog = page.locator('#badgeExamplesDialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('figure img')).toHaveCount(2);
  await expect(dialog.locator('figcaption')).toHaveText([
    'Vollständiges Set · 100 %', 'Unvollständiges Set · 2 Teile fehlen'
  ]);
  const images = await dialog.locator('img').evaluateAll(images => images.map(img => img.src));
  expect(images.every(src => src.startsWith('data:image/png;base64,'))).toBe(true);
  expect(images[0]).not.toBe(images[1]);
  await expect(dialog.locator('figure').first()).toHaveAttribute('data-set-number', '31109-1');
  await expect(dialog.locator('img').first()).toHaveAttribute('alt', /Pirate Ship \(31109-1\)/);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('[data-i18n="landing.featureBadge"]')).toBeFocused();
  expect(await page.evaluate(() => JSON.stringify(localStorage))).toBe(before);
});

test('installation offers manual instructions when no native prompt exists', async ({ page }) => {
  await page.locator('[data-i18n="landing.featurePwa"]').click();
  const dialog = page.locator('#installHelpDialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('#installNowButton')).toBeHidden();
  await dialog.locator('label').filter({ hasText: 'iPhone / iPad' }).click();
  await expect(dialog.getByRole('radio', { name: 'iPhone / iPad' })).toBeChecked();
  await expect(dialog.locator('.platform-icon')).toHaveCount(3);
  await expect(dialog.locator('.install-steps li')).toHaveCount(4);
  expect(await dialog.locator('.install-steps').evaluate(el => getComputedStyle(el).listStyleType)).toBe('decimal');
  await expect(dialog.locator('.install-steps')).toContainText('Safari');
  await expect(dialog.locator('.install-steps')).toContainText('Zum Home-Bildschirm');
  await dialog.locator('label').filter({ hasText: 'Android' }).click();
  await expect(dialog.locator('.install-steps')).toContainText('Chrome oder Edge');
  await expect(dialog.getByRole('button', { name: 'Schließen' })).toHaveCount(0);
  await page.mouse.click(5, 5);
  await expect(dialog).toHaveCount(0);
});

test('native installation is triggered only by a click and each prompt is used once', async ({ page }) => {
  await page.evaluate(() => {
    window.installCalls = 0;
    const event = new Event('beforeinstallprompt', { cancelable: true });
    event.prompt = async () => { window.installCalls++; };
    event.userChoice = Promise.resolve({ outcome: 'dismissed' });
    window.dispatchEvent(event);
  });
  expect(await page.evaluate(() => window.installCalls)).toBe(0);
  await page.locator('[data-i18n="landing.featurePwa"]').click();
  await page.locator('#installNowButton').click();
  expect(await page.evaluate(() => window.installCalls)).toBe(1);
  await expect(page.locator('#installNowButton')).toBeHidden();
  await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
  await expect(page.locator('#installHelpDialog [role="status"]')).toContainText('bereits installiert');
});

test('version metadata remains in the tooltip and clicking opens the changelog', async ({ page }) => {
  const version = page.locator('#versionInfo');
  await expect(version).toHaveAttribute('data-build-date', /^\d{4}-\d{2}-\d{2}$/);
  await expect(version).toHaveAttribute('data-commit', /^[a-f0-9]{7,40}$/);
  await expect(version).toHaveAttribute('title', /Build: \d{4}-\d{2}-\d{2} · Git: [a-f0-9]{7}/);
  await version.focus();
  await version.press('Enter');
  await page.waitForURL('**/changelog');
  await expect(page.locator('#buildInfoDialog')).toHaveCount(0);
});
