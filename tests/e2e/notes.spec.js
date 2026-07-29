import { test, expect } from '@playwright/test';
import { mockSets } from '../fixtures/mock-sets.js';
import {
  mockAPIForSet,
  loadTestSet,
  incrementPart,
  getLocalStorage,
  clearLocalStorage,
  waitForProgressUpdate
} from '../helpers/test-utils.js';

/**
 * Helper: seed localStorage with a set, optionally including notes
 */
async function seedSet(page, { fullNumber, name, year, numParts, progress, lastAccessed, notes }) {
  await page.evaluate(({ fullNumber, name, year, numParts, progress, lastAccessed, notes }) => {
    const data = {
      number: fullNumber.split('-')[0],
      fullNumber: fullNumber,
      name: name,
      year: year,
      numParts: numParts,
      imageUrl: '/assets/favicon.svg',
      lastAccessed: lastAccessed,
      progress: progress || ''
    };
    if (notes) data.notes = notes;
    localStorage.setItem('set_' + fullNumber, JSON.stringify(data));
  }, { fullNumber, name, year, numParts, progress, lastAccessed, notes });
}

/**
 * Helper: build a valid .bricktally backup object (with optional notes per set)
 */
function buildBricktally(sets) {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    app: 'BrickTally/1.39.1',
    sets: sets.map(s => ({
      fullNumber: s.fullNumber,
      info: {
        number: s.fullNumber.split('-')[0],
        fullNumber: s.fullNumber,
        name: s.name,
        year: s.year,
        numParts: s.numParts,
        imageUrl: s.imageUrl || '/assets/favicon.svg',
        lastAccessed: s.lastWorkedOn
      },
      progress: s.progress || '',
      ...(s.notes !== undefined ? { notes: s.notes } : {}),
      lastWorkedOn: s.lastWorkedOn
    }))
  };
}

