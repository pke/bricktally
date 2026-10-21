import { test, expect } from '@playwright/test';
import { mockSets } from '../fixtures/mock-sets.js';
import { mockAPIForSet, loadTestSet } from '../helpers/test-utils.js';

async function pinch(page, from, to) {
  return page.locator('#colorZoomSection').evaluate((element, { from, to }) => {
    const rect = element.getBoundingClientRect();
    const center = { x: rect.left + rect.width / 2, y: Math.max(160, rect.top + 30) };
    function dispatch(type, spread) {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'touches', { value: spread === null ? [] : [
        { identifier: 1, clientX: center.x - spread / 2, clientY: center.y },
        { identifier: 2, clientX: center.x + spread / 2, clientY: center.y }
      ] });
      element.dispatchEvent(event);
      return event.defaultPrevented;
    }
    const prevented = dispatch('touchstart', from);
    dispatch('touchmove', to);
    dispatch('touchend', null);
    return prevented;
  }, { from, to });
}

test.beforeEach(async ({ page }) => {
  const fixture = mockSets['TEST-001'];
  await mockAPIForSet(page, {
    ...fixture,
    parts: fixture.parts.map(part => ({ ...part, part: { ...part.part, part_img_url: part.part_img_url } }))
  });
  await page.route('https://cdn.rebrickable.com/**', route => {
    const color = route.request().url().includes('300121') ? '#bc3838'
      : route.request().url().includes('300526') ? '#389654' : '#386abc';
    return route.fulfill({
      contentType: 'image/svg+xml',
      body: `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><path fill="${color}" d="M10 30h60v35H10z"/><path fill="${color}" opacity=".6" d="M10 30l15-15h45v15z"/></svg>`
    });
  });
  await page.goto('/');
  await loadTestSet(page, '99001');
});

test('overview has one real example per colour in alphabetical order', async ({ page }, testInfo) => {
  await expect(page.locator('#colorFilterSection, #colorFilterCollapsed')).toHaveCount(0);
  await page.locator('#colorZoomOut').click();
  await expect(page.locator('.color-tile span')).toHaveText(['Blue', 'Green', 'Red']);
  await expect(page.locator('.color-tile img')).toHaveCount(3);
  await expect(page.locator('.color-tile[data-color="Red"] img')).toHaveAttribute('src', /300121/);
  await expect(page.locator('#tableContainer')).toBeHidden();
  await expect(page.locator('#partsSection')).toBeHidden();
  await page.screenshot({ path: testInfo.outputPath('color-overview.png'), fullPage: true });
});

test('touch pinches switch levels once and preserve counts', async ({ page }) => {
  await page.locator('#inc-0').click();
  expect(await pinch(page, 200, 150)).toBe(true);
  await expect(page.locator('#colorOverview')).toBeVisible();
  await pinch(page, 100, 130);
  await expect(page.locator('#colorOverview')).toBeHidden();
  await expect(page.locator('#count-0 .counted')).toHaveText('1');
});

test('browser touch input opens the overview and allows a subsequent tap', async ({ page, browserName, isMobile }) => {
  test.skip(browserName !== 'chromium' || !isMobile, 'Uses Chromium mobile touch input');
  await page.locator('#colorZoomSection').scrollIntoViewIfNeeded();
  const box = await page.locator('#colorZoomSection').boundingBox();
  const x = box.x + box.width / 2;
  const y = box.y + 25;
  const session = await page.context().newCDPSession(page);
  const points = spread => [
    { x: x - spread / 2, y, id: 1 },
    { x: x + spread / 2, y, id: 2 }
  ];
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points(160) });
  await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: points(110) });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.locator('#colorOverview')).toBeVisible();
  // Wait for the deliberate post-pinch click guard, then use a real touch tap.
  await page.waitForTimeout(450);
  await page.locator('.color-tile[data-color="Blue"]').tap();
  await expect(page.locator('#colorOverview')).toBeHidden();
  await expect(page.locator('#colorZoomStatus')).toHaveText('Blue');
});

test('small touches and ordinary wheel scrolling do not change the level', async ({ page }) => {
  await pinch(page, 200, 190);
  await expect(page.locator('#colorOverview')).toBeHidden();
  const prevented = await page.locator('#colorZoomSection').evaluate(el => {
    const e = new WheelEvent('wheel', { deltaY: 90, bubbles: true, cancelable: true });
    el.dispatchEvent(e);
    return e.defaultPrevented;
  });
  expect(prevented).toBe(false);
  await expect(page.locator('#colorOverview')).toBeHidden();
});

test('trackpad pinch is scoped to the editor and locks until the gesture ends', async ({ page }) => {
  await page.locator('#colorZoomSection').evaluate(el => {
    for (const deltaY of [12, 14, -100]) {
      el.dispatchEvent(new WheelEvent('wheel', { deltaY, ctrlKey: true, bubbles: true, cancelable: true }));
    }
  });
  await expect(page.locator('#colorOverview')).toBeVisible();
  const prevented = await page.locator('#setNumber').evaluate(el => {
    const e = new WheelEvent('wheel', { deltaY: 100, ctrlKey: true, bubbles: true, cancelable: true });
    el.dispatchEvent(e);
    return e.defaultPrevented;
  });
  expect(prevented).toBe(false);
});

test('Safari trackpad gestures switch both levels', async ({ page }) => {
  async function gesture(scale) {
    await page.locator('#colorZoomSection').evaluate((el, scale) => {
      for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
        const event = new Event(type, { bubbles: true, cancelable: true });
        Object.defineProperties(event, { scale: { value: scale }, clientX: { value: 0 }, clientY: { value: 0 } });
        el.dispatchEvent(event);
      }
    }, scale);
  }
  await gesture(0.8);
  await expect(page.locator('#colorOverview')).toBeVisible();
  await gesture(1.2);
  await expect(page.locator('#colorOverview')).toBeHidden();
});

test('keyboard selection filters parts and all colours restores them', async ({ page }) => {
  await page.locator('#colorZoomOut').click();
  const tile = page.locator('.color-tile[data-color="Red"]');
  await tile.focus();
  await tile.press('Enter');
  await expect(page.locator('#colorOverview')).toBeHidden();
  await expect(page.locator('#colorZoomOut')).toBeFocused();
  await expect(page.locator('#tableContainer tr:visible')).toHaveCount(1);
  await expect(page.locator('#colorZoomStatus')).toHaveText('Red');
  await page.locator('#colorZoomAll').click();
  await expect(page.locator('#tableContainer tr:visible')).toHaveCount(3);
});

test('spare-only colours appear, and leaving or loading a set resets the overview', async ({ page }) => {
  await page.evaluate(() => {
    processParts([
      { part: { part_num: '1', name: 'Regular' }, color: { id: 1, name: 'Red' }, quantity: 1 },
      { part: { part_num: '2', name: 'Spare' }, color: { id: 2, name: 'Amber' }, quantity: 1, is_spare: true }
    ], []);
  });
  await page.locator('#colorZoomOut').click();
  await expect(page.locator('.color-tile span')).toHaveText(['Amber', 'Red']);
  await page.locator('.color-tile[data-color="Amber"]').click();
  await expect(page.locator('#spareTableContainer tr:visible')).toHaveCount(1);
  await page.locator('#colorZoomOut').click();
  await page.evaluate(() => goToSetHistory());
  await expect(page.locator('#colorZoomSection')).toBeHidden();
  await loadTestSet(page, '99001');
  await expect(page.locator('#colorOverview')).toBeHidden();
  await expect(page.locator('#tableContainer tr:visible')).toHaveCount(3);
});
