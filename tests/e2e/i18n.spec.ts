import { test, expect } from '@playwright/test';
import { waitReady, loadSample } from './_helpers';

// Content routing is engine-independent; one browser is enough.
test.describe('i18n', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'content routing (one engine)');
  });

  for (const loc of [
    { path: '/edit-ascii-diagram/', lang: 'en' },
    { path: '/edit-ascii-diagram/ja/', lang: 'ja' },
  ]) {
    test(`loads and edits a diagram on the ${loc.lang} route (#5)`, async ({ page }) => {
      await page.goto(loc.path);
      await waitReady(page);
      await loadSample(page);
      await page.click('#add-box-action');
      await expect(page.locator('[data-testid="stats-boxes"]')).toContainText('2');
    });
  }

  test('serves every locale with the correct <html lang>', async ({ page }) => {
    const expected: Array<[string, string]> = [
      ['/edit-ascii-diagram/', 'en'],
      ['/edit-ascii-diagram/ja/', 'ja'],
      ['/edit-ascii-diagram/zh/', 'zh-Hans'],
      ['/edit-ascii-diagram/de/', 'de'],
      ['/edit-ascii-diagram/es/', 'es'],
    ];
    for (const [path, lang] of expected) {
      await page.goto(path);
      expect(await page.getAttribute('html', 'lang'), `lang on ${path}`).toBe(lang);
    }
  });
});
