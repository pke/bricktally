import { test, expect } from '@playwright/test';
import { mockSets } from '../fixtures/mock-sets.js';
import {
  mockAPIForSet,
  loadTestSet,
  fillQuantity,
  incrementPart,
  getLocalStorage,
  setLocalStorage,
  clearLocalStorage,
  waitForProgressUpdate
} from '../helpers/test-utils.js';

/**
 * Helper: seed localStorage with a set's info and progress without loading via API
 */
async function seedSet(page, fullNumber, name, year, numParts, progress, lastAccessed) {
  await page.evaluate(({ fullNumber, name, year, numParts, progress, lastAccessed }) => {
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
    localStorage.setItem('set_' + fullNumber, JSON.stringify(data));
  }, { fullNumber, name, year, numParts, progress, lastAccessed });
}

/**
 * Helper: build a valid .bricktally backup object
 */
function buildBricktally(sets) {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    app: 'BrickTally/1.13.1',
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
      lastWorkedOn: s.lastWorkedOn
    }))
  };
}

test.describe('Category 15: Backup/Restore', () => {

  // ─── Restore Button Visibility ─────────────────────────────────────

  test('15.1: Restore button visible with no sets in history', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await page.reload();

    // Wait for the set history section to be visible
    await page.waitForSelector('#setHistorySection:not(.hide)', { timeout: 5000 });

    // Restore button should be visible even with no sets
    const restoreBtn = page.locator('.restore-btn');
    await expect(restoreBtn).toBeVisible();
  });

  test('15.2: Restore button visible when sets exist', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await seedSet(page, '99001-1', 'Basic Parts Set', 2024, 10, '0:5,1:3', Date.now());
    await page.reload();

    await page.waitForSelector('#setHistorySection:not(.hide)', { timeout: 5000 });

    const restoreBtn = page.locator('.restore-btn');
    await expect(restoreBtn).toBeVisible();
  });

  test('15.3: Backup All button hidden with no sets', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await page.reload();

    await page.waitForSelector('#setHistorySection:not(.hide)', { timeout: 5000 });

    const backupAllBtn = page.locator('#backupAllBtn');
    await expect(backupAllBtn).toBeHidden();
  });

  test('15.4: Backup All button visible when sets exist', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await seedSet(page, '99001-1', 'Basic Parts Set', 2024, 10, '0:5,1:3', Date.now());
    await page.reload();

    await page.waitForSelector('#setHistorySection:not(.hide)', { timeout: 5000 });

    const backupAllBtn = page.locator('#backupAllBtn');
    await expect(backupAllBtn).toBeVisible();
  });

  // ─── Single Set Backup ────────────────────────────────────────────

  test('15.5: Backup single set downloads valid .bricktally file', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-001']);
    await page.goto('/');
    await clearLocalStorage(page);
    await loadTestSet(page, '99001');

    // Count some parts
    await fillQuantity(page, 0); // 5 red parts
    await waitForProgressUpdate(page);

    // Go back to set history
    await page.locator('h1').click();
    await page.waitForSelector('#setHistorySection:not(.hide)', { timeout: 5000 });

    // Click backup button on the set card
    const downloadPromise = page.waitForEvent('download');
    await page.click('.set-history-item[data-set-number="99001-1"] .backup');
    const download = await downloadPromise;

    // Check filename
    expect(download.suggestedFilename()).toMatch(/BrickTally-99001.*\.bricktally/);

    // Read and validate content
    const path = await download.path();
    const fs = await import('fs');
    const content = JSON.parse(fs.readFileSync(path, 'utf-8'));

    // Validate structure
    expect(content.version).toBe(1);
    expect(content.exportedAt).toBeTruthy();
    expect(content.app).toMatch(/^BrickTally\/.+$/);
    expect(content.sets).toHaveLength(1);
    expect(content.sets[0].fullNumber).toBe('99001-1');
    expect(content.sets[0].info.name).toBe('Basic Parts Set');
    expect(content.sets[0].progress).toBeTruthy();
    expect(content.sets[0].lastWorkedOn).toBeGreaterThan(0);
  });

  test('15.6: Per-set backup button appears on each history card', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await seedSet(page, '99001-1', 'Basic Parts Set', 2024, 10, '0:5', Date.now());
    await seedSet(page, '99002-1', 'Set with Minifigures', 2024, 12, '0:3', Date.now() - 1000);
    await page.reload();

    await page.waitForSelector('#setHistorySection:not(.hide)', { timeout: 5000 });

    // Each card should have a backup button
    const backupButtons = page.locator('.set-history-item .backup');
    await expect(backupButtons).toHaveCount(2);
  });

  // ─── Multi-Set Backup ─────────────────────────────────────────────

  test('15.7: Backup All enters selection mode with checkboxes', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await seedSet(page, '99001-1', 'Basic Parts Set', 2024, 10, '0:5', Date.now());
    await seedSet(page, '99002-1', 'Set with Minifigures', 2024, 12, '0:3', Date.now() - 1000);
    await page.reload();

    await page.waitForSelector('#setHistorySection:not(.hide)', { timeout: 5000 });

    // Click Backup All
    await page.click('#backupAllBtn');

    // Checkboxes should appear on each set card, all checked
    const checkboxes = page.locator('.set-history-item input[type="checkbox"]');
    await expect(checkboxes).toHaveCount(2);
    for (let i = 0; i < 2; i++) {
      await expect(checkboxes.nth(i)).toBeChecked();
    }

    // Backup Selected and Cancel buttons should be visible
    await expect(page.locator('#backupSelectedBtn')).toBeVisible();
    await expect(page.locator('#cancelBackupBtn')).toBeVisible();
  });

  test('15.8: Cancel exits backup selection mode', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await seedSet(page, '99001-1', 'Basic Parts Set', 2024, 10, '0:5', Date.now());
    await page.reload();

    await page.waitForSelector('#setHistorySection:not(.hide)', { timeout: 5000 });

    await page.click('#backupAllBtn');
    await expect(page.locator('.set-history-item input[type="checkbox"]')).toHaveCount(1);

    // Cancel
    await page.click('#cancelBackupBtn');

    // Checkboxes should be gone
    await expect(page.locator('.set-history-item input[type="checkbox"]')).toHaveCount(0);

    // Normal toolbar should be back
    await expect(page.locator('#backupAllBtn')).toBeVisible();
  });

  test('15.9: Backup Selected backs up only checked sets', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await seedSet(page, '99001-1', 'Basic Parts Set', 2024, 10, '0:5', Date.now());
    await seedSet(page, '99002-1', 'Set with Minifigures', 2024, 12, '0:3', Date.now() - 1000);
    await page.reload();

    await page.waitForSelector('#setHistorySection:not(.hide)', { timeout: 5000 });

    // Enter backup mode
    await page.click('#backupAllBtn');

    // Uncheck the second set
    await page.locator('.set-history-item[data-set-number="99002-1"] input[type="checkbox"]').uncheck();

    // Backup
    const downloadPromise = page.waitForEvent('download');
    await page.click('#backupSelectedBtn');
    const download = await downloadPromise;

    // Read and validate
    const path = await download.path();
    const fs = await import('fs');
    const content = JSON.parse(fs.readFileSync(path, 'utf-8'));

    expect(content.sets).toHaveLength(1);
    expect(content.sets[0].fullNumber).toBe('99001-1');
  });

  // ─── Restore (No Conflict) ────────────────────────────────────────

  test('15.10: Restore file with no conflicts adds sets to history', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await page.reload();

    await page.waitForSelector('#setHistorySection:not(.hide)', { timeout: 5000 });

    // Build restore data
    const restoreData = buildBricktally([
      { fullNumber: '10294-1', name: 'Titanic', year: 2021, numParts: 9090, progress: '0:5,1:3', lastWorkedOn: Date.now() - 86400000 }
    ]);

    // Trigger restore via file input
    const fileInput = page.locator('#restoreFileInput');
    const buffer = Buffer.from(JSON.stringify(restoreData));
    await fileInput.setInputFiles({
      name: 'BrickTally-10294.bricktally',
      mimeType: 'application/json',
      buffer: buffer
    });

    // Restore dialog should appear
    await expect(page.locator('.restore-modal')).toBeVisible({ timeout: 5000 });

    // Should show the set with image and no conflict indicator
    await expect(page.locator('.restore-set-item')).toHaveCount(1);
    await expect(page.locator('.restore-set-item').first()).toContainText('Titanic');
    await expect(page.locator('.restore-set-item img.restore-set-image')).toHaveCount(1);

    // Click Restore
    await page.click('#executeRestoreBtn');

    // Modal should close
    await expect(page.locator('.restore-modal')).toBeHidden();

    // Set should now be in history
    await expect(page.locator('.set-history-item[data-set-number="10294-1"]')).toBeVisible();
  });

  // ─── Restore (With Conflict) ───────────────────────────────────────

  test('15.11: Restore with existing set shows conflict resolution', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);

    // Seed a local set that's older
    const localTimestamp = Date.now() - 86400000 * 7; // 7 days ago
    await seedSet(page, '99001-1', 'Basic Parts Set', 2024, 10, '0:3', localTimestamp);
    await page.reload();

    await page.waitForSelector('#setHistorySection:not(.hide)', { timeout: 5000 });

    // Build restore with a newer version of same set
    const restoreTimestamp = Date.now() - 86400000; // 1 day ago
    const restoreData = buildBricktally([
      { fullNumber: '99001-1', name: 'Basic Parts Set', year: 2024, numParts: 10, progress: '0:5,1:3,2:2', lastWorkedOn: restoreTimestamp }
    ]);

    const fileInput = page.locator('#restoreFileInput');
    await fileInput.setInputFiles({
      name: 'restore.bricktally',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(restoreData))
    });

    // Restore dialog should show conflict with image
    await expect(page.locator('.restore-modal')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.restore-conflict')).toHaveCount(1);
    await expect(page.locator('.restore-set-item img.restore-set-image')).toHaveCount(1);

    // Should show both dates
    await expect(page.locator('.restore-set-item').first()).toContainText('Local');
    await expect(page.locator('.restore-set-item').first()).toContainText('Restore');

    // Restored version is newer, so "Overwrite" should be recommended
    const restoreRadio = page.locator('input[type="radio"][value="import"]').first();
    await expect(restoreRadio).toBeChecked();
  });

  test('15.12: Restore keeps local set when user chooses keep', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);

    const localTimestamp = Date.now() - 86400000;
    await seedSet(page, '99001-1', 'Basic Parts Set', 2024, 10, '0:5,1:3,2:2', localTimestamp);
    await page.reload();

    await page.waitForSelector('#setHistorySection:not(.hide)', { timeout: 5000 });

    // Restore an older version
    const restoreData = buildBricktally([
      { fullNumber: '99001-1', name: 'Basic Parts Set', year: 2024, numParts: 10, progress: '0:1', lastWorkedOn: Date.now() - 86400000 * 7 }
    ]);

    const fileInput = page.locator('#restoreFileInput');
    await fileInput.setInputFiles({
      name: 'restore.bricktally',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(restoreData))
    });

    await expect(page.locator('.restore-modal')).toBeVisible({ timeout: 5000 });

    // Select "Keep local"
    await page.locator('input[type="radio"][value="keep"]').first().check();

    await page.click('#executeRestoreBtn');

    // Verify local progress was preserved (0:5,1:3,2:2)
    const raw = await getLocalStorage(page, 'set_99001-1');
    const data = JSON.parse(raw);
    expect(data.progress).toBe('0:5,1:3,2:2');
  });

  test('15.13: Restore overwrites set when user chooses restore', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);

    const localTimestamp = Date.now() - 86400000 * 7;
    await seedSet(page, '99001-1', 'Basic Parts Set', 2024, 10, '0:1', localTimestamp);
    await page.reload();

    await page.waitForSelector('#setHistorySection:not(.hide)', { timeout: 5000 });

    // Restore a newer version with more progress
    const restoreData = buildBricktally([
      { fullNumber: '99001-1', name: 'Basic Parts Set', year: 2024, numParts: 10, progress: '0:5,1:3,2:2', lastWorkedOn: Date.now() - 86400000 }
    ]);

    const fileInput = page.locator('#restoreFileInput');
    await fileInput.setInputFiles({
      name: 'restore.bricktally',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(restoreData))
    });

    await expect(page.locator('.restore-modal')).toBeVisible({ timeout: 5000 });

    // Ensure "Overwrite" is selected
    await page.locator('input[type="radio"][value="import"]').first().check();

    await page.click('#executeRestoreBtn');

    // Verify progress was overwritten
    const raw = await getLocalStorage(page, 'set_99001-1');
    const data = JSON.parse(raw);
    expect(data.progress).toBe('0:5,1:3,2:2');
  });

  // ─── Restore Multi-Set ────────────────────────────────────────────

  test('15.14: Restore multi-set file shows all sets in dialog', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);

    // Seed one existing set
    await seedSet(page, '99001-1', 'Basic Parts Set', 2024, 10, '0:3', Date.now() - 86400000 * 7);
    await page.reload();

    await page.waitForSelector('#setHistorySection:not(.hide)', { timeout: 5000 });

    // Restore two sets: one conflicting, one new
    const restoreData = buildBricktally([
      { fullNumber: '99001-1', name: 'Basic Parts Set', year: 2024, numParts: 10, progress: '0:5,1:3', lastWorkedOn: Date.now() },
      { fullNumber: '10294-1', name: 'Titanic', year: 2021, numParts: 9090, progress: '0:100', lastWorkedOn: Date.now() - 3600000 }
    ]);

    const fileInput = page.locator('#restoreFileInput');
    await fileInput.setInputFiles({
      name: 'restore.bricktally',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(restoreData))
    });

    await expect(page.locator('.restore-modal')).toBeVisible({ timeout: 5000 });

    // Should show 2 sets with images
    await expect(page.locator('.restore-set-item')).toHaveCount(2);
    await expect(page.locator('.restore-set-item img.restore-set-image')).toHaveCount(2);

    // First should be a conflict (99001-1 exists locally)
    await expect(page.locator('.restore-conflict')).toHaveCount(1);
  });

  // ─── Schema Validation ───────────────────────────────────────────

  test('15.15: Restore rejects invalid file', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await page.reload();

    await page.waitForSelector('#setHistorySection:not(.hide)', { timeout: 5000 });

    // Set up dialog handler to capture alert message
    let alertMessage = '';
    page.on('dialog', async dialog => {
      alertMessage = dialog.message();
      await dialog.accept();
    });

    // Try to restore invalid JSON
    const fileInput = page.locator('#restoreFileInput');
    await fileInput.setInputFiles({
      name: 'invalid.bricktally',
      mimeType: 'application/json',
      buffer: Buffer.from('{ "not": "valid bricktally" }')
    });

    // Should show error
    await page.waitForTimeout(500);
    expect(alertMessage).toBeTruthy();
  });

  // ─── lastAccessed Tracking ───────────────────────────────────────

  test('15.16: lastAccessed updates when counting parts', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-001']);
    await page.goto('/');
    await clearLocalStorage(page);
    await loadTestSet(page, '99001');

    // Get initial lastAccessed
    const dataBefore = JSON.parse(await getLocalStorage(page, 'set_99001-1'));
    const initialLastAccessed = dataBefore.lastAccessed;

    // Wait a bit then count a part
    await page.waitForTimeout(50);
    await incrementPart(page, 0);
    await waitForProgressUpdate(page);

    // lastAccessed should be updated
    const dataAfter = JSON.parse(await getLocalStorage(page, 'set_99001-1'));
    expect(dataAfter.lastAccessed).toBeGreaterThan(initialLastAccessed);
  });

  // ─── Restore Cancel ───────────────────────────────────────────────

  test('15.17: Restore dialog cancel does not modify localStorage', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await page.reload();

    await page.waitForSelector('#setHistorySection:not(.hide)', { timeout: 5000 });

    const restoreData = buildBricktally([
      { fullNumber: '10294-1', name: 'Titanic', year: 2021, numParts: 9090, progress: '0:5', lastWorkedOn: Date.now() }
    ]);

    const fileInput = page.locator('#restoreFileInput');
    await fileInput.setInputFiles({
      name: 'restore.bricktally',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(restoreData))
    });

    await expect(page.locator('.restore-modal')).toBeVisible({ timeout: 5000 });

    // Cancel restore
    await page.click('#cancelRestoreBtn');

    // Modal should close
    await expect(page.locator('.restore-modal')).toBeHidden();

    // No set should have been added
    const setData = await getLocalStorage(page, 'set_10294-1');
    expect(setData).toBeNull();
  });

  // ─── Backup File Format Validation ────────────────────────────────

  test('15.18: Backup file contains app version as UserAgent string', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await seedSet(page, '99001-1', 'Basic Parts Set', 2024, 10, '0:5', Date.now());
    await page.reload();

    await page.waitForSelector('#setHistorySection:not(.hide)', { timeout: 5000 });

    const downloadPromise = page.waitForEvent('download');
    await page.click('.set-history-item[data-set-number="99001-1"] .backup');
    const download = await downloadPromise;

    const path = await download.path();
    const fs = await import('fs');
    const content = JSON.parse(fs.readFileSync(path, 'utf-8'));

    // app field should be BrickTally/<version> format
    expect(content.app).toMatch(/^BrickTally\/\d+\.\d+\.\d+$/);
  });

  // ─── Backup Tracking ─────────────────────────────────────────────

  test('15.19: Backup records backupInfo in localStorage', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await seedSet(page, '99001-1', 'Basic Parts Set', 2024, 10, '0:5,1:3', Date.now());
    await page.reload();

    await page.waitForSelector('#setHistorySection:not(.hide)', { timeout: 5000 });

    // Backup the set
    const downloadPromise = page.waitForEvent('download');
    await page.click('.set-history-item[data-set-number="99001-1"] .backup');
    await downloadPromise;

    // Check backup state was persisted in consolidated set data
    const setData = JSON.parse(await getLocalStorage(page, 'set_99001-1'));
    expect(setData).toBeTruthy();
    expect(setData.backup).toBeGreaterThan(0);
    expect(setData.backupCompleted).toBe(8);
  });

  // ─── Smart Delete Dialog ──────────────────────────────────────────

  test('15.20: Delete shows safe message when backup is current', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await seedSet(page, '99001-1', 'Basic Parts Set', 2024, 10, '0:5,1:3', Date.now());

    // Add backup fields to consolidated object (backupCompleted matches current = current)
    await page.evaluate(() => {
      const data = JSON.parse(localStorage.getItem('set_99001-1'));
      data.backup = Date.now();
      data.backupCompleted = 8; // 5+3 = 8 pieces completed
      localStorage.setItem('set_99001-1', JSON.stringify(data));
    });
    await page.reload();

    await page.waitForSelector('#setHistorySection:not(.hide)', { timeout: 5000 });

    // Click delete
    await page.click('.set-history-item[data-set-number="99001-1"] .delete');

    // Delete modal should appear with "Safe to delete" message
    await expect(page.locator('.delete-modal')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.delete-modal')).toContainText('Safe to delete');

    // Should NOT have "Backup & Delete" button
    await expect(page.locator('#backupAndDeleteBtn')).toBeHidden();

    // Should have Delete and Cancel buttons
    await expect(page.locator('#confirmDeleteBtn')).toBeVisible();
    await expect(page.locator('#cancelDeleteBtn')).toBeVisible();
  });

  test('15.21: Delete shows outdated warning when progress changed since backup', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await seedSet(page, '99001-1', 'Basic Parts Set', 2024, 10, '0:5,1:3,2:2', Date.now());

    // Add outdated backup fields (less progress than current)
    await page.evaluate(() => {
      const data = JSON.parse(localStorage.getItem('set_99001-1'));
      data.backup = Date.now() - 86400000;
      data.backupCompleted = 8; // 5+3 = 8 pieces, but current is 10/10
      localStorage.setItem('set_99001-1', JSON.stringify(data));
    });
    await page.reload();

    await page.waitForSelector('#setHistorySection:not(.hide)', { timeout: 5000 });

    await page.click('.set-history-item[data-set-number="99001-1"] .delete');

    await expect(page.locator('.delete-modal')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.delete-modal')).toContainText('outdated');
    // Should show piece counts for both backup and current state
    await expect(page.locator('.delete-modal')).toContainText('8/10 pieces');
    await expect(page.locator('.delete-modal')).toContainText('10/10 pieces');

    // Should have "Backup & Delete" button
    await expect(page.locator('#backupAndDeleteBtn')).toBeVisible();
  });

  test('15.22: Delete shows never-backed-up warning', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await seedSet(page, '99001-1', 'Basic Parts Set', 2024, 10, '0:5', Date.now());
    await page.reload();

    await page.waitForSelector('#setHistorySection:not(.hide)', { timeout: 5000 });

    await page.click('.set-history-item[data-set-number="99001-1"] .delete');

    await expect(page.locator('.delete-modal')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.delete-modal')).toContainText('never been backed up');

    // Should have "Backup & Delete" button
    await expect(page.locator('#backupAndDeleteBtn')).toBeVisible();
  });

  test('15.23: Backup & Delete downloads file then removes set', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await seedSet(page, '99001-1', 'Basic Parts Set', 2024, 10, '0:5', Date.now());
    await page.reload();

    await page.waitForSelector('#setHistorySection:not(.hide)', { timeout: 5000 });

    // Click delete (no backup exists)
    await page.click('.set-history-item[data-set-number="99001-1"] .delete');
    await expect(page.locator('.delete-modal')).toBeVisible({ timeout: 5000 });

    // Click "Backup & Delete"
    const downloadPromise = page.waitForEvent('download');
    await page.click('#backupAndDeleteBtn');
    await downloadPromise;

    // Modal should close and set should be gone
    await expect(page.locator('.delete-modal')).toBeHidden();
    await expect(page.locator('.set-history-item[data-set-number="99001-1"]')).toHaveCount(0);

    // localStorage should be cleaned
    const setData = await getLocalStorage(page, 'set_99001-1');
    expect(setData).toBeNull();
  });

  test('15.24: Delete without backup removes set', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await seedSet(page, '99001-1', 'Basic Parts Set', 2024, 10, '0:5', Date.now());
    await page.reload();

    await page.waitForSelector('#setHistorySection:not(.hide)', { timeout: 5000 });

    await page.click('.set-history-item[data-set-number="99001-1"] .delete');
    await expect(page.locator('.delete-modal')).toBeVisible({ timeout: 5000 });

    // Click "Delete" (not backup)
    await page.click('#confirmDeleteBtn');

    // Set should be gone
    await expect(page.locator('.delete-modal')).toBeHidden();
    await expect(page.locator('.set-history-item[data-set-number="99001-1"]')).toHaveCount(0);
    const setData = await getLocalStorage(page, 'set_99001-1');
    expect(setData).toBeNull();
  });

  test('15.25: Delete also removes all set data', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await seedSet(page, '99001-1', 'Basic Parts Set', 2024, 10, '0:5', Date.now());

    // Add backup fields to consolidated object
    await page.evaluate(() => {
      const data = JSON.parse(localStorage.getItem('set_99001-1'));
      data.backup = Date.now();
      data.backupCompleted = 5;
      localStorage.setItem('set_99001-1', JSON.stringify(data));
    });
    await page.reload();

    await page.waitForSelector('#setHistorySection:not(.hide)', { timeout: 5000 });

    await page.click('.set-history-item[data-set-number="99001-1"] .delete');
    await expect(page.locator('.delete-modal')).toBeVisible({ timeout: 5000 });
    await page.click('#confirmDeleteBtn');

    // Entire set_ key should be removed
    const setData = await getLocalStorage(page, 'set_99001-1');
    expect(setData).toBeNull();
  });

  // ─── Restore Dialog Images ────────────────────────────────────────

  test('15.26: Restore dialog shows set image for each item', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await page.reload();

    await page.waitForSelector('#setHistorySection:not(.hide)', { timeout: 5000 });

    const restoreData = buildBricktally([
      { fullNumber: '10294-1', name: 'Titanic', year: 2021, numParts: 9090, progress: '0:5', lastWorkedOn: Date.now(), imageUrl: '/assets/favicon.svg' }
    ]);

    const fileInput = page.locator('#restoreFileInput');
    await fileInput.setInputFiles({
      name: 'restore.bricktally',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(restoreData))
    });

    await expect(page.locator('.restore-modal')).toBeVisible({ timeout: 5000 });

    // Check image is present
    const img = page.locator('.restore-set-item img.restore-set-image');
    await expect(img).toHaveCount(1);
    await expect(img).toHaveAttribute('src', '/assets/favicon.svg');
  });

  // ─── Restore Clears backupInfo ────────────────────────────────────

  test('15.27: Restoring a set clears its backup state', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);

    // Seed local set with backup fields in consolidated object
    await seedSet(page, '99001-1', 'Basic Parts Set', 2024, 10, '0:3', Date.now() - 86400000 * 7);
    await page.evaluate(() => {
      const data = JSON.parse(localStorage.getItem('set_99001-1'));
      data.backup = Date.now() - 86400000 * 7;
      data.backupCompleted = 3;
      localStorage.setItem('set_99001-1', JSON.stringify(data));
    });
    await page.reload();

    await page.waitForSelector('#setHistorySection:not(.hide)', { timeout: 5000 });

    // Restore a newer version
    const restoreData = buildBricktally([
      { fullNumber: '99001-1', name: 'Basic Parts Set', year: 2024, numParts: 10, progress: '0:5,1:3', lastWorkedOn: Date.now() }
    ]);

    const fileInput = page.locator('#restoreFileInput');
    await fileInput.setInputFiles({
      name: 'restore.bricktally',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(restoreData))
    });

    await expect(page.locator('.restore-modal')).toBeVisible({ timeout: 5000 });
    await page.locator('input[type="radio"][value="import"]').first().check();
    await page.click('#executeRestoreBtn');

    // Backup fields should be cleared since restored data replaces the object
    const raw = await getLocalStorage(page, 'set_99001-1');
    const setData = JSON.parse(raw);
    expect(setData.backup).toBeUndefined();
    expect(setData.backupCompleted).toBeUndefined();
    // But the set data itself should exist with restored progress
    expect(setData.progress).toBe('0:5,1:3');
  });

  // ─── Delete Modal Cancel ──────────────────────────────────────────

  test('15.28: Cancel delete modal does not remove set', async ({ page }) => {
    await page.goto('/');
    await clearLocalStorage(page);
    await seedSet(page, '99001-1', 'Basic Parts Set', 2024, 10, '0:5', Date.now());
    await page.reload();

    await page.waitForSelector('#setHistorySection:not(.hide)', { timeout: 5000 });

    await page.click('.set-history-item[data-set-number="99001-1"] .delete');
    await expect(page.locator('.delete-modal')).toBeVisible({ timeout: 5000 });

    // Cancel
    await page.click('#cancelDeleteBtn');

    // Modal should close, set should still be there
    await expect(page.locator('.delete-modal')).toBeHidden();
    await expect(page.locator('.set-history-item[data-set-number="99001-1"]')).toBeVisible();
  });
});
