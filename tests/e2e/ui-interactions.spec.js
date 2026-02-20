import { test, expect } from '@playwright/test';
import { mockSets } from '../fixtures/mock-sets.js';
import {
  mockAPIForSet,
  loadTestSet,
  incrementPart,
  decrementPart,
  fillQuantity,
  toggleHideComplete,
  getVisiblePartsCount,
  getVisibleMinifogsCount,
  getSectionHeader,
  applyColorFilter,
  isLightboxOpen,
  isSectionVisible,
  waitForProgressUpdate
} from '../helpers/test-utils.js';

test.describe('Category 4: Spare Parts Section', () => {
  test('4.1: Spare parts visibility - hidden when no spares', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-001']);

    await page.goto('/');
    await loadTestSet(page, '99001');

    // Spare parts section should be hidden
    const isVisible = await isSectionVisible(page, 'sparePartsSection');
    expect(isVisible).toBe(false);
  });

  test('4.2: Spare parts checkmark when complete', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-003']);

    await page.goto('/');
    await loadTestSet(page, '99003');

    // Turn on hide complete
    await toggleHideComplete(page, true);

    // Complete all spare parts
    const spareParts = await page.locator('#spareTableContainer table tr[id^="row-"]').all();
    for (const sparePart of spareParts) {
      const rowId = await sparePart.getAttribute('id');
      const partId = rowId.replace('row-', '');
      await fillQuantity(page, parseInt(partId));
    }

    await waitForProgressUpdate(page);

    // Check header has checkmark
    const header = await getSectionHeader(page, 'sparePartsHeader');
    expect(header).toContain('✓');
    expect(header).toContain('Spare Parts');
  });

  test('4.3: Spare parts header without checkmark when incomplete', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-003']);

    await page.goto('/');
    await loadTestSet(page, '99003');

    // Turn on hide complete
    await toggleHideComplete(page, true);

    // Don't complete spare parts

    const header = await getSectionHeader(page, 'sparePartsHeader');
    expect(header).not.toContain('✓');
    expect(header).toBe('Spare Parts');
  });

  test('4.4: Regular part row not marked complete when spare makes up the count', async ({ page }) => {
    // TEST-003: part 0 = Red Brick 2x4 qty 5, spare 3 = same part qty 2
    await mockAPIForSet(page, mockSets['TEST-003']);

    await page.goto('/');
    await loadTestSet(page, '99003');

    // Increment regular part to 3/5
    await incrementPart(page, 0);
    await incrementPart(page, 0);
    await incrementPart(page, 0);

    // Complete the spare (2/2) — this should NOT make the regular row show complete
    await fillQuantity(page, 3);

    // Regular part increment button should NOT be complete (3+2=5 combined, but only 3/5 own)
    const incrementBtn = page.locator('#inc-0');
    await expect(incrementBtn).not.toHaveClass(/complete/);
    await expect(incrementBtn).not.toBeDisabled();
  });

  test('4.5: Regular part still incrementable after decrementing with full spare count', async ({ page }) => {
    // TEST-003: part 0 = Red Brick 2x4 qty 5, spare 3 = same part qty 2
    await mockAPIForSet(page, mockSets['TEST-003']);

    await page.goto('/');
    await loadTestSet(page, '99003');

    // Turn off hide complete so completed rows stay visible
    await toggleHideComplete(page, false);

    // Complete both regular (5/5) and spare (2/2)
    await fillQuantity(page, 0);
    await fillQuantity(page, 3);

    // Decrement regular by one (now 4/5)
    await decrementPart(page, 0);

    // Regular row should NOT be complete — own count is 4/5
    const incrementBtn = page.locator('#inc-0');
    await expect(incrementBtn).not.toHaveClass(/complete/);
    await expect(incrementBtn).not.toBeDisabled();

    // Button should show checkmark (one piece remaining)
    const btnText = await incrementBtn.textContent();
    expect(btnText).toBe('✓');
  });
});

