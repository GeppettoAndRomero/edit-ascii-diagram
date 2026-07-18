import { type Page, expect } from '@playwright/test';

/** Wait until the island has hydrated and is ready for input. */
export async function waitReady(page: Page) {
  await page.waitForFunction(() => (window as Record<string, unknown>).__toolReady === true);
}

/**
 * A small, deterministic diagram used by covenant/i18n specs that just need
 * *a* real diagram loaded, not to assert its exact shape. One box.
 */
export const SAMPLE_DIAGRAM = ['┌───────┐', '│ hello │', '└───────┘'].join('\n');

/** Paste SAMPLE_DIAGRAM into the input textarea and load it into the editor. */
export async function loadSample(page: Page) {
  await page.fill('#paste-textarea', SAMPLE_DIAGRAM);
  await page.click('#load-from-text-action');
  await expect(page.locator('[data-testid="editor"]')).toBeVisible();
}
