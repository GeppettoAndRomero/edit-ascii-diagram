import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { loadSample, waitReady } from './_helpers';

// axe inspects the rendered DOM; one engine is representative.
test.describe('accessibility', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'axe runs on one engine');
  });

  for (const path of ['/edit-ascii-diagram/', '/edit-ascii-diagram/ja/']) {
    test(`has no serious or critical axe violations on the input screen at ${path} (#6)`, async ({ page }) => {
      // Disable the decorative fade-in so axe samples the settled (fully-opaque)
      // state, not a mid-animation frame.
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(path);
      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
      const blocking = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect(blocking.map((v) => `${v.id} (${v.impact})`)).toEqual([]);
    });
  }

  // The click/drag canvas (D10) is marked decorative (role="img") for assistive
  // tech — the real interaction surface is the keyboard-operable box list and
  // form (DiagramInspector). Scan that editor view, with a box selected so the
  // numeric X/Y/Width/Height fields and text area are actually rendered.
  test('has no serious or critical axe violations on the editor view with a box selected (#6)', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/edit-ascii-diagram/');
    await waitReady(page);
    await loadSample(page);
    await page.getByRole('listitem').first().getByRole('button').click();
    await expect(page.locator('#box-x-field')).toBeVisible();

    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const blocking = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(blocking.map((v) => `${v.id} (${v.impact})`)).toEqual([]);
  });
});
