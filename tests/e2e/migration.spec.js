import { test, expect } from '@playwright/test';
import {
  getLocalStorage,
  setLocalStorage,
  clearLocalStorage
} from '../helpers/test-utils.js';

test.describe('Category M: localStorage Migration', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
  });

  test('M.1: Old-format setInfo_ + set_ migrated to consolidated set_ JSON on page load', async ({ page }) => {
    // Seed old-format data
    await page.evaluate(() => {
      localStorage.setItem('setInfo_99001-1', JSON.stringify({
        number: '99001',
        fullNumber: '99001-1',
        name: 'Test Set',
        year: 2024,
        numParts: 10,
        imageUrl: '/assets/favicon.svg',
        lastAccessed: 1700000000000
      }));
      localStorage.setItem('set_99001-1', '3001_Red:5,3004_Blue:3');
    });

    // Reload to trigger migration
    await page.reload();

    // Verify consolidated format
    const raw = await getLocalStorage(page, 'set_99001-1');
    expect(raw).not.toBeNull();
    const data = JSON.parse(raw);
    expect(data.number).toBe('99001');
    expect(data.fullNumber).toBe('99001-1');
    expect(data.name).toBe('Test Set');
    expect(data.year).toBe(2024);
    expect(data.numParts).toBe(10);
    expect(data.imageUrl).toBe('/assets/favicon.svg');
    expect(data.lastAccessed).toBe(1700000000000);
    expect(data.progress).toBe('3001_Red:5,3004_Blue:3');
  });

  test('M.2: Set with setInfo_ but no progress migrates correctly', async ({ page }) => {
    // Seed old-format with info only (no set_ key)
    await page.evaluate(() => {
      localStorage.setItem('setInfo_99001-1', JSON.stringify({
        number: '99001',
        fullNumber: '99001-1',
        name: 'Empty Set',
        year: 2024,
        numParts: 10,
        imageUrl: '/assets/favicon.svg',
        lastAccessed: 1700000000000
      }));
    });

    await page.reload();

    const raw = await getLocalStorage(page, 'set_99001-1');
    expect(raw).not.toBeNull();
    const data = JSON.parse(raw);
    expect(data.name).toBe('Empty Set');
    expect(data.progress).toBe('');
  });

  test('M.3: Migration removes old setInfo_ keys', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('setInfo_99001-1', JSON.stringify({
        number: '99001',
        fullNumber: '99001-1',
        name: 'Test Set',
        year: 2024,
        numParts: 10,
        imageUrl: '/assets/favicon.svg',
        lastAccessed: 1700000000000
      }));
      localStorage.setItem('set_99001-1', '3001_Red:5');
    });

    await page.reload();

    const oldKey = await getLocalStorage(page, 'setInfo_99001-1');
    expect(oldKey).toBeNull();
  });

  test('M.4: Migration is idempotent', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('setInfo_99001-1', JSON.stringify({
        number: '99001',
        fullNumber: '99001-1',
        name: 'Test Set',
        year: 2024,
        numParts: 10,
        imageUrl: '/assets/favicon.svg',
        lastAccessed: 1700000000000
      }));
      localStorage.setItem('set_99001-1', '3001_Red:5');
    });

    // First reload triggers migration
    await page.reload();

    const afterFirst = await getLocalStorage(page, 'set_99001-1');
    const data1 = JSON.parse(afterFirst);

    // Second reload should not corrupt data
    await page.reload();

    const afterSecond = await getLocalStorage(page, 'set_99001-1');
    const data2 = JSON.parse(afterSecond);

    expect(data2.name).toBe(data1.name);
    expect(data2.progress).toBe(data1.progress);
    expect(data2.fullNumber).toBe(data1.fullNumber);
  });

  test('M.5: Already-new-format data is not corrupted by migration', async ({ page }) => {
    // Write data in new consolidated format directly
    await page.evaluate(() => {
      localStorage.setItem('set_99001-1', JSON.stringify({
        number: '99001',
        fullNumber: '99001-1',
        name: 'New Format Set',
        year: 2024,
        numParts: 10,
        imageUrl: '/assets/favicon.svg',
        lastAccessed: 1700000000000,
        progress: '3001_Red:5'
      }));
    });

    await page.reload();

    const raw = await getLocalStorage(page, 'set_99001-1');
    const data = JSON.parse(raw);
    expect(data.name).toBe('New Format Set');
    expect(data.progress).toBe('3001_Red:5');
  });

  test('M.6: Multi-version sets migrate independently', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('setInfo_99008-1', JSON.stringify({
        number: '99008',
        fullNumber: '99008-1',
        name: 'Multi Set v1',
        year: 2024,
        numParts: 10,
        imageUrl: '/assets/favicon.svg',
        lastAccessed: 1700000000000
      }));
      localStorage.setItem('set_99008-1', '3001_Red:2');

      localStorage.setItem('setInfo_99008-2', JSON.stringify({
        number: '99008',
        fullNumber: '99008-2',
        name: 'Multi Set v2',
        year: 2024,
        numParts: 8,
        imageUrl: '/assets/favicon.svg',
        lastAccessed: 1700000001000
      }));
      localStorage.setItem('set_99008-2', '3004_Blue:1');
    });

    await page.reload();

    // Both versions should be migrated independently
    const raw1 = await getLocalStorage(page, 'set_99008-1');
    const data1 = JSON.parse(raw1);
    expect(data1.name).toBe('Multi Set v1');
    expect(data1.progress).toBe('3001_Red:2');
    expect(data1.numParts).toBe(10);

    const raw2 = await getLocalStorage(page, 'set_99008-2');
    const data2 = JSON.parse(raw2);
    expect(data2.name).toBe('Multi Set v2');
    expect(data2.progress).toBe('3004_Blue:1');
    expect(data2.numParts).toBe(8);

    // Old keys removed
    expect(await getLocalStorage(page, 'setInfo_99008-1')).toBeNull();
    expect(await getLocalStorage(page, 'setInfo_99008-2')).toBeNull();
  });

  test('M.7: Non-set localStorage keys are preserved', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('darkMode', 'true');
      localStorage.setItem('showCompleteParts', 'false');
      localStorage.setItem('setInfo_99001-1', JSON.stringify({
        number: '99001',
        fullNumber: '99001-1',
        name: 'Test Set',
        year: 2024,
        numParts: 10,
        imageUrl: '/assets/favicon.svg',
        lastAccessed: 1700000000000
      }));
    });

    await page.reload();

    expect(await getLocalStorage(page, 'darkMode')).toBe('true');
    expect(await getLocalStorage(page, 'showCompleteParts')).toBe('false');
  });

  test('M.8: App loads and displays set history correctly after migration', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('setInfo_99001-1', JSON.stringify({
        number: '99001',
        fullNumber: '99001-1',
        name: 'Migrated Set',
        year: 2024,
        numParts: 10,
        imageUrl: '/assets/favicon.svg',
        lastAccessed: Date.now()
      }));
      localStorage.setItem('set_99001-1', '3001_Red:5,3004_Blue:3');
    });

    await page.reload();

    // Set history should show the migrated set
    const historyItem = page.locator('.set-history-item');
    await expect(historyItem).toHaveCount(1);
    await expect(historyItem).toContainText('Migrated Set');
  });
});
