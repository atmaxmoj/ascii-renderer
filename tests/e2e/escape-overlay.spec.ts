import { test, expect } from '@playwright/test';

test.describe('Escape Overlay', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tests/e2e/fixtures/escape-overlay.html');
    // Wait for renderer to finish initial render
    await page.waitForFunction(() => !!(window as any).__renderer);
    // Give one extra frame for overlay positioning
    await page.waitForTimeout(100);
  });

  test('escaped elements render as visible native HTML on the page', async ({ page }) => {
    // The escaped text should be visible as a real DOM element in the overlay
    const escapedText = page.locator('#escaped-text');
    await expect(escapedText).toBeVisible();
    await expect(escapedText).toHaveText('Native escaped text');

    const escapedBtn = page.locator('#escaped-btn');
    await expect(escapedBtn).toBeVisible();
    await expect(escapedBtn).toHaveText('Native Button');

    const escapedInput = page.locator('#escaped-input');
    await expect(escapedInput).toBeVisible();
    await expect(escapedInput).toHaveValue('Native input');
  });

  test('escaped elements are positioned inside the overlay div', async ({ page }) => {
    // The escape overlay should exist as a direct child of the target
    const overlay = page.locator('#target > div[style*="pointer-events: none"]');
    await expect(overlay).toBeAttached();

    // The escaped block wrapper should be absolutely positioned inside the overlay
    const wrapper = overlay.locator('> div');
    await expect(wrapper).toHaveCSS('position', 'absolute');

    // The escaped element should be inside the wrapper
    const escapedBlock = overlay.locator('#escaped-block');
    await expect(escapedBlock).toBeAttached();
  });

  test('ASCII content is rendered on the canvas (not blank)', async ({ page }) => {
    // Get the text export — ASCII paragraphs should appear, escaped content should not
    const text = await page.evaluate(() => (window as any).__renderer.toText());
    expect(text).toContain('ASCII paragraph above');
    expect(text).toContain('ASCII paragraph below');
    // Escaped block content should NOT appear in ASCII output
    expect(text).not.toContain('Native escaped text');
    expect(text).not.toContain('Native Button');
  });

  test('escaped native input is interactive', async ({ page }) => {
    const input = page.locator('#escaped-input');
    await input.click();
    await input.fill('Hello from Playwright');
    await expect(input).toHaveValue('Hello from Playwright');
  });

  test('escaped native button is clickable', async ({ page }) => {
    // Add a click listener via evaluate, then click
    await page.evaluate(() => {
      const btn = document.getElementById('escaped-btn')!;
      (btn as any).__clicked = false;
      btn.addEventListener('click', () => { (btn as any).__clicked = true; });
    });

    await page.locator('#escaped-btn').click();

    const clicked = await page.evaluate(() => (document.getElementById('escaped-btn') as any).__clicked);
    expect(clicked).toBe(true);
  });

  test('re-render preserves escaped element state', async ({ page }) => {
    // Type into the native input
    const input = page.locator('#escaped-input');
    await input.click();
    await input.fill('Persistent value');

    // Force a re-render
    await page.evaluate(() => (window as any).__renderer.render());
    await page.waitForTimeout(100);

    // The input value should survive the re-render
    await expect(input).toHaveValue('Persistent value');
    // And it should still be visible
    await expect(input).toBeVisible();
  });

  test('overlay does not block canvas mouse events in non-escaped areas', async ({ page }) => {
    // The overlay has pointer-events:none, so clicking on the canvas area
    // (non-escaped) should still work. Verify canvas receives focus.
    const canvas = page.locator('#target canvas');
    await canvas.click({ position: { x: 10, y: 10 } });
    // Canvas should be the active element (it has tabindex)
    const tagName = await page.evaluate(() => document.activeElement?.tagName);
    expect(tagName).toBe('CANVAS');
  });
});
