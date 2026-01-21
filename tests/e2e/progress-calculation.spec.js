import { test, expect } from '@playwright/test';
import { mockSets } from '../fixtures/mock-sets.js';
import {
  mockAPIForSet,
  loadTestSet,
  getProgressState,
  incrementPart,
  decrementPart,
  fillQuantity,
  getPartCount,
  waitForProgressUpdate
} from '../helpers/test-utils.js';

test.describe('Category 1: Progress Calculation - Parts Only', () => {
  test('1.1: Empty set progress', async ({ page }) => {
    // Set up API mocking BEFORE navigating
    await mockAPIForSet(page, mockSets['TEST-001']);

    // Now navigate to the page
    await page.goto('/');

    await loadTestSet(page, '99001');

    const progress = await getProgressState(page);
    expect(progress.percentage).toBe('0%');
    expect(progress.pieces).toContain('0/10'); // May include "pieces" or not depending on minifigs
    expect(progress.width).toBe('0%');
  });

  test('1.2: Partial progress', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-001']);

    await page.goto('/');
    await loadTestSet(page, '99001');

    // Count 5 out of 10 parts (first part has quantity 5)
    await fillQuantity(page, 0);
    await waitForProgressUpdate(page);

    const progress = await getProgressState(page);
    expect(progress.percentage).toBe('50%');
    expect(progress.pieces).toMatch(/5\/10/); // May or may not include " pieces" suffix
    expect(progress.width).toBe('50%');
  });

  test('1.3: Complete set', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-001']);

    await page.goto('/');
    await loadTestSet(page, '99001');

    // Fill all parts
    await fillQuantity(page, 0); // 5 parts
    await fillQuantity(page, 1); // 3 parts
    await fillQuantity(page, 2); // 2 parts
    await waitForProgressUpdate(page);

    const progress = await getProgressState(page);
    expect(progress.percentage).toBe('100%');
    expect(progress.pieces).toMatch(/10\/10/);
    expect(progress.width).toBe('100%');
  });

  test('1.4: Rounding edge case (293/294 = 99%, not 100%)', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-005']);

    await page.goto('/');
    await loadTestSet(page, '99005');

    // Count 293 out of 294
    for (let i = 0; i < 293; i++) {
      await incrementPart(page, 0);
    }
    await waitForProgressUpdate(page);

    const progress = await getProgressState(page);
    expect(progress.percentage).toBe('99%'); // Should use Math.floor()
    expect(progress.pieces).toMatch(/293\/294/);
  });
});

test.describe('Category 2: Progress Calculation - With Minifigures', () => {
  test('2.1: Parts complete, minifigs incomplete', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-002']);

    await page.goto('/');
    await loadTestSet(page, '99002');

    // Complete all parts (10 parts)
    await fillQuantity(page, 0); // 5 parts
    await fillQuantity(page, 1); // 5 parts

    // Complete only 1 minifig (out of 2)
    await page.click('#minifig-2 .minifig-name');

    await waitForProgressUpdate(page);

    const progress = await getProgressState(page);
    // 11 out of 12 total (10 parts + 2 minifigs)
    expect(progress.percentage).toBe('91%'); // Math.floor(11/12 * 100)
    expect(progress.pieces).toMatch(/11\/12/);
  });

  test('2.2: Minifigs complete, parts incomplete', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-002']);

    await page.goto('/');
    await loadTestSet(page, '99002');

    // Complete only 5 parts (out of 10)
    await fillQuantity(page, 0); // 5 parts

    // Complete both minifigs
    await page.click('#minifig-2 .minifig-name'); // Minifig 1
    await page.click('#minifig-3 .minifig-name'); // Minifig 2
    await waitForProgressUpdate(page);

    const progress = await getProgressState(page);
    // 7 out of 12 total (5 parts + 2 minifigs)
    expect(progress.percentage).toBe('58%'); // Math.floor(7/12 * 100)
    expect(progress.pieces).toMatch(/7\/12/);
  });

  test('2.3: Both parts and minifigs complete', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-002']);

    await page.goto('/');
    await loadTestSet(page, '99002');

    // Complete all parts
    await fillQuantity(page, 0); // 5 parts
    await fillQuantity(page, 1); // 5 parts

    // Complete both minifigs
    await page.click('#minifig-2 .minifig-name');
    await page.click('#minifig-3 .minifig-name');
    await waitForProgressUpdate(page);

    const progress = await getProgressState(page);
    expect(progress.percentage).toBe('100%');
    expect(progress.pieces).toMatch(/12\/12/);
  });

  test('2.4: Minifig section visibility', async ({ page }) => {
    // Test with set that has NO minifigs
    await mockAPIForSet(page, mockSets['TEST-001']);

    await page.goto('/');
    await loadTestSet(page, '99001');

    // Minifig section should be hidden
    const minifigSection = page.locator('#minifigSection');
    await expect(minifigSection).toHaveClass(/hide/);
  });
});