test.describe('Category 5: Section Headers & Hide Complete', () => {
  test('5.1: Parts header checkmark when complete', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-002']);

    await page.goto('/');
    await loadTestSet(page, '99002');

    // Turn on hide complete (true = hide is ON)
    await toggleHideComplete(page, true);

    // Complete all parts
    await fillQuantity(page, 0);
    await fillQuantity(page, 1);

    await waitForProgressUpdate(page);

    // Check header has green checkmark
    const header = await getSectionHeader(page, 'partsHeader');
    expect(header).toContain('✓');
    expect(header).toContain('Parts');
  });

  test('5.2: Parts header without checkmark when incomplete', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-002']);

    await page.goto('/');
    await loadTestSet(page, '99002');

    // Turn on hide complete
    await toggleHideComplete(page, true);

    // Complete only some parts
    await fillQuantity(page, 0);

    await waitForProgressUpdate(page);

    const header = await getSectionHeader(page, 'partsHeader');
    expect(header).not.toContain('✓');
  });

  test('5.3: Minifigs header checkmark when complete', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-002']);

    await page.goto('/');
    await loadTestSet(page, '99002');

    // Turn on hide complete
    await toggleHideComplete(page, true);

    // Complete all minifigs
    await page.click('#minifig-2 .minifig-name');
    await page.click('#minifig-3 .minifig-name');

    await waitForProgressUpdate(page);

    const header = await getSectionHeader(page, 'minifigHeader');
    expect(header).toContain('✓');
  });

  test('5.4: Hide complete toggle - parts', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-002']);

    await page.goto('/');
    await loadTestSet(page, '99002');

    // Complete first part (5 pieces)
    await fillQuantity(page, 0);

    // Get initial visible count (should be 2 parts for TEST-002)
    const initialCount = await page.locator('#tableContainer table tbody tr').count();
    expect(initialCount).toBe(2);

    // Turn on hide complete
    await toggleHideComplete(page, true);

    // Should hide the completed part
    const visibleCount = await page.locator('#tableContainer table tbody tr:not(.hidden)').count();
    expect(visibleCount).toBe(1); // 1 incomplete part visible
  });

  test('5.5: Hide complete toggle - minifigs', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-002']);

    await page.goto('/');
    await loadTestSet(page, '99002');

    // Complete 1 minifig
    await page.click('#minifig-2 .minifig-name');

    // Turn on hide complete
    await toggleHideComplete(page, true);

    // Should hide the completed minifig (check for display: none)
    const visibleMinifigs = await page.locator('.minifig-card').evaluateAll(cards => {
      return cards.filter(card => {
        const style = window.getComputedStyle(card);
        return style.display !== 'none';
      }).length;
    });
    expect(visibleMinifigs).toBe(1); // 1 incomplete minifig visible
  });

  test('5.6: Hide complete toggle on parts header for sets without minifigures', async ({ page }) => {
    // TEST-001 has no minifigures
    await mockAPIForSet(page, mockSets['TEST-001']);

    await page.goto('/');
    await loadTestSet(page, '99001');

    // Minifig section should be hidden
    await expect(page.locator('#minifigSection')).toHaveClass(/hide/);

    // Toggle should be visible and inside the parts section
    await expect(page.locator('#completeToggle')).toBeVisible();
    await expect(page.locator('#partsSection #completeToggle')).toBeVisible();
  });

  test('5.9: Hide complete toggle on minifig header when set has minifigures', async ({ page }) => {
    // TEST-002 has minifigures
    await mockAPIForSet(page, mockSets['TEST-002']);

    await page.goto('/');
    await loadTestSet(page, '99002');

    // Minifig section should be visible
    await expect(page.locator('#minifigSection')).not.toHaveClass(/hide/);

    // Toggle should be visible and inside the minifig section
    await expect(page.locator('#completeToggle')).toBeVisible();
    await expect(page.locator('#minifigSection #completeToggle')).toBeVisible();
  });

  test('5.7: Hide complete toggle works for parts-only sets', async ({ page }) => {
    // TEST-001 has no minifigures, only parts
    await mockAPIForSet(page, mockSets['TEST-001']);

    await page.goto('/');
    await loadTestSet(page, '99001');

    // First turn off hide complete (it's ON by default)
    await page.click('#completeToggle');

    // Complete first part
    await fillQuantity(page, 0);

    // All 3 parts should be visible (hide complete is OFF)
    const initialCount = await page.locator('#tableContainer table tbody tr:not(.hidden)').count();
    expect(initialCount).toBe(3);

    // Click toggle again to turn hide complete ON
    await page.click('#completeToggle');

    // Should hide the completed part
    const visibleCount = await page.locator('#tableContainer table tbody tr:not(.hidden)').count();
    expect(visibleCount).toBe(2);
  });

  test('5.8: Hide complete toggle visible in collapsed header when scrolling', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-001']);

    await page.goto('/');
    // Use a small viewport so the progress bar scrolls out of view
    await page.setViewportSize({ width: 375, height: 300 });
    await loadTestSet(page, '99001');

    // Scroll to bottom of page
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
      window.dispatchEvent(new Event('scroll'));
    });
    await expect(page.locator('#collapsedHeader')).toHaveClass(/visible/, { timeout: 5000 });

    // Hide-complete toggle should be in the collapsed header
    await expect(page.locator('#collapsedHeader #completeToggleCollapsed')).toBeVisible();
  });
});

