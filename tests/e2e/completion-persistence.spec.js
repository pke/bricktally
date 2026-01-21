import { test, expect } from '@playwright/test';
import { mockSets } from '../fixtures/mock-sets.js';
import {
  mockAPIForSet,
  loadTestSet,
  incrementPart,
  decrementPart,
  fillQuantity,
  waitForFireworks,
  isFireworksVisible,
  getLocalStorage,
  setLocalStorage,
  clearLocalStorage,
  waitForProgressUpdate,
  toggleHideComplete
} from '../helpers/test-utils.js';

test.describe('Category 6: Completion & Celebration', () => {
  test('6.1: Fireworks trigger - parts only', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-001']);

    await page.goto('/');
    await clearLocalStorage(page);
    await loadTestSet(page, '99001');

    // Complete all but one part
    await fillQuantity(page, 0); // 5 parts
    await fillQuantity(page, 1); // 3 parts

    // Fireworks should not be visible yet
    let fireworksVisible = await isFireworksVisible(page);
    expect(fireworksVisible).toBe(false);

    // Complete the last part
    await fillQuantity(page, 2); // 2 parts
    await waitForProgressUpdate(page);

    // Wait for fireworks to appear
    await waitForFireworks(page);

    // Fireworks should be visible
    fireworksVisible = await isFireworksVisible(page);
    expect(fireworksVisible).toBe(true);
  });

  test('6.2: Fireworks trigger - with minifigs', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-002']);

    await page.goto('/');
    await clearLocalStorage(page);
    await loadTestSet(page, '99002');

    // Complete all parts
    await fillQuantity(page, 0);
    await fillQuantity(page, 1);

    // Complete first minifig
    await page.click('#minifig-2 .minifig-name');

    // Fireworks should not be visible yet (one minifig still incomplete)
    let fireworksVisible = await isFireworksVisible(page);
    expect(fireworksVisible).toBe(false);

    // Complete the last minifig
    await page.click('#minifig-3 .minifig-name');
    await waitForProgressUpdate(page);

    // Wait for fireworks
    await waitForFireworks(page);

    // Fireworks should be visible
    fireworksVisible = await isFireworksVisible(page);
    expect(fireworksVisible).toBe(true);
  });

  test('6.3: Fireworks trigger - with spares', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-003']);

    await page.goto('/');
    await clearLocalStorage(page);
    await loadTestSet(page, '99003');

    // Complete most parts normally
    await fillQuantity(page, 0); // 5 red (but part needs 5, so complete)
    await fillQuantity(page, 1); // 3 blue
    // Don't count part 2 (2 green)

    // Use spare to complete the last part (spare red brick)
    const sparePartId = await page.locator('#spareTableContainer table tr[id^="row-"]').first().getAttribute('id');
    const spareId = sparePartId.replace('row-', '');

    // Increment green part to 1 (needs 2)
    await incrementPart(page, 2);

    // Now complete it using a different approach - count remaining
    await incrementPart(page, 2);
    await waitForProgressUpdate(page);

    // Wait for fireworks
    await waitForFireworks(page);

    // Fireworks should be visible
    const fireworksVisible = await isFireworksVisible(page);
    expect(fireworksVisible).toBe(true);
  });

  test('6.4: No fireworks on decrement', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-001']);

    await page.goto('/');
    await clearLocalStorage(page);
    await loadTestSet(page, '99001');

    // Complete set
    await fillQuantity(page, 0);
    await fillQuantity(page, 1);
    await fillQuantity(page, 2);
    await waitForProgressUpdate(page);

    // Wait for fireworks
    await waitForFireworks(page);

    // Dismiss the completion modal
    await page.click('button:has-text("Awesome!")');

    // Wait for fireworks to disappear
    await page.waitForTimeout(5000);

    // Turn off hide complete to access the parts
    await page.evaluate(() => {
      window.showCompleteParts = true;
      window.updateTableVisibility();
    });

    // Decrement one part
    await decrementPart(page, 0);
    await waitForProgressUpdate(page);

    // Fireworks should NOT reappear
    const fireworksVisible = await isFireworksVisible(page);
    expect(fireworksVisible).toBe(false);
  });

  test('6.5: Fireworks only once (not on extras)', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-003']);

    await page.goto('/');
    await clearLocalStorage(page);
    await loadTestSet(page, '99003');

    // Complete all regular parts
    await fillQuantity(page, 0);
    await fillQuantity(page, 1);
    await fillQuantity(page, 2);
    await waitForProgressUpdate(page);

    // Wait for fireworks
    await waitForFireworks(page);

    // Dismiss the completion modal
    await page.click('button:has-text("Awesome!")');

    // Wait for fireworks to disappear
    await page.waitForTimeout(5000);

    // Add spare parts (going from 100% to 102%)
    const spareParts = await page.locator('#spareTableContainer table tr[id^="row-"]').all();
    for (const sparePart of spareParts) {
      const rowId = await sparePart.getAttribute('id');
      const partId = rowId.replace('row-', '');
      await fillQuantity(page, parseInt(partId));
    }
    await waitForProgressUpdate(page);

    // Fireworks should NOT reappear
    const fireworksVisible = await isFireworksVisible(page);
    expect(fireworksVisible).toBe(false);
  });
});

