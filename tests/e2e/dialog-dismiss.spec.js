import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => { await page.goto('/de/'); });

test('badge canvas translates catalog colors while preserving catalog data and inventory keys', async ({ page }) => {
  await page.evaluate(() => {
    window.badgeText = [];
    const draw = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, ...args) {
      window.badgeText.push(text);
      return draw.call(this, text, ...args);
    };
  });
  await page.locator('[data-i18n="landing.featureBadge"]').click();
  await expect(page.locator('#badgeExamplesDialog figure')).toHaveCount(2);
  const text = await page.evaluate(() => window.badgeText);
  expect(text).toContain('Rot');
  expect(text).not.toContain('Red');
  expect(await page.evaluate(() => [colorLabel('Light Bluish Gray'), colorLabel('Unknown Catalog Color'),
    getPartKey({ type: 'part', partNum: '3004', color: 'Red' })])).toEqual(['Hellblaugrau', 'Unknown Catalog Color', '3004_Red']);
});

for (const fallback of [false, true]) {
  test(`native dialogs dismiss outside, ignore inside clicks and restore focus (${fallback ? 'fallback' : 'native'})`, async ({ page }) => {
    const opener = page.locator('[data-i18n="landing.featurePwa"]');
    await opener.click();
    const dialog = page.locator('#installHelpDialog');
    await expect(dialog).toHaveAttribute('closedby', 'any');
    await expect(dialog.getByRole('button', { name: 'Schließen' })).toHaveCount(0);
    if (fallback) await dialog.evaluate(node => node.setAttribute('closedby', 'closerequest'));
    await dialog.locator('h2').click();
    await expect(dialog).toBeVisible();
    // Starting in the dialog and releasing outside must not dismiss it.
    const box = await dialog.boundingBox();
    await page.mouse.move(box.x + 30, box.y + 30);
    await page.mouse.down(); await page.mouse.move(5, 5); await page.mouse.up();
    await expect(dialog).toBeVisible();
    await page.mouse.click(5, 5);
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
    await opener.click(); await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });
}

for (const kind of ['restore', 'delete', 'versions', 'badge', 'whats-new', 'memory']) {
  test(`${kind} dialog supports light dismiss and Escape without running an action`, async ({ page }) => {
    async function open() {
      await page.evaluate(kind => {
        const original = document.activeElement;
        window.openerBeforeDialog = original;
        if (kind === 'restore') showRestoreDialog({ sets: [] });
        if (kind === 'delete') {
          saveSetData('31109-1', { number: '31109', fullNumber: '31109-1', name: 'Pirate Ship', numParts: 1260 });
          deleteSetHistory({ stopPropagation() {} }, '31109-1');
        }
        if (kind === 'versions') showVersionSelector([]);
        if (kind === 'badge') showBadgeModal('/assets/examples/31109-1.jpg', { setName: 'Pirate Ship', setNumber: '31109', totalPieces: 1260, completedPieces: 1258 });
        if (kind === 'whats-new') buildWhatsNewModal('1.41.20', []);
        if (kind === 'memory') {
          partsData = Array.from({ length: 8 }, (_, id) => ({ id, type: 'part', imageUrl: '/assets/favicon.svg?' + id, quantity: 1 }));
          startMemoryGame();
        }
      }, kind);
    }
    await open();
    const overlay = page.locator('[data-light-dismiss]:visible').last();
    await expect(overlay).toBeVisible();
    await page.mouse.click(5, 5);
    await expect(page.locator('[data-light-dismiss]:visible')).toHaveCount(0);
    if (kind === 'restore') expect(await page.evaluate(() => pendingRestoreData)).toBeNull();
    if (kind === 'delete') expect(await page.evaluate(() => getSetData('31109-1').name)).toBe('Pirate Ship');
    await open(); await page.keyboard.press('Escape');
    await expect(page.locator('[data-light-dismiss]:visible')).toHaveCount(0);
  });
}

test('Escape only dismisses the topmost dialog', async ({ page }) => {
  await page.evaluate(() => showVersionSelector([]));
  await page.evaluate(() => showInstallHelp());
  await page.keyboard.press('Escape');
  await expect(page.locator('#installHelpDialog')).toHaveCount(0);
  await expect(page.locator('.version-selector-overlay')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.version-selector-overlay')).toHaveCount(0);
});

test('keyboard focus stays in custom dialogs and returns to the opener on dismiss', async ({ page }) => {
  const opener = page.locator('[data-i18n="landing.featurePwa"]');
  await opener.focus();
  await page.evaluate(() => showVersionSelector([]));
  const heading = page.locator('.version-selector-overlay h2');
  await expect(heading).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(heading).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(heading).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(opener).toBeFocused();
});

test.describe('mobile touch', () => {
  test.use({ hasTouch: true, viewport: { width: 452, height: 1244 } });
  test('tapping controls keeps the dialog open; tapping outside dismisses it', async ({ page }) => {
    await page.locator('[data-i18n="landing.featurePwa"]').tap();
    await page.locator('.install-platforms label').nth(1).tap();
    await expect(page.locator('#installHelpDialog')).toBeVisible();
    await page.touchscreen.tap(5, 5);
    await expect(page.locator('#installHelpDialog')).toHaveCount(0);
  });
});
