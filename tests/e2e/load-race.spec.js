import { test, expect } from '@playwright/test';
import {
  mockSets,
  convertMockSetToAPIResponse,
  convertPartsToAPIResponse,
  convertMinifogsToAPIResponse
} from '../fixtures/mock-sets.js';
import { loadTestSet } from '../helpers/test-utils.js';

/**
 * Responses for an abandoned set load must not be applied after the user
 * has moved on (back to history, or to another set).
 */

// Routes the API for several sets; parts for `holdPartsFor` wait until released
async function routeSets(page, sets, holdPartsFor) {
  let release;
  const released = new Promise(resolve => { release = resolve; });
  let heldRequestSeen;
  const heldRequest = new Promise(resolve => { heldRequestSeen = resolve; });

  const bySetNum = {};
  for (const mock of sets) {
    const api = convertMockSetToAPIResponse(mock);
    bySetNum[api.set_num] = {
      set: api,
      parts: convertPartsToAPIResponse(mock.parts),
      minifigs: convertMinifogsToAPIResponse(mock.minifigs)
    };
  }

  await page.route('**/api/rebrickable**', async (route) => {
    const url = new URL(route.request().url());
    const endpoint = url.searchParams.get('endpoint') || '';
    const json = body => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

    const search = url.searchParams.get('search');
    if (search) {
      const results = Object.values(bySetNum)
        .filter(s => s.set.set_num.startsWith(search + '-'))
        .map(s => s.set);
      return json({ results });
    }

    const match = endpoint.match(/^\/lego\/sets\/([^/]+)\/(parts\/|minifigs\/)?$/);
    const entry = match && bySetNum[match[1]];
    if (!entry) return route.abort();

    if (match[2] === 'parts/') {
      if (match[1] === holdPartsFor) {
        heldRequestSeen();
        await released;
      }
      return json(entry.parts);
    }
    if (match[2] === 'minifigs/') return json(entry.minifigs);
    return json(entry.set);
  });

  return { release, heldRequest };
}

async function startLoad(page, setNumber) {
  await page.locator('#setNumber').evaluate(el => { el.type = 'text'; });
  await page.locator('#setNumber').fill(setNumber);
  await page.locator('#setNumber').press('Enter');
}

test.describe('Set load race conditions', () => {
  test('late parts for an abandoned set do not replace the newly loaded set', async ({ page }) => {
    const setA = mockSets['TEST-001']; // 3 parts, no minifigs
    const setB = mockSets['TEST-002']; // 2 parts, 2 minifigs
    const { release, heldRequest } = await routeSets(page, [setA, setB], '99001-1');

    await page.goto('/');
    await startLoad(page, '99001');
    await heldRequest;

    // User gives up on A and loads B
    await page.click('h1 a');
    await loadTestSet(page, '99002');
    await expect(page.locator('#partsTable tbody tr, #tableContainer tbody tr').first()).toBeVisible();
    await expect(page.locator('.minifig-card')).toHaveCount(2);

    // A's parts finally arrive
    release();
    await page.waitForTimeout(500);

    await expect(page.locator('#setNumberDisplay, #setInfo')).toContainText(setB.setName);
    await expect(page.locator('.minifig-card')).toHaveCount(2);
    const partNames = await page.evaluate(() => partsData.map(p => p.name));
    expect(partNames).toEqual(['Brick 2x4', 'Brick 1x2', 'Police Officer', 'Firefighter']);
    expect(await page.evaluate(() => localStorage.getItem('currentSetNumber'))).toBe('99002-1');
  });

  test('late parts for an abandoned set do not cover the set history', async ({ page }) => {
    const setA = mockSets['TEST-001'];
    const { release, heldRequest } = await routeSets(page, [setA], '99001-1');

    await page.goto('/');
    await startLoad(page, '99001');
    await heldRequest;

    await page.click('h1 a');
    release();
    await page.waitForTimeout(500);

    await expect(page.locator('#setInfo')).toBeHidden();
    await expect(page.locator('#statsSection')).toBeHidden();
    expect(await page.evaluate(() => partsData.length)).toBe(0);
    expect(await page.evaluate(() => document.body.classList.contains('has-set'))).toBe(false);
  });
});
