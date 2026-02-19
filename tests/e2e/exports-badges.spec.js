import { test, expect } from '@playwright/test';
import { mockSets } from '../fixtures/mock-sets.js';
import {
  mockAPIForSet,
  loadTestSet,
  fillQuantity,
  incrementPart,
  waitForProgressUpdate
} from '../helpers/test-utils.js';

test.describe('Category 9: Export Functions', () => {
  test('9.1: BrickLink export - missing parts and minifigs', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-002']);

    await page.goto('/');
    await loadTestSet(page, '99002');

    // Count only 5 parts (out of 10) and 1 minifig (out of 2)
    await fillQuantity(page, 0); // 5 red parts
    await page.click('#minifig-2 .minifig-name'); // 1 minifig

    await waitForProgressUpdate(page);

    // Export to BrickLink
    const downloadPromise = page.waitForEvent('download');

    // Open export menu
    await page.click('.filter-header:has-text("Export")');
    await page.click('button:has-text("BrickLink XML")');

    const download = await downloadPromise;
    const path = await download.path();

    // Read the XML file
    const fs = await import('fs');
    const xml = fs.readFileSync(path, 'utf-8');

    // Check XML contains missing parts (5 blue parts)
    expect(xml).toContain('<ITEMTYPE>P</ITEMTYPE>');
    expect(xml).toContain('<ITEMID>3004</ITEMID>'); // Blue brick part number
    expect(xml).toContain('<MINQTY>5</MINQTY>');

    // Check XML contains missing minifig
    expect(xml).toContain('<ITEMTYPE>M</ITEMTYPE>');
    expect(xml).toContain('<ITEMID>fig-005678</ITEMID>'); // Firefighter fig_num
    expect(xml).toContain('<MINQTY>1</MINQTY>');
  });

  test('9.2: BrickLink export - complete set', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-001']);

    await page.goto('/');
    await loadTestSet(page, '99001');

    // Complete all parts
    await fillQuantity(page, 0);
    await fillQuantity(page, 1);
    await fillQuantity(page, 2);

    await waitForProgressUpdate(page);

    // Try to export
    page.on('dialog', async (dialog) => {
      expect(dialog.message()).toContain('No missing pieces');
      await dialog.accept();
    });

    // Open export menu
    await page.click('.filter-header:has-text("Export")');
    await page.click('button:has-text("BrickLink XML")');

    // Should show alert instead of downloading
    await page.waitForTimeout(500);
  });

  test('9.3: BrickLink export - spares considered', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-003']);

    await page.goto('/');
    await loadTestSet(page, '99003');

    // Count 3 regular red + all spare red (2)
    // This should complete the red part (needs 5 total)
    for (let i = 0; i < 3; i++) {
      await incrementPart(page, 0);
    }

    // Count spare red bricks (find the Red spare part directly from partsData)
    const redSparePartId = await page.evaluate(() => {
      return window.partsData.find(p => p.isSpare && p.color === 'Red')?.id;
    });
    await fillQuantity(page, redSparePartId);

    // Complete other parts
    await fillQuantity(page, 1); // Blue
    await fillQuantity(page, 2); // Green

    await waitForProgressUpdate(page);

    // Export to BrickLink
    page.on('dialog', async (dialog) => {
      // Should say no missing pieces since spares covered the gap
      expect(dialog.message()).toContain('No missing pieces');
      await dialog.accept();
    });

    await page.click('.filter-header:has-text("Export")');
    await page.click('button:has-text("BrickLink XML")');

    await page.waitForTimeout(500);
  });

  test('9.4: Pick a Brick export - no minifigs', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-002']);

    await page.goto('/');
    await loadTestSet(page, '99002');

    // Don't count anything (all missing)

    // Export to Pick a Brick
    const downloadPromise = page.waitForEvent('download');

    await page.click('.filter-header:has-text("Export")');
    await page.click('button:has-text("Pick a Brick CSV")');

    const download = await downloadPromise;
    const path = await download.path();

    // Read the CSV file
    const fs = await import('fs');
    const csv = fs.readFileSync(path, 'utf-8');

    // Check CSV contains comment about minifigs
    expect(csv).toContain('Minifigures excluded');

    // Check CSV contains parts
    expect(csv).toContain('3001'); // Red brick
    expect(csv).toContain('3004'); // Blue brick

    // Check CSV does NOT contain minifig IDs
    expect(csv).not.toContain('fig-001234');
    expect(csv).not.toContain('fig-005678');
  });

  test('9.5: Text export format', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-002']);

    await page.goto('/');
    await loadTestSet(page, '99002');

    // Count only some parts and minifigs
    await fillQuantity(page, 0); // Complete red parts
    await page.click('#minifig-2 .minifig-name'); // Complete 1 minifig

    await waitForProgressUpdate(page);

    // Export as text
    const downloadPromise = page.waitForEvent('download');

    await page.click('.filter-header:has-text("Export")');
    await expect(page.locator('#exportFilterSection')).toBeVisible();
    await page.click('button:has-text("Text List")');

    const download = await downloadPromise;
    const path = await download.path();

    // Read the text file
    const fs = await import('fs');
    const text = fs.readFileSync(path, 'utf-8');

    // Check format has PARTS and MINIFIGURES sections
    expect(text).toContain('PARTS:');
    expect(text).toContain('MINIFIGURES:');

    // Check parts listed
    expect(text).toContain('3004'); // Blue brick (missing)

    // Check minifigs listed
    expect(text).toContain('Firefighter'); // Missing minifig
  });
});

