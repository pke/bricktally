import { test, expect } from '@playwright/test';
import { mockSets } from '../fixtures/mock-sets.js';
import {
  mockAPIForSet,
  mockAPIForSetWithVersions,
  loadTestSet,
  getLocalStorage,
  clearLocalStorage,
  isSectionVisible
} from '../helpers/test-utils.js';

/**
 * Security hardening tests
 *
 * Covers XSS prevention for deep links, stored set numbers, set history,
 * and .bricktally restore validation.
 */

function buildBricktally(sets) {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    app: 'BrickTally/1.41.3',
    sets: sets.map(s => ({
      fullNumber: s.fullNumber,
      info: {
        number: s.fullNumber.split('-')[0],
        fullNumber: s.infoFullNumber !== undefined ? s.infoFullNumber : s.fullNumber,
        name: s.name,
        year: s.year,
        numParts: s.numParts,
        imageUrl: s.imageUrl,
        lastAccessed: s.lastWorkedOn
      },
      progress: s.progress || '',
      lastWorkedOn: s.lastWorkedOn
    }))
  };
}

test.describe('Security Hardening', () => {

  test('SH.1: Deep link with payload in set number cannot execute JS', async ({ page }) => {
    const apiRequests = [];
    page.on('request', req => {
      if (req.url().includes('/api/rebrickable')) apiRequests.push(req.url());
    });

    await page.goto('/');
    await clearLocalStorage(page);

    const mockSet = mockSets['TEST-001'];
    const baseNumber = mockSet.setNumber.split('-')[0];
    const payload = `${baseNumber}-1#<img src=x onerror="window.__xss=1">`;

    await page.goto('/?set=' + encodeURIComponent(payload));
    await page.waitForSelector('#setHistorySection:not(.hide), #landingContent', { timeout: 5000 });

    // The payload must not execute
    expect(await page.evaluate(() => window.__xss)).toBeUndefined();

    // No API request may contain the raw payload
    for (const url of apiRequests) {
      expect(url).not.toContain('onerror');
      expect(decodeURIComponent(url)).not.toContain('<img');
    }

    // The payload must not be stored as the current set
    const stored = await getLocalStorage(page, 'currentSetNumber');
    expect(stored).not.toBe(payload);
  });

  test('SH.2: Malicious stored currentSetNumber is ignored and removed', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);

    await page.evaluate(() => {
      localStorage.setItem('currentSetNumber', '1-1"><img src=x onerror=window.__xss=1>');
    });
    await page.reload();
    await page.waitForSelector('#setHistorySection:not(.hide), #landingContent', { timeout: 5000 });

    expect(await page.evaluate(() => window.__xss)).toBeUndefined();
    expect(await getLocalStorage(page, 'currentSetNumber')).toBeNull();
  });

  test('SH.3: Set history entry with hostile name/notes renders inert', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);

    const hostileNotes = '" onmouseover="window.__xss=1';
    await page.evaluate((notes) => {
      localStorage.setItem('set_99001-1', JSON.stringify({
        number: '99001',
        fullNumber: '99001-1',
        name: '"><img src=x onerror=window.__xss=1>',
        year: 2024,
        numParts: 10,
        imageUrl: '/assets/favicon.svg',
        lastAccessed: Date.now(),
        progress: '',
        notes: notes
      }));
    }, hostileNotes);
    await page.reload();

    await page.waitForSelector('.set-history-item[data-set-number="99001-1"]', { timeout: 5000 });

    // The notes element's title must be the literal hostile string
    const notesEl = page.locator('.set-history-item-notes');
    await expect(notesEl).toHaveCount(1);
    expect(await notesEl.getAttribute('title')).toBe(hostileNotes);

    // Hovering over the notes must not trigger a handler
    await notesEl.hover();
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => window.__xss)).toBeUndefined();
  });

  test('SH.4: Restore rejects crafted fullNumber payload', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await page.reload();
    await page.waitForSelector('#landingContent', { timeout: 5000 });

    let alertMessage = '';
    page.on('dialog', async dialog => {
      alertMessage = dialog.message();
      await dialog.accept();
    });

    const badFullNumber = "1');window.__xss=1;//-1";
    const restoreData = buildBricktally([
      { fullNumber: badFullNumber, infoFullNumber: badFullNumber, name: 'Crafted', year: 2024, numParts: 10, lastWorkedOn: Date.now() }
    ]);

    await page.locator('#restoreFileInput').setInputFiles({
      name: 'crafted.bricktally',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(restoreData))
    });

    await page.waitForTimeout(500);
    expect(alertMessage).toBeTruthy();
    await expect(page.locator('.restore-modal')).toBeHidden();
    expect(await page.evaluate(() => window.__xss)).toBeUndefined();
  });

  test('SH.5: Restore rejects javascript: imageUrl', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await page.reload();
    await page.waitForSelector('#landingContent', { timeout: 5000 });

    let alertMessage = '';
    page.on('dialog', async dialog => {
      alertMessage = dialog.message();
      await dialog.accept();
    });

    const restoreData = buildBricktally([
      { fullNumber: '10294-1', name: 'Titanic', year: 2021, numParts: 9090, imageUrl: 'javascript:alert(1)', lastWorkedOn: Date.now() }
    ]);

    await page.locator('#restoreFileInput').setInputFiles({
      name: 'crafted.bricktally',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(restoreData))
    });

    await page.waitForTimeout(500);
    expect(alertMessage).toBeTruthy();
    await expect(page.locator('.restore-modal')).toBeHidden();
    expect(await page.evaluate(() => window.__xss)).toBeUndefined();
  });

  test('SH.7: Restore accepts data: SVG and null imageUrl', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await page.reload();
    await page.waitForSelector('#landingContent', { timeout: 5000 });

    let alertMessage = '';
    page.on('dialog', async dialog => {
      alertMessage = dialog.message();
      await dialog.accept();
    });

    const restoreData = buildBricktally([
      { fullNumber: '10294-1', name: 'Titanic', year: 2021, numParts: 9090,
        imageUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="50" height="50"%3E%3C/svg%3E', lastWorkedOn: Date.now() },
      { fullNumber: '10179-1', name: 'Millennium Falcon', year: 2007, numParts: 5195,
        imageUrl: null, lastWorkedOn: Date.now() - 3600000 }
    ]);

    await page.locator('#restoreFileInput').setInputFiles({
      name: 'legacy.bricktally',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(restoreData))
    });

    // Restore dialog must open with both sets — no validation alert
    await expect(page.locator('.restore-modal')).toBeVisible({ timeout: 5000 });
    expect(alertMessage).toBe('');
    await expect(page.locator('.restore-set-item')).toHaveCount(2);

    await page.click('#executeRestoreBtn');
    await expect(page.locator('.restore-modal')).toBeHidden();

    await expect(page.locator('.set-history-item[data-set-number="10294-1"]')).toBeVisible();
    await expect(page.locator('.set-history-item[data-set-number="10179-1"]')).toBeVisible();
  });

  test('SH.6: Version selector still loads the selected version', async ({ page }) => {
    await mockAPIForSetWithVersions(page, mockSets['TEST-008'], mockSets['TEST-008-ALT']);
    await page.goto('/');
    await clearLocalStorage(page);

    // Change input type to text and enter the base number
    await page.locator('#setNumber').evaluate(el => { el.type = 'text'; });
    await page.locator('#setNumber').fill('99008');
    await page.locator('#setNumber').press('Enter');

    // Version selector should appear with two versions
    await page.waitForSelector('.version-selector-overlay', { timeout: 10000 });
    await expect(page.locator('.version-select-btn')).toHaveCount(2);

    // Click the second version and expect it to load
    await page.locator('.version-select-btn', { hasText: '99008-2' }).click();
    await page.waitForSelector('#setInfo:not(.hide)', { timeout: 10000 });

    expect(await getLocalStorage(page, 'currentSetNumber')).toBe('99008-2');
  });
});
