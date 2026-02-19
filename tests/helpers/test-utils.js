/**
 * Test utilities and helper functions
 */

import { convertMockSetToAPIResponse, convertPartsToAPIResponse, convertMinifogsToAPIResponse } from '../fixtures/mock-sets.js';

/**
 * Mock API responses for a given set
 * @param {Object} page - Playwright page object
 * @param {Object} mockSet - Raw mock set data from mock-sets.js
 * @param {Object} alternateVersion - Optional alternate version mock set (for multi-version testing)
 */
export async function mockAPIForSet(page, mockSet, alternateVersion = null) {
  // Convert mock data to API response format
  const apiSet = convertMockSetToAPIResponse(mockSet);
  const partsData = convertPartsToAPIResponse(mockSet.parts);
  const minifogsData = convertMinifogsToAPIResponse(mockSet.minifigs);

  // Convert alternate version if provided
  let altApiSet = null;
  let altPartsData = null;
  let altMinifogsData = null;
  if (alternateVersion) {
    // For alternate versions, we need to specify the version suffix (e.g., '99008-2')
    const baseNumber = alternateVersion.setNumber.split('-')[0];
    altApiSet = convertMockSetToAPIResponse(alternateVersion, `${baseNumber}-2`);
    altPartsData = convertPartsToAPIResponse(alternateVersion.parts);
    altMinifogsData = convertMinifogsToAPIResponse(alternateVersion.minifigs);
  }

  await page.route('**/api/rebrickable**', async (route) => {
    const url = route.request().url();
    const parsedUrl = new URL(url);
    const endpoint = parsedUrl.searchParams.get('endpoint');
    const search = parsedUrl.searchParams.get('search');

    // Handle version search requests (GET /lego/sets/?search=99008)
    if (endpoint && endpoint.includes('/lego/sets/') && search) {
      // Build results array based on available versions
      const results = [];

      // Add primary version
      results.push({
        set_num: apiSet.set_num,
        name: apiSet.name,
        year: apiSet.year,
        num_parts: apiSet.num_parts,
        set_img_url: apiSet.set_img_url
      });

      // Add alternate version if provided
      if (altApiSet) {
        results.push({
          set_num: altApiSet.set_num,
          name: altApiSet.name,
          year: altApiSet.year,
          num_parts: altApiSet.num_parts,
          set_img_url: altApiSet.set_img_url
        });
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ results: results })
      });
      return;
    }

    // Mock set details - /lego/sets/{set_num}/
    if (endpoint && endpoint.includes(`/lego/sets/${apiSet.set_num}/`) && !endpoint.includes('parts') && !endpoint.includes('minifigs')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(apiSet)
      });
      return;
    }

    // Handle alternate version details if provided
    if (altApiSet && endpoint && endpoint.includes(`/lego/sets/${altApiSet.set_num}/`) && !endpoint.includes('parts') && !endpoint.includes('minifigs')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(altApiSet)
      });
      return;
    }

    // Mock parts list - /lego/sets/{set_num}/parts/
    if (endpoint && endpoint.includes(`/lego/sets/${apiSet.set_num}/parts/`)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(partsData)
      });
      return;
    }

    // Handle alternate version parts if provided
    if (altApiSet && endpoint && endpoint.includes(`/lego/sets/${altApiSet.set_num}/parts/`)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(altPartsData)
      });
      return;
    }

    // Mock minifigs list - /lego/sets/{set_num}/minifigs/
    if (endpoint && endpoint.includes(`/lego/sets/${apiSet.set_num}/minifigs/`)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(minifogsData)
      });
      return;
    }

    // Handle alternate version minifigs if provided
    if (altApiSet && endpoint && endpoint.includes(`/lego/sets/${altApiSet.set_num}/minifigs/`)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(altMinifogsData)
      });
      return;
    }

    // Default: abort to fail fast if we're not handling this request
    await route.abort();
  });
}

/**
 * Mock API responses for a set with multiple versions
 * @param {Object} page - Playwright page object
 * @param {Object} primaryMockSet - Primary version mock set data
 * @param {Object} alternateMockSet - Alternate version mock set data
 */
export async function mockAPIForSetWithVersions(page, primaryMockSet, alternateMockSet) {
  await mockAPIForSet(page, primaryMockSet, alternateMockSet);
}

/**
 * Load a test set in the app
 */
export async function loadTestSet(page, setNumber) {
  // Change input type to text to allow hyphens in set numbers
  await page.locator('#setNumber').evaluate(el => {
    el.type = 'text';
  });

  // Set the value and press Enter to load
  await page.locator('#setNumber').fill(setNumber);
  await page.locator('#setNumber').press('Enter');

  // Wait for set to load
  await page.waitForSelector('#setInfo:not(.hide)', { timeout: 10000 });
}

/**
 * Get progress bar state
 */
export async function getProgressState(page) {
  const progressBar = page.locator('#progressBar');
  const percentage = await progressBar.getAttribute('data-percentage');
  const pieces = await progressBar.getAttribute('data-pieces');
  const width = await page.locator('#progressFill').evaluate((el) => el.style.width);

  return {
    percentage,
    pieces,
    width
  };
}

/**
 * Get collapsed header progress state
 */
export async function getCollapsedProgressState(page) {
  const progressBar = page.locator('#progressBarCollapsed');
  const percentage = await progressBar.getAttribute('data-percentage');
  const pieces = await progressBar.getAttribute('data-pieces');

  return {
    percentage,
    pieces
  };
}

/**
 * Increment a part count
 */
export async function incrementPart(page, partId) {
  await page.click(`#inc-${partId}`);
}