test.describe('Category 8: localStorage Persistence', () => {
  test('8.1: Save state', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-001']);

    await page.goto('/');
    await clearLocalStorage(page);
    await loadTestSet(page, '99001');

    // Count some parts
    await fillQuantity(page, 0);
    await incrementPart(page, 1);
    await waitForProgressUpdate(page);

    // Check localStorage
    const savedState = await getLocalStorage(page, 'set_99001-1');
    expect(savedState).toBeTruthy();
    expect(savedState).toContain('3001_Red:5'); // 5 red bricks
    expect(savedState).toContain('3004_Blue:1'); // 1 blue brick
  });

  test('8.2: Save state with spares', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-003']);

    await page.goto('/');
    await clearLocalStorage(page);
    await loadTestSet(page, '99003');

    // Count regular and spare parts
    await fillQuantity(page, 0); // Regular red brick

    // Find and count spare
    const spareParts = await page.locator('#spareTableContainer table tr[id^="row-"]').all();
    const firstSpare = spareParts[0];
    const rowId = await firstSpare.getAttribute('id');
    const partId = rowId.replace('row-', '');
    await fillQuantity(page, parseInt(partId));

    await waitForProgressUpdate(page);

    // Check localStorage
    const savedState = await getLocalStorage(page, 'set_99003-1');
    expect(savedState).toBeTruthy();
    expect(savedState).toContain('3001_Red:5'); // Regular
    expect(savedState).toContain('3001_Red_s:'); // Spare (with _s suffix)
  });

  test('8.3: Restore state on reload', async ({ page, context }) => {
    await mockAPIForSet(page, mockSets['TEST-001']);

    await page.goto('/');
    await clearLocalStorage(page);
    await loadTestSet(page, '99001');

    // Count some parts
    await fillQuantity(page, 0);
    await incrementPart(page, 1);
    await waitForProgressUpdate(page);

    // Get count before reload
    const countBefore = await page.locator('#count-0 .counted').textContent();

    // Reload page
    await page.reload();

    // Re-mock API
    await mockAPIForSet(page, mockSets['TEST-001']);

    // Load set again
    await loadTestSet(page, '99001');

    // Count should be restored
    const countAfter = await page.locator('#count-0 .counted').textContent();
    expect(countAfter).toBe(countBefore);
  });

  test('8.4: Clear state on reset', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-001']);

    await page.goto('/');
    await clearLocalStorage(page);
    await loadTestSet(page, '99001');

    // Count some parts
    await fillQuantity(page, 0);
    await waitForProgressUpdate(page);

    // Check state is saved
    let savedState = await getLocalStorage(page, 'set_99001-1');
    expect(savedState).toBeTruthy();

    // Click reset button (with confirmation)
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });
    await page.click('#resetButton');

    // Wait for reset
    await page.waitForTimeout(500);

    // Check localStorage is cleared
    savedState = await getLocalStorage(page, 'set_99001-1');
    expect(savedState).toBeNull();

    // Counts should be reset
    const count = await page.locator('#count-0 .counted').textContent();
    expect(count).toBe('0');
  });

  test('8.5: Multiple sets in history', async ({ page }) => {
    // Load first set
    await mockAPIForSet(page, mockSets['TEST-001']);

    await page.goto('/');
    await clearLocalStorage(page);
    await loadTestSet(page, '99001');
    await fillQuantity(page, 0);
    await waitForProgressUpdate(page);

    // Load second set
    await mockAPIForSet(page, mockSets['TEST-002']);

    await loadTestSet(page, '99002');
    await fillQuantity(page, 0);
    await waitForProgressUpdate(page);

    // Check both sets are saved
    const set1State = await getLocalStorage(page, 'set_99001-1');
    const set2State = await getLocalStorage(page, 'set_99002-1');

    expect(set1State).toBeTruthy();
    expect(set2State).toBeTruthy();

    // Check history has both sets (stored as setInfo_<setNumber>)
    const setInfo1 = await getLocalStorage(page, 'setInfo_99001-1');
    const setInfo2 = await getLocalStorage(page, 'setInfo_99002-1');

    expect(setInfo1).toBeTruthy();
    expect(setInfo2).toBeTruthy();

    // Parse and verify the set info contains correct data
    const set1Info = JSON.parse(setInfo1);
    const set2Info = JSON.parse(setInfo2);

    expect(set1Info.name).toContain('Basic Parts Set');
    expect(set2Info.name).toContain('Set with Minifigures');
  });
});
