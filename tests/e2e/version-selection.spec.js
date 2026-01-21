import { test, expect } from '@playwright/test';
import { mockSets } from '../fixtures/mock-sets.js';
import {
  mockAPIForSet,
  mockAPIForSetWithVersions,
  loadTestSet
} from '../helpers/test-utils.js';

test.describe('Category 13: Version Selection', () => {
  test('13.1: Single version auto-loads', async ({ page }) => {
    const mockSet = mockSets['TEST-001'];
    await mockAPIForSet(page, mockSet);

    await page.goto('/');
    await loadTestSet(page, '99001');

    // Should load directly without version selector
    await expect(page.locator('#setInfo')).not.toHaveClass(/hide/);
    await expect(page.locator('text=Multiple Set Versions Found')).not.toBeVisible();
  });

  test('13.2: Multiple versions show dialog', async ({ page }) => {
    const mockSet1 = mockSets['TEST-008'];
    const mockSet2 = mockSets['TEST-008-ALT'];

    await mockAPIForSetWithVersions(page, mockSet1, mockSet2);

    await page.goto('/');

    // Fill input with base number
    await page.locator('#setNumber').fill('99008');
    await page.click('#loadButton');

    // Version selector should appear
    await expect(page.locator('text=Multiple Set Versions Found')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=This set has 2 versions')).toBeVisible();
  });

  test('13.3: Version selector shows both versions', async ({ page }) => {
    const mockSet1 = mockSets['TEST-008'];
    const mockSet2 = mockSets['TEST-008-ALT'];

    await mockAPIForSetWithVersions(page, mockSet1, mockSet2);

    await page.goto('/');
    await page.locator('#setNumber').fill('99008');
    await page.click('#loadButton');

    await expect(page.locator('h2:text("Multiple Set Versions Found")')).toBeVisible();

    // Check both versions are displayed in version buttons
    const versionButtons = page.locator('button[onclick*="selectVersion"]');
    await expect(versionButtons).toHaveCount(2);

    // Check first version details are shown
    await expect(page.locator('text=Set: 99008-1')).toBeVisible();
    await expect(page.locator('text=Year: 2024')).toBeVisible();

    // Check second version details are shown
    await expect(page.locator('text=Set: 99008-2')).toBeVisible();
    await expect(page.locator('text=Year: 2025')).toBeVisible();
  });

  test('13.4: Select version -1 loads correct data', async ({ page }) => {
    const mockSet1 = mockSets['TEST-008'];
    const mockSet2 = mockSets['TEST-008-ALT'];

    await mockAPIForSetWithVersions(page, mockSet1, mockSet2);

    await page.goto('/');
    await page.locator('#setNumber').fill('99008');
    await page.click('#loadButton');

    // Wait for dialog and click first version (99008-1)
    await expect(page.locator('h2:text("Multiple Set Versions Found")')).toBeVisible();
    await page.click('button[onclick*="selectVersion(\'99008-1\')"]');

    // Verify correct set loaded
    await expect(page.locator('#setInfo')).not.toHaveClass(/hide/);
    await expect(page.locator('#setName')).toContainText('Multi-Version Test Set');
    await expect(page.locator('#setDetails')).toContainText('Year: 2024');
    await expect(page.locator('#setDetails')).toContainText('Parts: 15');

    // Verify parts table is rendered with correct quantity (8+7=15 parts total from version 1)
    await expect(page.locator('#tableContainer')).toContainText('0/8');
    await expect(page.locator('#tableContainer')).toContainText('0/7');
  });

  test('13.5: Select version -2 loads correct data', async ({ page }) => {
    const mockSet1 = mockSets['TEST-008'];
    const mockSet2 = mockSets['TEST-008-ALT'];

    await mockAPIForSetWithVersions(page, mockSet1, mockSet2);

    await page.goto('/');
    await page.locator('#setNumber').fill('99008');
    await page.click('#loadButton');

    // Wait for dialog and click second version (99008-2)
    await expect(page.locator('h2:text("Multiple Set Versions Found")')).toBeVisible();
    await page.click('button[onclick*="selectVersion(\'99008-2\')"]');

    // Verify correct set loaded
    await expect(page.locator('#setInfo')).not.toHaveClass(/hide/);
    await expect(page.locator('#setName')).toContainText('Multi-Version Test Set (Alternate)');
    await expect(page.locator('#setDetails')).toContainText('Year: 2025');
    await expect(page.locator('#setDetails')).toContainText('Parts: 20');

    // Verify parts table is rendered with correct quantity (10+10=20 parts total from version 2)
    await expect(page.locator('#tableContainer')).toContainText('0/10');
  });

  test('13.6: Cancel version selection closes dialog', async ({ page }) => {
    const mockSet1 = mockSets['TEST-008'];
    const mockSet2 = mockSets['TEST-008-ALT'];

    await mockAPIForSetWithVersions(page, mockSet1, mockSet2);

    await page.goto('/');
    await page.locator('#setNumber').fill('99008');
    await page.click('#loadButton');

    await expect(page.locator('text=Multiple Set Versions Found')).toBeVisible();

    // Click cancel
    await page.click('button:has-text("Cancel")');

    // Dialog should close
    await expect(page.locator('text=Multiple Set Versions Found')).not.toBeVisible();

    // Set should not be loaded
    await expect(page.locator('#setInfo')).toHaveClass(/hide/);
  });

  test('13.7: Click outside dialog closes it', async ({ page }) => {
    const mockSet1 = mockSets['TEST-008'];
    const mockSet2 = mockSets['TEST-008-ALT'];

    await mockAPIForSetWithVersions(page, mockSet1, mockSet2);

    await page.goto('/');
    await page.locator('#setNumber').fill('99008');
    await page.click('#loadButton');

    await expect(page.locator('text=Multiple Set Versions Found')).toBeVisible();

    // Click on the modal background (not the content)
    const modal = page.locator('div[style*="position: fixed"]');
    await modal.click({ position: { x: 10, y: 10 } });

    // Dialog should close
    await expect(page.locator('text=Multiple Set Versions Found')).not.toBeVisible();
  });
});
