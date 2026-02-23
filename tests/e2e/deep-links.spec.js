import { test, expect } from '@playwright/test';
import { mockSets } from '../fixtures/mock-sets.js';
import { mockAPIForSet, setLocalStorage } from '../helpers/test-utils.js';

test.describe('Category 17: Deep Links', () => {
  test('17.1: ?set= parameter loads the specified set', async ({ page }) => {
    const mockSet = mockSets['TEST-001'];
    await mockAPIForSet(page, mockSet);

    await page.goto('/?set=99001');

    await expect(page.locator('#setInfo')).not.toHaveClass(/hide/, { timeout: 10000 });
    await expect(page.locator('#setName')).toContainText(mockSet.setName);
  });

  test('17.2: ?set= parameter takes priority over localStorage', async ({ page }) => {
    const mockSet1 = mockSets['TEST-001'];
    const mockSet2 = mockSets['TEST-002'];

    // Set up mocks for both sets
    await page.route('**/api/rebrickable**', async (route) => {
      // Delegate to mockSet1's routes (the deep link target)
      await route.continue();
    });
    await mockAPIForSet(page, mockSet1);

    // Pre-set localStorage to a different set
    await page.goto('/');
    await setLocalStorage(page, 'currentSetNumber', '99002-1');

    // Navigate with deep link — should load set 99001, not 99002
    await page.goto('/?set=99001');

    await expect(page.locator('#setInfo')).not.toHaveClass(/hide/, { timeout: 10000 });
    await expect(page.locator('#setName')).toContainText(mockSet1.setName);
  });

  test('17.3: No ?set= parameter falls back to localStorage', async ({ page }) => {
    const mockSet = mockSets['TEST-001'];
    await mockAPIForSet(page, mockSet);

    // Pre-set localStorage
    await page.goto('/');
    await setLocalStorage(page, 'currentSetNumber', '99001-1');

    // Navigate without deep link
    await page.goto('/');

    await expect(page.locator('#setInfo')).not.toHaveClass(/hide/, { timeout: 10000 });
    await expect(page.locator('#setName')).toContainText(mockSet.setName);
  });

  test('17.4: No ?set= and no localStorage shows set history', async ({ page }) => {
    await page.goto('/');

    // Should show history screen, not set info
    await expect(page.locator('#setInfo')).toHaveClass(/hide/);
    await expect(page.locator('text=No sets worked on yet')).toBeVisible();
  });

  test('17.5: ?set= parameter populates the input field', async ({ page }) => {
    const mockSet = mockSets['TEST-001'];
    await mockAPIForSet(page, mockSet);

    await page.goto('/?set=99001');

    await expect(page.locator('#setNumber')).toHaveValue('99001');
  });
});
