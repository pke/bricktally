import { test, expect } from '@playwright/test';
import { mockSets } from '../fixtures/mock-sets.js';
import {
  mockAPIForSet,
  loadTestSet,
  fillQuantity,
  incrementPart,
  getLocalStorage,
  clearLocalStorage,
  waitForProgressUpdate,
  getPartCount
} from '../helpers/test-utils.js';

test.describe('Category CP: Compressed Progress Storage', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
  });

  test('CP.1: Save progress stores compressed format (no colon)', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-001']);
    await loadTestSet(page, '99001');

    // Count some parts
    await fillQuantity(page, 0); // 5 red bricks
    await incrementPart(page, 1); // 1 blue brick
    await waitForProgressUpdate(page);

    // Check localStorage - progress should be compressed (no colon)
    const raw = await getLocalStorage(page, 'set_99001-1');
    expect(raw).toBeTruthy();
    const data = JSON.parse(raw);
    expect(data.progress).toBeTruthy();
    expect(data.progress).not.toContain(':'); // Not old plain format
  });

  test('CP.2: Round-trip — save, reload, counts restored', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-001']);
    await loadTestSet(page, '99001');

    // Count parts
    await fillQuantity(page, 0); // 5 red bricks
    await incrementPart(page, 1); // 1 blue brick
    await waitForProgressUpdate(page);

    // Reload
    await page.reload();
    await mockAPIForSet(page, mockSets['TEST-001']);
    await loadTestSet(page, '99001');

    // Verify counts restored
    const redCount = await getPartCount(page, 0);
    const blueCount = await getPartCount(page, 1);
    const greenCount = await getPartCount(page, 2);
    expect(redCount).toBe(5);
    expect(blueCount).toBe(1);
    expect(greenCount).toBe(0);
  });

  test('CP.3: Flipped mode — high completion stores less data than low', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-001']);
    await loadTestSet(page, '99001');

    // Count 1 part (low completion)
    await incrementPart(page, 0);
    await waitForProgressUpdate(page);

    const rawLow = await getLocalStorage(page, 'set_99001-1');
    const progressLow = JSON.parse(rawLow).progress;

    // Complete all parts (high completion — flipped mode stores remaining = empty)
    await fillQuantity(page, 0);
    await fillQuantity(page, 1);
    await fillQuantity(page, 2);
    await waitForProgressUpdate(page);

    const rawHigh = await getLocalStorage(page, 'set_99001-1');
    const progressHigh = JSON.parse(rawHigh).progress;

    // 100% complete should be smaller than partial
    expect(progressHigh.length).toBeLessThan(progressLow.length);
  });

  test('CP.4: 100% complete — progress is non-empty', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-001']);
    await loadTestSet(page, '99001');

    // Complete all
    await fillQuantity(page, 0);
    await fillQuantity(page, 1);
    await fillQuantity(page, 2);
    await waitForProgressUpdate(page);

    const raw = await getLocalStorage(page, 'set_99001-1');
    const data = JSON.parse(raw);
    expect(data.progress).toBeTruthy(); // Must not be empty — distinguishes from 0%
    expect(data.progress).not.toContain(':');

    // Reload and verify counts fully restored
    await page.reload();
    await mockAPIForSet(page, mockSets['TEST-001']);
    await loadTestSet(page, '99001');

    expect(await getPartCount(page, 0)).toBe(5);
    expect(await getPartCount(page, 1)).toBe(3);
    expect(await getPartCount(page, 2)).toBe(2);
  });

  test('CP.5: 0% complete (reset) — progress is empty string', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-001']);
    await loadTestSet(page, '99001');

    // Count then reset
    await fillQuantity(page, 0);
    await waitForProgressUpdate(page);

    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });
    await page.click('#resetButton');
    await page.waitForTimeout(500);

    const raw = await getLocalStorage(page, 'set_99001-1');
    const data = JSON.parse(raw);
    expect(data.progress).toBe('');
  });

  test('CP.6: Spare parts preserved in compressed format', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-003']);
    await loadTestSet(page, '99003');

    // Count regular part
    await fillQuantity(page, 0); // 5 red regular bricks

    // Count spare part
    const spareParts = await page.locator('#spareTableContainer table tr[id^="row-"]').all();
    const firstSpare = spareParts[0];
    const rowId = await firstSpare.getAttribute('id');
    const partId = rowId.replace('row-', '');
    await fillQuantity(page, parseInt(partId));
    await waitForProgressUpdate(page);

    // Reload and verify both regular and spare counts
    await page.reload();
    await mockAPIForSet(page, mockSets['TEST-003']);
    await loadTestSet(page, '99003');

    // Regular red brick should be 5
    expect(await getPartCount(page, 0)).toBe(5);
    // Spare should also be restored
    const spareCount = await getPartCount(page, parseInt(partId));
    expect(spareCount).toBeGreaterThan(0);
  });

  test('CP.7: Minifigs preserved in compressed format', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-002']);
    await loadTestSet(page, '99002');

    // Count a part and a minifig
    await fillQuantity(page, 0); // 5 red bricks
    await page.click('#minifig-2 .minifig-name'); // Complete first minifig
    await waitForProgressUpdate(page);

    // Verify compressed format
    const raw = await getLocalStorage(page, 'set_99002-1');
    const data = JSON.parse(raw);
    expect(data.progress).not.toContain(':');

    // Reload and verify
    await page.reload();
    await mockAPIForSet(page, mockSets['TEST-002']);
    await loadTestSet(page, '99002');

    expect(await getPartCount(page, 0)).toBe(5);
    // Check minifig is still complete
    const minifigComplete = await page.locator('#minifig-2').evaluate(
      el => el.classList.contains('complete')
    );
    expect(minifigComplete).toBe(true);
  });

  test('CP.8: Old plain format in localStorage loads correctly', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-001']);

    // Seed old plain format progress directly
    await page.evaluate(() => {
      localStorage.setItem('set_99001-1', JSON.stringify({
        number: '99001',
        fullNumber: '99001-1',
        name: 'Basic Parts Set',
        year: 2024,
        numParts: 10,
        imageUrl: '/assets/favicon.svg',
        lastAccessed: Date.now(),
        progress: '3001_Red:5,3004_Blue:1'
      }));
    });

    await loadTestSet(page, '99001');

    // Counts should be restored from old format
    expect(await getPartCount(page, 0)).toBe(5);
    expect(await getPartCount(page, 1)).toBe(1);
    expect(await getPartCount(page, 2)).toBe(0);
  });

  test('CP.9: Migration — old plain format converted to compressed on save', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-001']);

    // Seed old plain format
    await page.evaluate(() => {
      localStorage.setItem('set_99001-1', JSON.stringify({
        number: '99001',
        fullNumber: '99001-1',
        name: 'Basic Parts Set',
        year: 2024,
        numParts: 10,
        imageUrl: '/assets/favicon.svg',
        lastAccessed: Date.now(),
        progress: '3001_Red:5,3004_Blue:1'
      }));
    });

    await loadTestSet(page, '99001');

    // Increment to trigger save
    await incrementPart(page, 1); // blue goes from 1 to 2
    await waitForProgressUpdate(page);

    // Progress should now be compressed
    const raw = await getLocalStorage(page, 'set_99001-1');
    const data = JSON.parse(raw);
    expect(data.progress).not.toContain(':'); // No longer plain format

    // Verify counts are correct
    expect(await getPartCount(page, 0)).toBe(5);
    expect(await getPartCount(page, 1)).toBe(2);
  });
});
