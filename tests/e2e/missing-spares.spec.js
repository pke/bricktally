import { test, expect } from '@playwright/test';
import { mockSets } from '../fixtures/mock-sets.js';
import { mockAPIForSet, loadTestSet, clearLocalStorage } from '../helpers/test-utils.js';

test.describe('Category 21: Missing Spare Parts Hint', () => {

  test('21.1: Hint with mailto link shows for a set without spare parts', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-001']); // no spares

    await page.goto('/');
    await clearLocalStorage(page);
    await loadTestSet(page, '99001');

    const hint = page.locator('#missingSparesHint');
    await expect(hint).toBeVisible();

    const href = await page.locator('#missingSparesLink').getAttribute('href');
    expect(href).toContain('mailto:bricktally@dudesoft.app');
    expect(href).toContain(encodeURIComponent('Set 99001-1: missing spare parts'));
  });

  test('21.2: Hint is hidden for a set that has spare parts', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-003']); // has spares

    await page.goto('/');
    await clearLocalStorage(page);
    await loadTestSet(page, '99003');

    await expect(page.locator('#sparePartsSection')).toBeVisible();
    await expect(page.locator('#missingSparesHint')).toBeHidden();
  });

  test('21.3: Hint is hidden again when returning to set history', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-001']);

    await page.goto('/');
    await clearLocalStorage(page);
    await loadTestSet(page, '99001');

    await expect(page.locator('#missingSparesHint')).toBeVisible();

    // Navigate back to the set history via the app name
    await page.click('h1 a');
    await expect(page.locator('#missingSparesHint')).toBeHidden();
  });
});
