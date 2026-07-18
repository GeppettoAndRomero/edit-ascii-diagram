import { test, expect, type Page } from '@playwright/test';
import { waitReady } from './_helpers';

/** Paste `text` into the input textarea and load it into the editor. */
async function pasteDiagram(page: Page, text: string) {
  await page.fill('#paste-textarea', text);
  await page.click('#load-from-text-action');
  await expect(page.locator('[data-testid="editor"]')).toBeVisible();
}

// A box that's otherwise clean except for one missing cell in its top border
// (column 3 of "┌────────┐" replaced with a blank) — the genuine "small paste
// imperfection" tolerant detection (detect.ts) is designed to heal. Verified
// programmatically, not eyeballed: '┌── ─────┐'.length === 10, same as the
// intact '┌────────┐'.
const RAGGED_BOX = ['┌── ─────┐', '│  hi    │', '└────────┘'].join('\n');

test.describe('border-gap healing (single-cell tolerant detection)', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'one engine is enough for this UI-level check');
  });

  test('a diagram with one healable gap is still detected as a box, and the notice reports it', async ({ page }) => {
    await page.goto('/edit-ascii-diagram/');
    await waitReady(page);
    await pasteDiagram(page, RAGGED_BOX);

    // Detected despite the gap — this is the actual bug fix: previously a
    // ragged border made the whole box (and anything nested in it) silently
    // undetectable.
    await expect(page.locator('[data-testid="stats-boxes"]')).toContainText('1');
    // Transparency, not silent rewriting (requirement #3): a small, factual
    // notice next to the box count, not an error or a blocking confirm.
    await expect(page.locator('[data-testid="stats-healed"]')).toContainText('1');
    await expect(page.locator('[role="alert"]')).toHaveCount(0); // not an error
    await expect(page.locator('#confirm-reset-action')).toHaveCount(0); // not a blocking confirmation
    await expect(page.locator('#confirm-start-over-action')).toHaveCount(0);

    // The box is genuinely usable — selectable and editable — not just counted.
    await page
      .locator('[data-testid="inspector-list"] button')
      .filter({ hasText: /^hi/ })
      .click();
    await expect(page.locator('#box-x-field')).toHaveValue('0');
  });

  test('the exported/committed text is untouched by healing until the box is actually edited', async ({ page }) => {
    await page.goto('/edit-ascii-diagram/');
    await waitReady(page);
    await pasteDiagram(page, RAGGED_BOX);

    // Not silently rewritten: the code pane still shows exactly what was
    // pasted, gap included, before any edit.
    await expect(page.locator('#code-pane')).toHaveValue(RAGGED_BOX);

    // Move the box — a real edit — and confirm the border comes back whole
    // in the exported text (healing baked in via lib/ops.ts's healBorder).
    await page
      .locator('[data-testid="inspector-list"] button')
      .filter({ hasText: /^hi/ })
      .click();
    await page.fill('#box-x-field', '2');
    await page.waitForTimeout(500);

    const finalText = await page.locator('#code-pane').inputValue();
    expect(finalText).toContain('┌────────┐'); // whole border, no reproduced gap
    expect(finalText).not.toContain('── ─────'); // the original gap pattern is gone
  });
});