test.describe('Category 7: Count Controls', () => {
  test('7.1: Decrement button hidden at zero', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-001']);

    await page.goto('/');
    await loadTestSet(page, '99001');

    // Check decrement button is not visible
    const decrementBtn = page.locator('#dec-0');
    await expect(decrementBtn).toBeHidden();
  });

  test('7.6: Decrement button preserves layout space when hidden', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-001']);

    await page.goto('/');
    await loadTestSet(page, '99001');

    // Get the row width before incrementing
    const rowBefore = await page.locator('#row-0 .controls').boundingBox();

    // Increment to show decrement button
    await incrementPart(page, 0);

    // Get the row width after
    const rowAfter = await page.locator('#row-0 .controls').boundingBox();

    // Layout should not shift — controls width should be the same
    expect(rowAfter.width).toBe(rowBefore.width);
  });

  test('7.2: Decrement button appears after increment', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-001']);

    await page.goto('/');
    await loadTestSet(page, '99001');

    // Increment to 1
    await incrementPart(page, 0);

    // Check decrement button is visible
    const decrementBtn = page.locator('#dec-0');
    await expect(decrementBtn).toBeVisible();
  });

  test('7.3: Increment to quantity shows checkmark', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-001']);

    await page.goto('/');
    await loadTestSet(page, '99001');

    // Fill to quantity
    await fillQuantity(page, 0);

    // Check increment button has complete class
    const incrementBtn = page.locator('#inc-0');
    await expect(incrementBtn).toHaveClass(/complete/);

    // Button should show checkmark
    const btnText = await incrementBtn.textContent();
    expect(btnText).toBe('✓');
  });

  test('7.4: Fill quantity click', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-001']);

    await page.goto('/');
    await loadTestSet(page, '99001');

    // Increment a few times
    await incrementPart(page, 0);
    await incrementPart(page, 0);
    await incrementPart(page, 0);

    // Count should be 3
    let count = await page.locator('#count-0 .counted').textContent();
    expect(count).toBe('3');

    // Click quantity to fill (should jump to 5)
    await fillQuantity(page, 0);

    // Count should now be 5
    count = await page.locator('#count-0 .counted').textContent();
    expect(count).toBe('5');
  });

  test('7.5: Increment button shows checkmark when one piece remaining', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-001']);

    await page.goto('/');
    await loadTestSet(page, '99001');

    // Part 0 has quantity 5, increment to 4 (one remaining)
    await incrementPart(page, 0);
    await incrementPart(page, 0);
    await incrementPart(page, 0);
    await incrementPart(page, 0);

    const count = await page.locator('#count-0 .counted').textContent();
    expect(count).toBe('4');

    // Button should show checkmark (not +) since next click completes it
    const incrementBtn = page.locator('#inc-0');
    const btnText = await incrementBtn.textContent();
    expect(btnText).toBe('✓');

    // But it should NOT have the complete class yet
    await expect(incrementBtn).not.toHaveClass(/complete/);
  });
});

