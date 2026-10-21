import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import pako from 'pako';
import { shareResult } from '../../js/missing-codec.js';

const example = JSON.parse(readFileSync(new URL('../../data/example-set.json', import.meta.url)));

function exampleLink(items = example.items) {
  return shareResult({ format: 'bricktally-missing', version: 1,
    set: { number: example.set.number, name: example.set.name },
    createdAt: '2026-10-15T12:00:00Z', items
  }, 'http://localhost:8080/de/', pako).url;
}

test('real catalog example separates piece and figure totals and displays catalog thumbnails', async ({ page }) => {
  const imageBytes = readFileSync(new URL('../../assets/examples/3004-red.jpg', import.meta.url));
  await page.route('**/api/image-proxy?**', route => route.fulfill({ body: imageBytes, contentType: 'image/jpeg' }));
  await page.goto(exampleLink());
  await expect(page.locator('.shared-set-name')).toHaveText('Pirate Ship');
  await expect(page.locator('.missing-share-summary')).toHaveText('9 fehlende Teile und 1 Figur');
  await expect(page.locator('#missingShareSection')).not.toContainText('Ein fester Stand');
  const images = page.locator('.missing-share-thumbnail img');
  await expect(images).toHaveCount(4);
  for (let index = 0; index < example.items.length; index++) {
    await expect(images.nth(index)).toHaveAttribute('src', '/api/image-proxy?url=' + encodeURIComponent('https://cdn.rebrickable.com' + example.items[index].image));
    await expect.poll(() => images.nth(index).evaluate(image => image.naturalWidth)).toBeGreaterThan(0);
  }
});

test('summary handles singular parts and plural figures; unavailable images retain readable rows', async ({ page }) => {
  await page.route('**/api/image-proxy?**', route => route.abort());
  await page.goto(exampleLink([{ ...example.items[0], quantity: 1 }, { ...example.items[3], quantity: 2 }]));
  await expect(page.locator('.missing-share-summary')).toHaveText('1 fehlendes Teil und 2 Figuren');
  await expect(page.locator('.missing-share-list li')).toHaveCount(2);
  await expect(page.locator('.missing-share-list strong').first()).toHaveText(example.items[0].name);
  await expect(page.locator('.missing-share-thumbnail img')).toHaveCount(0);
});

async function seedSeller(page, large = false) {
  await page.goto('/de/');
  await page.evaluate(large => {
    currentSetNumber = '99003-1';
    saveSetData(currentSetNumber, { number: '99003', fullNumber: currentSetNumber, name: 'Seller set',
      year: 2024, numParts: 10, notes: 'PRIVATE SELLER NOTES', progress: '' });
    const regular = { part: { part_num: '3001', name: 'Red brick' }, color: { id: 5, name: 'Red' }, quantity: 5 };
    const spare = { ...regular, quantity: 2, is_spare: true };
    const parts = large ? Array.from({ length: 250 }, (_, i) => ({
      part: { part_num: String(i + 1), name: crypto.randomUUID() + crypto.randomUUID() },
      color: { id: 0, name: 'Black' }, quantity: 1
    })) : [regular, spare];
    processParts(parts, large ? [] : [{ id: 77, set_num: 'fig-001234', set_name: 'Figure', quantity: 2 }]);
    if (!large) {
      userCounts['3001_Red'] = 1;
      userCounts['3001_Red_s'] = 2;
      userCounts.fig_77 = 1;
    }
  }, large);
}

test('buyer link is read-only, contains missing quantities and leaves personal sets untouched', async ({ page, context }) => {
  await seedSeller(page);
  await page.evaluate(() => shareMissingParts());
  const url = await page.locator('#missingShareLink').inputValue();
  expect(url.length).toBeLessThanOrEqual(2048);
  const buyer = await context.newPage();
  let requests = 0;
  await buyer.route('**/api/rebrickable**', route => { requests++; return route.abort(); });
  await buyer.goto(url);
  await expect(buyer.locator('#missingShareSection')).toBeVisible();
  await expect(buyer.locator('.missing-share-quantity')).toHaveText(['2 ×', '1 ×']);
  await expect(buyer.locator('#filterSection')).toBeHidden();
  await expect(buyer.locator('#setNumber')).toBeHidden();
  expect(requests).toBe(0);
  expect(await buyer.evaluate(() => getSetData('99003-1').notes)).toBe('PRIVATE SELLER NOTES');
});

test('oversized lists download a file which opens without restoring an inventory', async ({ page }) => {
  await seedSeller(page, true);
  const downloading = page.waitForEvent('download');
  await page.evaluate(() => shareMissingParts());
  const download = await downloading;
  expect(download.suggestedFilename()).toBe('bricktally-missing-99003-1.bricktally-missing.json');
  await expect(page.locator('#missingShareDialog')).toContainText('für einen Link zu groß');
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const payload = Buffer.concat(chunks);
  expect(payload.toString()).not.toContain('PRIVATE SELLER NOTES');
  await page.keyboard.press('Escape');
  const before = await page.evaluate(() => localStorage.getItem('set_99003-1'));
  await page.locator('#missingShareFile').setInputFiles({ name: download.suggestedFilename(), mimeType: 'application/json', buffer: payload });
  await expect(page.locator('.missing-share-list li')).toHaveCount(250);
  expect(await page.evaluate(() => localStorage.getItem('set_99003-1'))).toBe(before);
});

test('corrupt buyer links show an error without loading a saved set', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('currentSetNumber', '77777-1'));
  let requests = 0;
  await page.route('**/api/rebrickable**', route => { requests++; return route.abort(); });
  await page.goto('/de/#missing=bad-data');
  await expect(page.locator('#missingShareSection [role="alert"]')).toBeVisible();
  expect(requests).toBe(0);
  expect(await page.evaluate(() => localStorage.getItem('currentSetNumber'))).toBe('77777-1');
});
