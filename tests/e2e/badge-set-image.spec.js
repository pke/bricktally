import { test, expect } from '@playwright/test';
import { mockSets } from '../fixtures/mock-sets.js';
import { mockAPIForSet, loadTestSet, clearLocalStorage } from '../helpers/test-utils.js';

// 16x16 solid red PNG (r=220, g=20, b=20) — served as the set image so the
// badge's set-image box is detectable by pixel color
const RED_PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAFklEQVR4nGO4IyJCEmIY1TCqYfhqAAACcQQQFwFJQgAAAABJRU5ErkJggg==';

test.describe('Category 22: Badge Set Image', () => {

  test('22.1: Generated badge PNG contains the set image', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-001']);

    // The fixture's set image is /assets/favicon.svg — serve a solid red PNG
    // instead so the drawn set image is unambiguous in the badge pixels
    await page.route('**/assets/favicon.svg', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'image/png',
        body: Buffer.from(RED_PNG_B64, 'base64')
      })
    );

    await page.goto('/');
    await clearLocalStorage(page);
    await loadTestSet(page, '99001');

    // Expand the Export section and generate the badge
    const exportSection = page.locator('#exportFilterSection');
    if (!(await exportSection.evaluate((el) => el.open))) {
      await exportSection.locator('summary, .filter-header').first().click();
    }
    await page.click('button:has-text("Generate Badge")');

    const download = page.locator('#badgeDownload');
    await expect(download).toBeVisible({ timeout: 5000 });
    const dataUrl = await download.getAttribute('href');
    expect(dataUrl).toMatch(/^data:image\/png/);

    // Decode the badge PNG and count red pixels inside the set-image box
    // (box is at 10..110 CSS px, drawn at 2x scale → sample 40..200)
    const redPixels = await page.evaluate(async (url) => {
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(40, 40, 160, 160).data;
      let count = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] > 160 && data[i + 1] < 110 && data[i + 2] < 110) count++;
      }
      return count;
    }, dataUrl);

    expect(redPixels).toBeGreaterThan(100);
  });
});