/**
 * Decrement a part count
 */
export async function decrementPart(page, partId) {
  await page.click(`#dec-${partId}`);
}

/**
 * Click quantity to fill
 */
export async function fillQuantity(page, partId) {
  await page.click(`#count-${partId} .qty-click`);
}

/**
 * Get current count for a part
 */
export async function getPartCount(page, partId) {
  const countText = await page.locator(`#count-${partId} .counted`).textContent();
  return parseInt(countText, 10);
}

/**
 * Check if fireworks animation is visible
 */
export async function isFireworksVisible(page) {
  const container = page.locator('#fireworksContainer');
  const display = await container.evaluate((el) => window.getComputedStyle(el).display);
  return display !== 'none';
}

/**
 * Wait for fireworks to appear
 */
export async function waitForFireworks(page, timeout = 5000) {
  await page.waitForFunction(
    () => {
      const el = document.getElementById('fireworksContainer');
      return el && window.getComputedStyle(el).display !== 'none';
    },
    { timeout }
  );
}

/**
 * Get localStorage value
 */
export async function getLocalStorage(page, key) {
  return await page.evaluate((storageKey) => {
    return localStorage.getItem(storageKey);
  }, key);
}

/**
 * Set localStorage value
 */
export async function setLocalStorage(page, key, value) {
  await page.evaluate(({ storageKey, storageValue }) => {
    localStorage.setItem(storageKey, storageValue);
  }, { storageKey: key, storageValue: value });
}

/**
 * Clear localStorage
 */
export async function clearLocalStorage(page) {
  await page.evaluate(() => {
    localStorage.clear();
  });
}

/**
 * Check if section is visible
 */
export async function isSectionVisible(page, sectionId) {
  const section = page.locator(`#${sectionId}`);
  const isHidden = await section.evaluate((el) => el.classList.contains('hide'));
  return !isHidden;
}

/**
 * Toggle hide complete
 * If state parameter provided, ensures that state (true = hide complete ON)
 */
export async function toggleHideComplete(page, desiredState) {
  if (desiredState !== undefined) {
    // Check current state (showCompleteParts = false means hide is ON)
    const currentShowCompleteParts = await page.evaluate(() => window.showCompleteParts);
    const currentHideComplete = !currentShowCompleteParts;

    // Only click if we need to change state
    if (currentHideComplete !== desiredState) {
      await page.click('#completeToggle');
    }
  } else {
    // Just toggle without checking
    await page.click('#completeToggle');
  }
}

/**
 * Get visible parts count in table
 */
export async function getVisiblePartsCount(page) {
  return await page.locator('#tableContainer table tr:not(.hidden)').count();
}

/**
 * Get visible minifigs count
 */
export async function getVisibleMinifogsCount(page) {
  return await page.locator('.minifig-card').evaluateAll(cards => {
    return cards.filter(card => {
      const style = window.getComputedStyle(card);
      return style.display !== 'none';
    }).length;
  });
}

/**
 * Check if part row is complete
 */
export async function isPartComplete(page, partId) {
  const incrementBtn = page.locator(`#inc-${partId}`);
  return await incrementBtn.evaluate((el) => el.classList.contains('complete'));
}

/**
 * Check if minifig is complete
 */
export async function isMinifigComplete(page, minifigId) {
  const card = page.locator(`#minifig-${minifigId}`);
  return await card.evaluate((el) => el.classList.contains('complete'));
}

/**
 * Get section header text
 */
export async function getSectionHeader(page, headerId) {
  return await page.locator(`#${headerId}`).textContent();
}

/**
 * Apply color filter
 */
export async function applyColorFilter(page, colorName) {
  // First, ensure the Colours dropdown is expanded
  const filterSection = page.locator('#colorFilterSection');
  const isVisible = await filterSection.evaluate((el) => {
    return window.getComputedStyle(el).display !== 'none';
  });

  if (!isVisible) {
    // Click the header to expand
    await page.click('.filter-header:has-text("Colours")');
    // Wait for section to expand
    await page.waitForTimeout(200);
  }

  // Now click the filter button inside the visible section
  await page.click('#colorFilterSection button.filter:has-text("' + colorName + '")');
}

/**
 * Click minifig card (not image)
 */
export async function clickMinifigCard(page, minifigId) {
  await page.click(`#minifig-${minifigId}`, { position: { x: 10, y: 10 } });
}

/**
 * Check if lightbox is open
 */
export async function isLightboxOpen(page) {
  const lightbox = page.locator('#lightbox');
  return await lightbox.evaluate((el) => el.classList.contains('active'));
}

/**
 * Wait for progress update (debounced)
 */
export async function waitForProgressUpdate(page) {
  await page.waitForTimeout(100);
}

/**
 * Export to BrickLink and get XML
 */
export async function exportToBrickLink(page) {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('button:has-text("Export to BrickLink")')
  ]);

  const path = await download.path();
  const fs = await import('fs');
  return fs.readFileSync(path, 'utf-8');
}

/**
 * Generate badge and get HTML
 */
export async function generateBadge(page) {
  // First, ensure the Export dropdown is expanded
  const exportSection = page.locator('#exportFilterSection');
  const isVisible = await exportSection.evaluate((el) => {
    return window.getComputedStyle(el).display !== 'none';
  });

  if (!isVisible) {
    // Click the header to expand
    await page.click('.filter-header:has-text("Export")');
    // Wait for section to expand
    await page.waitForTimeout(200);
  }

  await page.click('button:has-text("Generate Badge")');
  await page.waitForSelector('text=BrickTally Badge', { timeout: 5000 });
  return await page.locator('#badgeCode').inputValue();
}
