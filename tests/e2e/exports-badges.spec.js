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
  test('10.1: Badge calculation - with spares', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-003']);

    await page.goto('/');
    await loadTestSet(page, '99003');

    // Complete all via spares
    await fillQuantity(page, 0); // Regular parts
    await fillQuantity(page, 1);
    await fillQuantity(page, 2);

    await waitForProgressUpdate(page);

    // Generate badge
    await page.click('.filter-header:has-text("Export")');
    await page.click('button:has-text("Generate Badge")');

    // Wait for modal
    await page.waitForSelector('text=BrickTally Badge', { timeout: 5000 });

    // Check badge shows 100%
    const badgeHtml = await page.locator('#badgeCode').inputValue();
    expect(badgeHtml).toContain('100%');
    expect(badgeHtml).toMatch(/10\/10/); // May or may not include " pieces"
  });

  test('10.2: Badge calculation - with minifigs', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-002']);

    await page.goto('/');
    await loadTestSet(page, '99002');

    // Count 10 parts + 1 minifig = 11/12
    await fillQuantity(page, 0);
    await fillQuantity(page, 1);
    await page.click('#minifig-2 .minifig-name');

    await waitForProgressUpdate(page);

    // Generate badge
    await page.click('.filter-header:has-text("Export")');
    await page.click('button:has-text("Generate Badge")');

    await page.waitForSelector('text=BrickTally Badge', { timeout: 5000 });

    // Check badge shows 91% (11/12)
    const badgeHtml = await page.locator('#badgeCode').inputValue();
    expect(badgeHtml).toContain('91%');
    expect(badgeHtml).toMatch(/11\/12/); // May or may not include " pieces"
  });

  test('10.3: Badge long name truncation', async ({ page }) => {
    // Create a mock set with a very long name
    const longNameSet = {
      ...mockSets['TEST-001'],
      setName: 'This is an extremely long set name that should be truncated'
    };

    await mockAPIForSet(page, longNameSet);

    await page.goto('/');
    await loadTestSet(page, '99001');

    // Generate badge
    await page.click('.filter-header:has-text("Export")');
    await page.click('button:has-text("Generate Badge")');

    await page.waitForSelector('text=BrickTally Badge', { timeout: 5000 });

    // Check badge name is truncated
    const badgeHtml = await page.locator('#badgeCode').inputValue();
    expect(badgeHtml).toContain('...');
  });

  test('10.4: Badge color - complete (green)', async ({ page }) => {
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

    // Check badge has green color
    const badgeHtml = await page.locator('#badgeCode').inputValue();
    expect(badgeHtml).toContain('#4CAF50'); // Green color
  });

  test('10.5: Badge color - incomplete (orange)', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-001']);

    await page.goto('/');
    await loadTestSet(page, '99001');

    // Count only some (85%)
    await fillQuantity(page, 0); // 5
    await fillQuantity(page, 1); // 3
    await incrementPart(page, 2); // 1 out of 2

    await waitForProgressUpdate(page);

    // Generate badge
    await page.click('.filter-header:has-text("Export")');
    await page.click('button:has-text("Generate Badge")');

    await page.waitForSelector('text=BrickTally Badge', { timeout: 5000 });

    // Check badge has orange color (>= 80%)
    const badgeHtml = await page.locator('#badgeCode').inputValue();
    expect(badgeHtml).toContain('#FF9800'); // Orange color
  });

  test('10.6: Badge attribution', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-001']);

    await page.goto('/');
    await loadTestSet(page, '99001');

    // Generate badge
    await page.click('.filter-header:has-text("Export")');
    await page.click('button:has-text("Generate Badge")');

    await page.waitForSelector('text=BrickTally Badge', { timeout: 5000 });

    // Check badge has bricktally.app attribution
    const badgeHtml = await page.locator('#badgeCode').inputValue();
    expect(badgeHtml).toContain('bricktally.app');
  });
});