test.describe('Category 11: Color Filters', () => {
  test('11.1: Single color filter', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-007']);

    await page.goto('/');
    await loadTestSet(page, '99007');

    // Get initial visible count (should be 3 different colors)
    const initialCount = await page.locator('#tableContainer table tbody tr:not(.hidden)').count();
    expect(initialCount).toBe(3);

    // Apply Red filter
    await applyColorFilter(page, 'Red');

    // Should only show red parts
    const visibleCount = await page.locator('#tableContainer table tbody tr:not(.hidden)').count();
    expect(visibleCount).toBe(1);
  });

  test('11.2: Multiple color filters', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-007']);

    await page.goto('/');
    await loadTestSet(page, '99007');

    // Apply Red and Blue filters
    await applyColorFilter(page, 'Red');
    await applyColorFilter(page, 'Blue');

    // Should show red + blue parts (2 parts)
    const visibleCount = await page.locator('#tableContainer table tbody tr:not(.hidden)').count();
    expect(visibleCount).toBe(2);
  });

  test('11.3: Clear all filters', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-007']);

    await page.goto('/');
    await loadTestSet(page, '99007');

    // Apply filter
    await applyColorFilter(page, 'Red');

    // Deselect filter
    await applyColorFilter(page, 'Red');

    // Should show all parts again
    const visibleCount = await page.locator('#tableContainer table tbody tr:not(.hidden)').count();
    expect(visibleCount).toBe(3);
  });

  test("11.4: Filters don't affect minifigs", async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-002']);

    await page.goto('/');
    await loadTestSet(page, '99002');

    // Get minifig count before filter
    const initialMinifigCount = await page.locator('.minifig-card').count();

    // Apply color filter to parts
    await applyColorFilter(page, 'Red');

    // Minifig count should be unchanged
    const afterMinifigCount = await page.locator('.minifig-card').count();
    expect(afterMinifigCount).toBe(initialMinifigCount);
  });
});

test.describe('Category 12: Lightbox', () => {
  test('12.1: Open lightbox - part image', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-001']);

    await page.goto('/');
    await loadTestSet(page, '99001');

    // Wait for images to load and event listeners to attach
    await page.waitForTimeout(500);

    // Click part image
    await page.click('.part-image');

    // Wait for lightbox animation
    await page.waitForTimeout(100);

    // Lightbox should be open
    const lightboxActive = await page.locator('#lightbox').evaluate((el) => el.classList.contains('active'));
    expect(lightboxActive).toBe(true);
  });

  test('12.2: Open lightbox - minifig image', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-002']);

    await page.goto('/');
    await loadTestSet(page, '99002');

    // Wait for images to load
    await page.waitForTimeout(500);

    // Click minifig image (not the card)
    await page.click('.minifig-image');

    // Wait for lightbox animation
    await page.waitForTimeout(100);

    // Lightbox should be open
    const lightboxActive = await page.locator('#lightbox').evaluate((el) => el.classList.contains('active'));
    expect(lightboxActive).toBe(true);
  });

  test('12.3: Close lightbox', async ({ page }) => {
    await mockAPIForSet(page, mockSets['TEST-001']);

    await page.goto('/');
    await loadTestSet(page, '99001');

    // Open lightbox
    await page.click('.part-image');

    // Close lightbox
    await page.click('#lightboxClose');

    // Lightbox should be closed
    const lightboxActive = await page.locator('#lightbox').evaluate((el) => el.classList.contains('active'));
    expect(lightboxActive).toBe(false);
  });
});