test.describe('Category 20: Set Notes', () => {

  test('20.1: Typing a note persists it with the set state', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-001']);

    await page.goto('/');
    await clearLocalStorage(page);
    await loadTestSet(page, '99001');

    // Notes section is collapsed by default for a set without notes
    const notesSection = page.locator('#setNotesSection');
    await expect(notesSection).not.toHaveAttribute('open', '');

    await page.click('#setNotesSection summary');
    await page.fill('#setNotesInput', 'Missing 2x red 2x4 brick');

    // Wait for the debounced save (500ms)
    await page.waitForTimeout(700);

    const raw = await getLocalStorage(page, 'set_99001-1');
    const data = JSON.parse(raw);
    expect(data.notes).toBe('Missing 2x red 2x4 brick');
  });

  test('20.2: Notes are restored into the editor after reload', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-001']);

    await page.goto('/');
    await clearLocalStorage(page);
    await loadTestSet(page, '99001');

    await page.click('#setNotesSection summary');
    await page.fill('#setNotesInput', 'Box is in the attic');
    await page.waitForTimeout(700);

    // Reload — the app auto-loads the last opened set
    await page.reload();
    await page.waitForSelector('#setInfo:not(.hide)', { timeout: 10000 });

    await expect(page.locator('#setNotesInput')).toHaveValue('Box is in the attic');
    // Section auto-opens when the set has notes
    await expect(page.locator('#setNotesSection')).toHaveAttribute('open', '');
  });

  test('20.3: Clearing a note removes it from the stored set', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-001']);

    await page.goto('/');
    await clearLocalStorage(page);
    await loadTestSet(page, '99001');

    await page.click('#setNotesSection summary');
    await page.fill('#setNotesInput', 'Temporary note');
    await page.waitForTimeout(700);

    await page.fill('#setNotesInput', '');
    await page.waitForTimeout(700);

    const raw = await getLocalStorage(page, 'set_99001-1');
    const data = JSON.parse(raw);
    expect(data.notes).toBeUndefined();
  });

  test('20.4: Notes survive counting progress', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-001']);

    await page.goto('/');
    await clearLocalStorage(page);
    await loadTestSet(page, '99001');

    await page.click('#setNotesSection summary');
    await page.fill('#setNotesInput', 'Sorted by colour');
    await page.waitForTimeout(700);

    await incrementPart(page, 0);
    await waitForProgressUpdate(page);

    const raw = await getLocalStorage(page, 'set_99001-1');
    const data = JSON.parse(raw);
    expect(data.notes).toBe('Sorted by colour');
    expect(data.progress).not.toBe('');
  });

  test('20.5: Set history card shows a note preview', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await seedSet(page, { fullNumber: '10234-1', name: 'Sydney Opera House', year: 2013, numParts: 100, lastAccessed: 2000, notes: 'Missing one sail piece' });
    await seedSet(page, { fullNumber: '42100-1', name: 'Liebherr Excavator', year: 2019, numParts: 80, lastAccessed: 1000 });
    await page.reload();

    await page.waitForSelector('#setHistorySection:not(.hide)', { timeout: 5000 });

    const withNotes = page.locator('.set-history-item[data-set-number="10234-1"] .set-history-item-notes');
    await expect(withNotes).toBeVisible();
    await expect(withNotes).toContainText('Missing one sail piece');

    const withoutNotes = page.locator('.set-history-item[data-set-number="42100-1"] .set-history-item-notes');
    await expect(withoutNotes).toHaveCount(0);
  });

  test('20.6: Backup file includes notes', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await seedSet(page, { fullNumber: '99001-1', name: 'Basic Parts Set', year: 2024, numParts: 10, progress: '0:5', lastAccessed: Date.now(), notes: 'Bought used on eBay' });
    await page.reload();

    await page.waitForSelector('#setHistorySection:not(.hide)', { timeout: 5000 });

    const downloadPromise = page.waitForEvent('download');
    await page.click('.set-history-item[data-set-number="99001-1"] button.backup');
    const download = await downloadPromise;

    const path = await download.path();
    const fs = await import('fs');
    const backup = JSON.parse(fs.readFileSync(path, 'utf-8'));

    expect(backup.sets).toHaveLength(1);
    expect(backup.sets[0].notes).toBe('Bought used on eBay');
  });

  test('20.7: Restoring a backup brings notes back', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await page.reload();
    await page.waitForSelector('#landingContent', { timeout: 5000 });

    const restoreData = buildBricktally([
      { fullNumber: '10294-1', name: 'Titanic', year: 2021, numParts: 9090, progress: '0:5', notes: 'Hull section done', lastWorkedOn: Date.now() - 86400000 }
    ]);

    const fileInput = page.locator('#restoreFileInput');
    await fileInput.setInputFiles({
      name: 'BrickTally-10294.bricktally',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(restoreData))
    });

    await expect(page.locator('.restore-modal')).toBeVisible({ timeout: 5000 });
    await page.click('#executeRestoreBtn');
    await expect(page.locator('.restore-modal')).toBeHidden();

    const raw = await getLocalStorage(page, 'set_10294-1');
    const data = JSON.parse(raw);
    expect(data.notes).toBe('Hull section done');

    // The restored set's card shows the note preview
    const preview = page.locator('.set-history-item[data-set-number="10294-1"] .set-history-item-notes');
    await expect(preview).toContainText('Hull section done');
  });

  test('20.8: Restoring an old backup without notes keeps local notes', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await seedSet(page, { fullNumber: '99001-1', name: 'Basic Parts Set', year: 2024, numParts: 10, progress: '0:3', lastAccessed: Date.now() - 86400000 * 7, notes: 'Keep me' });
    await page.reload();

    await page.waitForSelector('#setHistorySection:not(.hide)', { timeout: 5000 });

    // Backup predates the notes feature — no notes field at all
    const restoreData = buildBricktally([
      { fullNumber: '99001-1', name: 'Basic Parts Set', year: 2024, numParts: 10, progress: '0:5,1:3', lastWorkedOn: Date.now() - 86400000 }
    ]);

    const fileInput = page.locator('#restoreFileInput');
    await fileInput.setInputFiles({
      name: 'restore.bricktally',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(restoreData))
    });

    await expect(page.locator('.restore-modal')).toBeVisible({ timeout: 5000 });
    // Backup is newer, "Overwrite" is preselected
    await page.click('#executeRestoreBtn');
    await expect(page.locator('.restore-modal')).toBeHidden();

    const raw = await getLocalStorage(page, 'set_99001-1');
    const data = JSON.parse(raw);
    expect(data.progress).toBe('0:5,1:3');
    expect(data.notes).toBe('Keep me');
  });
});