test.describe('Category 10: Badge Generation', () => {
  test('10.1: Badge modal shows PNG image', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-001']);

    await page.goto('/');
    await loadTestSet(page, '99001');

    // Complete all parts
    await fillQuantity(page, 0);
    await fillQuantity(page, 1);
    await fillQuantity(page, 2);

    await waitForProgressUpdate(page);

    // Generate badge
    await page.click('.filter-header:has-text("Export")');
    await page.click('button:has-text("Generate Badge")');

    // Wait for modal
    await page.waitForSelector('text=BrickTally Badge', { timeout: 5000 });

    // Check modal shows PNG image with data URL
    const badgeImg = page.locator('img[alt="BrickTally Badge"]');
    await expect(badgeImg).toBeVisible();
    const imgSrc = await badgeImg.getAttribute('src');
    expect(imgSrc).toMatch(/^data:image\/png;base64,/);
  });

  test('10.2: Badge download button with correct filename - complete set', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-001']);

    await page.goto('/');
    await loadTestSet(page, '99001');

    // Complete all
    await fillQuantity(page, 0);
    await fillQuantity(page, 1);
    await fillQuantity(page, 2);

    await waitForProgressUpdate(page);

    // Generate badge
    await page.click('.filter-header:has-text("Export")');
    await page.click('button:has-text("Generate Badge")');

    await page.waitForSelector('text=BrickTally Badge', { timeout: 5000 });

    // Check download link has correct filename: bricktally-<set-id>-<set-name>-<missing>-missing.png
    const downloadLink = page.locator('#badgeDownload');
    await expect(downloadLink).toBeVisible();
    const filename = await downloadLink.getAttribute('download');
    expect(filename).toBe('bricktally-99001-basic-parts-set-complete.png');
  });

  test('10.3: Badge download filename shows missing count', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-001']);

    await page.goto('/');
    await loadTestSet(page, '99001');

    // Count only some parts (5 out of 10 total, 5 missing)
    await fillQuantity(page, 0); // 5 red parts

    await waitForProgressUpdate(page);

    // Generate badge
    await page.click('.filter-header:has-text("Export")');
    await page.click('button:has-text("Generate Badge")');

    await page.waitForSelector('text=BrickTally Badge', { timeout: 5000 });

    // Check download filename shows 5 missing
    const downloadLink = page.locator('#badgeDownload');
    const filename = await downloadLink.getAttribute('download');
    expect(filename).toBe('bricktally-99001-basic-parts-set-5-missing.png');
  });

  test('10.4: Badge filename with minifigs missing', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-002']);

    await page.goto('/');
    await loadTestSet(page, '99002');

    // Count 10 parts + 1 minifig = 11/12 (one minifig missing)
    await fillQuantity(page, 0);
    await fillQuantity(page, 1);
    await page.click('#minifig-2 .minifig-name');

    await waitForProgressUpdate(page);

    // Generate badge
    await page.click('.filter-header:has-text("Export")');
    await page.click('button:has-text("Generate Badge")');

    await page.waitForSelector('text=BrickTally Badge', { timeout: 5000 });

    // Check download filename shows 1 missing (the minifig)
    const downloadLink = page.locator('#badgeDownload');
    const filename = await downloadLink.getAttribute('download');
    expect(filename).toBe('bricktally-99002-set-with-minifigures-1-missing.png');
  });

  test('10.5: Badge download triggers file save', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-001']);

    await page.goto('/');
    await loadTestSet(page, '99001');

    // Generate badge
    await page.click('.filter-header:has-text("Export")');
    await page.click('button:has-text("Generate Badge")');

    await page.waitForSelector('text=BrickTally Badge', { timeout: 5000 });

    // Click download and verify file is created (10 missing since nothing counted)
    const downloadPromise = page.waitForEvent('download');
    await page.click('#badgeDownload button');
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe('bricktally-99001-basic-parts-set-10-missing.png');
  });

  test('10.6: Badge modal shows download instructions', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-001']);

    await page.goto('/');
    await loadTestSet(page, '99001');

    // Generate badge
    await page.click('.filter-header:has-text("Export")');
    await page.click('button:has-text("Generate Badge")');

    await page.waitForSelector('text=BrickTally Badge', { timeout: 5000 });

    // Check modal shows instructions about sharing
    await expect(page.locator('text=eBay')).toBeVisible();
    await expect(page.locator('text=Facebook Marketplace')).toBeVisible();
    await expect(page.locator('text=Download Badge')).toBeVisible();
  });
});