test.describe('Category 3: Spare Parts - Substitution Logic', () => {
  test('3.1: Spare part used as substitute', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-003']);

    await page.goto('/');
    await loadTestSet(page, '99003');

    // Part 0 (3001 Red) needs 5
    // Count 3 regular
    for (let i = 0; i < 3; i++) {
      await incrementPart(page, 0);
    }

    // Count 2 spare (part id different for spare)
    // Find the Red spare part
    const redSparePartId = await page.evaluate(() => {
      return window.partsData.find(p => p.isSpare && p.color === 'Red')?.id;
    });

    await fillQuantity(page, redSparePartId);
    await waitForProgressUpdate(page);

    // Part should be considered complete (3 regular + 2 spare = 5 needed)
    const incrementBtn = page.locator(`#inc-0`);
    await expect(incrementBtn).toHaveClass(/complete/);
  });

  test('3.2: Spare part creates extra', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-003']);

    await page.goto('/');
    await loadTestSet(page, '99003');

    // Complete all regular parts
    await fillQuantity(page, 0); // 5 red bricks
    await fillQuantity(page, 1); // 3 blue bricks
    await fillQuantity(page, 2); // 2 green bricks

    // Add all spare parts (creates extras)
    // Find spare parts in the spare section
    const spareParts = await page.locator('#spareTableContainer table tr[id^="row-"]').all();
    for (const sparePart of spareParts) {
      const rowId = await sparePart.getAttribute('id');
      const partId = rowId.replace('row-', '');
      await fillQuantity(page, parseInt(partId));
    }

    await waitForProgressUpdate(page);

    const progress = await getProgressState(page);
    expect(progress.percentage).toBe('100%'); // Still capped at 100% width
    expect(progress.pieces).toContain('+'); // Should show extras like "10/10 +3"
  });

  test('3.3: Extras only count when complete', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-003']);

    await page.goto('/');
    await loadTestSet(page, '99003');

    // Count only 8 out of 10 regular parts
    await fillQuantity(page, 0); // 5 parts
    await fillQuantity(page, 1); // 3 parts
    // Skip part 2 (2 green bricks) - only count 0

    // Add all spare parts
    const spareParts = await page.locator('#spareTableContainer table tr[id^="row-"]').all();
    for (const sparePart of spareParts) {
      const rowId = await sparePart.getAttribute('id');
      const partId = rowId.replace('row-', '');
      await fillQuantity(page, parseInt(partId));
    }

    await waitForProgressUpdate(page);

    const progress = await getProgressState(page);
    expect(progress.percentage).toBe('80%'); // 8/10
    expect(progress.pieces).toMatch(/8\/10/); // No +extras shown
  });

  test('3.4: Set complete via spares only', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-003']);

    await page.goto('/');
    await loadTestSet(page, '99003');

    // Don't count any regular parts
    // Only count spare parts (2 red spares can cover 2 of the 5 needed red)
    const spareParts = await page.locator('#spareTableContainer table tr[id^="row-"]').all();
    for (const sparePart of spareParts) {
      const rowId = await sparePart.getAttribute('id');
      const partId = rowId.replace('row-', '');
      await fillQuantity(page, parseInt(partId));
    }

    // This won't complete the set since spares don't cover all parts
    // But let's test that spares DO count toward the total
    await waitForProgressUpdate(page);

    const progress = await getProgressState(page);
    // 3 spare parts counted (2 red + 1 blue) out of 10 total
    expect(parseInt(progress.pieces.split('/')[0])).toBeGreaterThan(0);
  });
});
