import { test, expect } from '@playwright/test';

test.describe('Category 14: Toggle Buttons', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to ensure clean state
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('14.1: Theme toggle switches to dark mode', async ({ page }) => {
    // Should start in light mode
    await expect(page.locator('body')).not.toHaveClass(/dark-mode/);

    // Icon should show moon (to switch to dark)
    await expect(page.locator('#themeIcon')).toHaveText('🌙');

    // Click the theme toggle
    await page.click('#themeToggle');

    // Should now be in dark mode
    await expect(page.locator('body')).toHaveClass(/dark-mode/);

    // Icon should show sun (to switch to light)
    await expect(page.locator('#themeIcon')).toHaveText('☀️');
  });

  test('14.2: Theme toggle switches back to light mode', async ({ page }) => {
    // Start in light mode, switch to dark
    await page.click('#themeToggle');
    await expect(page.locator('body')).toHaveClass(/dark-mode/);

    // Switch back to light
    await page.click('#themeToggle');
    await expect(page.locator('body')).not.toHaveClass(/dark-mode/);
    await expect(page.locator('#themeIcon')).toHaveText('🌙');
  });

  test('14.3: Theme preference persists in localStorage', async ({ page }) => {
    // Switch to dark mode
    await page.click('#themeToggle');
    await expect(page.locator('body')).toHaveClass(/dark-mode/);

    // Check localStorage
    const darkMode = await page.evaluate(() => localStorage.getItem('darkMode'));
    expect(darkMode).toBe('true');

    // Reload page
    await page.reload();

    // Should still be in dark mode
    await expect(page.locator('body')).toHaveClass(/dark-mode/);
  });

  test('14.4: Fullscreen toggle is clickable', async ({ page }) => {
    // We can't actually test fullscreen in headless mode,
    // but we can verify the button is clickable and doesn't error
    const fullscreenBtn = page.locator('#fullscreenToggle');
    await expect(fullscreenBtn).toBeVisible();

    // Click should not throw an error
    // Note: In headless mode, fullscreen API may not work, so we just verify click works
    await fullscreenBtn.click();

    // Button should still be visible after click
    await expect(fullscreenBtn).toBeVisible();
  });

  test('14.5: Theme toggle button is not covered by other elements', async ({ page }) => {
    const themeBtn = page.locator('#themeToggle');

    // Get the button's bounding box
    const box = await themeBtn.boundingBox();
    expect(box).not.toBeNull();

    // Get the center point of the button
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;

    // Check what element is at that point
    const elementAtPoint = await page.evaluate(({ x, y }) => {
      const el = document.elementFromPoint(x, y);
      // Return the element or its closest parent with an id
      return el?.id || el?.closest('[id]')?.id || el?.tagName;
    }, { x: centerX, y: centerY });

    // The element at the center should be the theme toggle or its child (themeIcon)
    expect(['themeToggle', 'themeIcon']).toContain(elementAtPoint);
  });

  test('14.6: Fullscreen toggle button is not covered by other elements', async ({ page }) => {
    const fullscreenBtn = page.locator('#fullscreenToggle');

    // Get the button's bounding box
    const box = await fullscreenBtn.boundingBox();
    expect(box).not.toBeNull();

    // Get the center point of the button
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;

    // Check what element is at that point
    const elementAtPoint = await page.evaluate(({ x, y }) => {
      const el = document.elementFromPoint(x, y);
      // Return the element or its closest parent with an id
      return el?.id || el?.closest('[id]')?.id || el?.tagName;
    }, { x: centerX, y: centerY });

    // The element at the center should be the fullscreen toggle or its child (fullscreenIcon)
    expect(['fullscreenToggle', 'fullscreenIcon']).toContain(elementAtPoint);
  });
});
