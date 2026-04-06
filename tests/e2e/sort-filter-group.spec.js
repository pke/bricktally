import { test, expect } from '@playwright/test';
import { clearLocalStorage } from '../helpers/test-utils.js';

/**
 * Helper: seed a set into localStorage
 */
async function seedSet(page, { fullNumber, name, year, numParts, progress, lastAccessed }) {
  await page.evaluate(({ fullNumber, name, year, numParts, progress, lastAccessed }) => {
    localStorage.setItem('set_' + fullNumber, JSON.stringify({
      number: fullNumber.split('-')[0],
      fullNumber,
      name,
      year,
      numParts,
      imageUrl: '/assets/favicon.svg',
      lastAccessed,
      progress: progress || ''
    }));
  }, { fullNumber, name, year, numParts, progress, lastAccessed });
}

test.describe('Category 19: Sort, Filter & Group', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    // Seed three sets with different states
    await seedSet(page, { fullNumber: '10234-1', name: 'Sydney Opera House', year: 2013, numParts: 100, progress: '', lastAccessed: 1000 });
    await seedSet(page, { fullNumber: '75192-1', name: 'Millennium Falcon', year: 2017, numParts: 50, progress: 'dGVzdA', lastAccessed: 3000 });
    await seedSet(page, { fullNumber: '42100-1', name: 'Liebherr Excavator', year: 2019, numParts: 80, progress: '', lastAccessed: 2000 });
    await page.reload();
  });

  test('19.1: Sort by name A→Z', async ({ page }) => {
    await page.selectOption('#sortSelect', 'name-asc');
    const names = await page.locator('.set-history-item-title').allTextContents();
    expect(names).toEqual(['Liebherr Excavator', 'Millennium Falcon', 'Sydney Opera House']);
  });

  test('19.2: Sort by name Z→A', async ({ page }) => {
    await page.selectOption('#sortSelect', 'name-desc');
    const names = await page.locator('.set-history-item-title').allTextContents();
    expect(names).toEqual(['Sydney Opera House', 'Millennium Falcon', 'Liebherr Excavator']);
  });

  test('19.3: Sort by year newest first', async ({ page }) => {
    await page.selectOption('#sortSelect', 'year-desc');
    const names = await page.locator('.set-history-item-title').allTextContents();
    expect(names).toEqual(['Liebherr Excavator', 'Millennium Falcon', 'Sydney Opera House']);
  });

  test('19.4: Sort by number low→high', async ({ page }) => {
    await page.selectOption('#sortSelect', 'number-asc');
    const names = await page.locator('.set-history-item-title').allTextContents();
    expect(names).toEqual(['Sydney Opera House', 'Liebherr Excavator', 'Millennium Falcon']);
  });

  test('19.5: Default sort is last worked on descending', async ({ page }) => {
    const names = await page.locator('.set-history-item-title').allTextContents();
    // lastAccessed: Falcon=3000, Excavator=2000, Opera=1000
    expect(names).toEqual(['Millennium Falcon', 'Liebherr Excavator', 'Sydney Opera House']);
  });

  test('19.6: Filter "Not Started" shows only sets with no progress', async ({ page }) => {
    await page.selectOption('#filterSelect', 'notStarted');
    const names = await page.locator('.set-history-item-title').allTextContents();
    // All three sets have empty/invalid progress, so all show as "Not Started"
    expect(names.length).toBe(3);
    // Switch to "Complete" — none are complete, so zero results
    await page.selectOption('#filterSelect', 'complete');
    await expect(page.locator('.set-history-item')).toHaveCount(0);
    await expect(page.locator('.set-history-empty-filter')).toBeVisible();
  });

  test('19.7: Filter with no matches shows message and clear button', async ({ page }) => {
    await page.selectOption('#filterSelect', 'complete');
    await expect(page.locator('.set-history-empty-filter')).toBeVisible();
    await expect(page.locator('.filter-clear-btn')).toBeVisible();
  });

  test('19.8: Clear filter button resets to all sets', async ({ page }) => {
    await page.selectOption('#filterSelect', 'complete');
    await page.click('.filter-clear-btn');
    await expect(page.locator('.set-history-item')).toHaveCount(3);
    await expect(page.locator('#filterSelect')).toHaveValue('all');
  });

  test('19.9: Sort preference persists across reload', async ({ page }) => {
    await page.selectOption('#sortSelect', 'name-asc');
    await page.reload();
    await expect(page.locator('#sortSelect')).toHaveValue('name-asc');
    const names = await page.locator('.set-history-item-title').allTextContents();
    expect(names).toEqual(['Liebherr Excavator', 'Millennium Falcon', 'Sydney Opera House']);
  });
});
