import { test, expect } from '@playwright/test';
import { waitReady, loadSample } from './_helpers';

// Service-worker / offline behaviour is reliable in Chromium; gate these there.
test.describe('covenants', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'service-worker dependent (chromium only)');
  });

  test('links to related tools and its own engineering-notes article (#177)', async ({ page }) => {
    await page.goto('/edit-ascii-diagram/');
    const cards = page.locator('.related-tools-grid a.related-tool-card');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(1);
    expect(count).toBeLessThanOrEqual(5);
    for (let i = 0; i < count; i++) {
      const href = await cards.nth(i).getAttribute('href');
      expect(href, `related card ${i} href`).toMatch(/^https:\/\/runlocally\.app\/[a-z0-9-]+\/$/);
      expect(href, `related card ${i} is not a self-link`).not.toContain('/edit-ascii-diagram/');
      await expect(cards.nth(i), `related card ${i} has discernible link text`).not.toHaveText('');
    }
    const blogLink = page.locator('.related-tools-blog-link a');
    if (await blogLink.count()) {
      await expect(blogLink).toHaveAttribute('href', /^https:\/\/runlocally\.app\/blog\/edit-ascii-diagram\/$/);
    }
  });

  test('makes no cross-origin request while loading and editing (#1)', async ({ page }) => {
    const external: string[] = [];
    page.on('request', (req) => {
      const url = req.url();
      if (!url.startsWith('http://localhost:4321') && !url.startsWith('data:') && !url.startsWith('blob:')) {
        external.push(url);
      }
    });

    await page.goto('/edit-ascii-diagram/');
    await waitReady(page);
    await loadSample(page);
    await page.click('#add-box-action');

    expect(external, `unexpected cross-origin requests: ${external.join(', ')}`).toHaveLength(0);
  });

  test('PWA: manifest is linked and valid, service worker registers (#3)', async ({ page }) => {
    await page.goto('/edit-ascii-diagram/');
    const href = await page.getAttribute('link[rel=manifest]', 'href');
    expect(href).toBeTruthy();
    const manifest = await page.evaluate(async (h) => (await fetch(h as string)).json(), href);
    expect(manifest.name).toBeTruthy();
    expect(manifest.start_url).toBeTruthy();
    expect(manifest.display).toBe('standalone');
    expect(Array.isArray(manifest.icons) && manifest.icons.length > 0).toBe(true);
    await page.waitForFunction(() => navigator.serviceWorker?.controller != null, { timeout: 15_000 });
  });

  test('footer links to SECURITY.md (#4)', async ({ page }) => {
    await page.goto('/edit-ascii-diagram/');
    const link = page.locator('footer a').filter({ hasText: 'Security' });
    await expect(link).toHaveAttribute('href', /SECURITY\.md$/);
  });

  test('keeps no input data in the page URL while editing (#7)', async ({ page }) => {
    await page.goto('/edit-ascii-diagram/');
    await waitReady(page);
    const before = page.url();
    await loadSample(page);
    await page.click('#add-box-action');
    expect(page.url()).toBe(before);
    expect(page.url()).not.toMatch(/data:|base64|blob:/i);
  });

  test('edits offline after the first online visit (#2)', async ({ page }) => {
    // First visit registers + activates the SW (it claims existing clients).
    await page.goto('/edit-ascii-diagram/');
    await page.waitForFunction(() => navigator.serviceWorker?.controller != null, { timeout: 15_000 });
    // Reload once online so page HTML + island JS are now fetched *through* the
    // active SW and cached (first load happened before the SW was controlling).
    await page.reload();
    await waitReady(page);
    // Load + edit online so every JS chunk is fetched and cached too.
    await loadSample(page);
    await page.click('#add-box-action');

    await page.context().setOffline(true);
    try {
      await page.reload(); // served entirely from the SW cache
      await waitReady(page);
      // The previous session's diagram is restored from localStorage, so the
      // editor — not the idle "paste a diagram" input screen — comes up
      // directly. Confirm it renders and can still be edited with no network.
      await expect(page.locator('[data-testid="editor"]')).toBeVisible();
      await page.click('#add-box-action');
    } finally {
      await page.context().setOffline(false);
    }
  });
});
