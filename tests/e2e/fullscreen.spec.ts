import { test, expect } from '@playwright/test';
import { waitReady, loadSample } from './_helpers';

/**
 * The fullscreen-takeover overlay (csv-viewer's pattern): once a diagram is
 * loaded, the entire editor is a position:fixed overlay that fills the
 * viewport — including in installed-PWA/standalone mode, where base.css caps
 * the body width (position:fixed is viewport-relative, so it escapes that).
 *
 * Closing differs from csv-viewer deliberately: csv-viewer's Escape discards
 * the file outright because a read-only viewer has nothing to lose; this
 * tool holds user edits, so closing routes through the start-over confirm
 * dialog when the code differs from the imported original, and closes
 * silently only when nothing was edited.
 */
test.describe('fullscreen editor overlay', () => {
  // Geometry only needs one desktop + one mobile engine; the overlay's DOM
  // behavior is engine-independent and covered indirectly by every other
  // spec that goes through loadSample().
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name !== 'chromium' && testInfo.project.name !== 'mobile-chromium',
      'viewport geometry: one desktop + one mobile engine'
    );
  });

  for (const vp of [
    { width: 1920, height: 1080 },
    { width: 375, height: 667 },
  ]) {
    test(`overlay fills the ${vp.width}x${vp.height} viewport and receives focus`, async ({ page }) => {
      await page.setViewportSize(vp);
      await page.goto('/edit-ascii-diagram/');
      await waitReady(page);
      await loadSample(page);

      const box = await page.locator('[data-testid="editor"]').boundingBox();
      expect(box).not.toBeNull();
      // ~= the viewport: fixed inset:0, so origin at (0,0) and full size.
      expect(Math.abs(box!.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(box!.y)).toBeLessThanOrEqual(1);
      expect(Math.abs(box!.width - vp.width)).toBeLessThanOrEqual(2);
      expect(Math.abs(box!.height - vp.height)).toBeLessThanOrEqual(2);
      console.log(
        `[fullscreen] overlay at ${vp.width}x${vp.height}: x=${box!.x} y=${box!.y} w=${box!.width} h=${box!.height}`
      );

      // Focus moved into the dialog when it opened (keyboard users start inside it).
      const focusedIsOverlay = await page.evaluate(
        () => document.activeElement?.getAttribute('data-testid') === 'editor'
      );
      expect(focusedIsOverlay).toBe(true);
    });
  }

  test('Escape without edits closes the editor directly, no prompt', async ({ page }) => {
    await page.goto('/edit-ascii-diagram/');
    await waitReady(page);
    await loadSample(page);

    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="editor"]')).toHaveCount(0);
    await expect(page.locator('#confirm-start-over-action')).toHaveCount(0); // no dialog appeared
    await expect(page.locator('#paste-textarea')).toBeVisible(); // back on the input screen
  });

  test('Escape with unsaved edits shows the confirm dialog; cancel keeps the editor, confirm closes it', async ({
    page,
  }) => {
    await page.goto('/edit-ascii-diagram/');
    await waitReady(page);
    await loadSample(page);
    // Below the hamburger breakpoint, add-box lives in the collapsible
    // bottom-bar menu — open it first (see #189).
    const toggle = page.getByTestId('bottombar-toggle');
    if (await toggle.isVisible()) await toggle.click();
    await page.click('#add-box-action'); // a real edit — code now differs from the imported original

    await page.keyboard.press('Escape');
    await expect(page.locator('#confirm-start-over-action')).toBeVisible(); // dialog, not a silent close
    await expect(page.locator('[data-testid="editor"]')).toBeVisible(); // edits not destroyed

    // While the dialog is open, Escape belongs to the dialog: it closes the
    // dialog only, and must NOT bounce straight back into a new close prompt.
    await page.keyboard.press('Escape');
    await expect(page.locator('#confirm-start-over-action')).toHaveCount(0);
    await expect(page.locator('[data-testid="editor"]')).toBeVisible();

    // Now go through with it.
    await page.keyboard.press('Escape');
    await page.click('#confirm-start-over-action');
    await expect(page.locator('[data-testid="editor"]')).toHaveCount(0);
    await expect(page.locator('#paste-textarea')).toBeVisible();
  });

  test('the visible close button routes exactly like Escape (prompt with edits, direct without)', async ({ page }) => {
    await page.goto('/edit-ascii-diagram/');
    await waitReady(page);
    await loadSample(page);

    // No edits: direct close.
    await page.click('[data-testid="close-editor"]');
    await expect(page.locator('[data-testid="editor"]')).toHaveCount(0);

    // With edits: confirm dialog.
    await loadSample(page);
    // Below the hamburger breakpoint, add-box lives in the collapsible
    // bottom-bar menu — open it first (see #189).
    const toggle = page.getByTestId('bottombar-toggle');
    if (await toggle.isVisible()) await toggle.click();
    await page.click('#add-box-action');
    await page.click('[data-testid="close-editor"]');
    await expect(page.locator('#confirm-start-over-action')).toBeVisible();
    await page.click('#confirm-start-over-action');
    await expect(page.locator('[data-testid="editor"]')).toHaveCount(0);
  });

  test('the bottom-bar menu collapses behind a hamburger toggle on narrow viewports', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 700 });
    await page.goto('/edit-ascii-diagram/');
    await waitReady(page);
    await loadSample(page);

    const details = page.getByTestId('code-pane');
    await expect(details).not.toBeVisible();

    const toggle = page.getByTestId('bottombar-toggle');
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(details).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });
});
