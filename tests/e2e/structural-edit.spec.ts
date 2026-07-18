import { test, expect, type Page } from '@playwright/test';
import { waitReady } from './_helpers';
import { WIREFRAME } from '../fixtures/diagrams';

/** Paste `text` into the input textarea and load it into the editor. */
async function pasteDiagram(page: Page, text: string) {
  await page.fill('#paste-textarea', text);
  await page.click('#load-from-text-action');
  await expect(page.locator('[data-testid="editor"]')).toBeVisible();
}

/**
 * Pixel width/height of one grid column/row — read from the same hidden
 * `.ascii-calib` element DiagramCanvas itself measures at drag-start to
 * convert pointer movement into grid steps, so the test's mouse-drag
 * distances agree with the component's own math exactly (row-to-row DOM
 * geometry can differ slightly from the calibration element's natural line
 * height, which would otherwise make a small, single-row drag round to 0).
 */
async function measureCellSize(page: Page) {
  const calib = await page.locator('.ascii-calib').boundingBox();
  if (!calib) throw new Error('could not measure canvas cell size');
  return { cellW: calib.width, cellH: calib.height };
}

test.describe('structural editing (D10) — the real issue #115 sample', () => {
  // Chromium: real, hardware-backed pointer drag behavior is most reliable
  // there; the keyboard-operable path is covered for every engine by a11y/
  // covenants specs, which don't depend on pointer drag physics at all.
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'pointer-drag realism (chromium only)');
  });

  test('pastes the real wireframe sample and renders it without broken/shifted borders, then supports move, resize, and text edit', async ({
    page,
  }) => {
    await page.goto('/edit-ascii-diagram/');
    await waitReady(page);
    await pasteDiagram(page, WIREFRAME);

    // Not broken/shifted: the width-aware parser recovers the same text it
    // was given (this fixture has no trailing whitespace to trim, so the
    // regenerated text is exactly the pasted text — see tests/unit/roundtrip
    // .test.ts for the general "same box structure" property this relies on).
    await expect(page.locator('#code-pane')).toHaveValue(WIREFRAME);

    // At least the outer frame, search box, and the two side-by-side boxes
    // are detected (see tests/unit/roundtrip.test.ts for the exact count).
    const list = page.locator('[data-testid="inspector-list"] [role="listitem"]');
    await expect(list).not.toHaveCount(0);
    const initialCount = await list.count();
    expect(initialCount).toBeGreaterThanOrEqual(4);

    // --- move: drag the search box. Its extracted label starts with "検索" —
    // anchored at the start of the button's own visible text (not its aria-
    // label, which is prefixed with 'Edit box "…"', and not a plain
    // substring match) because a *parent* box's own label is its entire
    // interior content flattened to one line, which incidentally also
    // contains "検索" somewhere in the middle (the search box is nested
    // inside it); only the search box's own label actually starts with it. ---
    await page
      .locator('[data-testid="inspector-list"] button')
      .filter({ hasText: /^検索/ })
      .click();
    const xField = page.locator('#box-x-field');
    const yField = page.locator('#box-y-field');
    const originalX = Number(await xField.inputValue());
    const originalY = Number(await yField.inputValue());

    const { cellW, cellH } = await measureCellSize(page);
    // Drag from a point on the search box's left border (not its corner —
    // that's the resize handle) one row down, into the single blank spacer
    // row directly below it. The wireframe packs its boxes flush against the
    // outer frame horizontally (zero margin), so a vertical move into the
    // one row of real slack is the collision-free move available here — a
    // sideways move would immediately overwrite the outer frame's own
    // border, which is D11's documented (and separately unit-tested)
    // overwrite behavior, not something this test needs to also exercise.
    const dragFrom = page.locator(`[data-x="${originalX}"][data-y="${originalY + 1}"]`);
    // The canvas sits in a scrollable container (overflow: auto) — a raw
    // page.mouse.move() to manually computed coordinates does NOT auto-scroll
    // the way locator actions like .click()/.hover() do, so the target cell
    // must be scrolled into view first or its bounding box can land outside
    // the viewport (e.g. a negative y) and the drag would silently hit nothing.
    await dragFrom.scrollIntoViewIfNeeded();
    const fromBox = await dragFrom.boundingBox();
    if (!fromBox) throw new Error('drag start cell not found');
    const startX = fromBox.x + fromBox.width / 2;
    const startY = fromBox.y + fromBox.height / 2;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, startY + cellH, { steps: 5 });
    await page.mouse.up();

    await expect(xField).toHaveValue(String(originalX));
    await expect(yField).toHaveValue(String(originalY + 1));

    // --- resize: drag the (still selected) search box's bottom-right handle.
    // Shrink width only (it has plenty of margin); the search box's height is
    // already at the tool's minimum (3 rows), so shrinking height too would
    // just get clamped back — this isolates the resize-width behavior cleanly. ---
    const widthField = page.locator('#box-width-field');
    const heightField = page.locator('#box-height-field');
    const originalWidth = Number(await widthField.inputValue());
    const originalHeight = Number(await heightField.inputValue());

    const handle = page.locator('.ascii-cell--handle');
    await handle.scrollIntoViewIfNeeded();
    const handleBox = await handle.boundingBox();
    if (!handleBox) throw new Error('resize handle not found');
    const handleX = handleBox.x + handleBox.width / 2;
    const handleY = handleBox.y + handleBox.height / 2;
    await page.mouse.move(handleX, handleY);
    await page.mouse.down();
    await page.mouse.move(handleX - cellW * 2, handleY, { steps: 5 });
    await page.mouse.up();

    await expect(widthField).toHaveValue(String(originalWidth - 2));
    await expect(heightField).toHaveValue(String(originalHeight));

    // --- text edit: replace the (still selected) box's text ---
    const textField = page.locator('#box-text-field');
    await textField.fill('検索');
    // debounced commit (~300ms)
    await page.waitForTimeout(500);

    const finalText = await page.locator('#code-pane').inputValue();
    expect(finalText).toContain('検索');

    // The result is still structurally sound: re-detecting boxes after the
    // move + resize + text edit finds at least as many as before — none of
    // the other boxes were destroyed by editing this one.
    await page.getByRole('button', { name: 'Back to list' }).click();
    const listAfter = page.locator('[data-testid="inspector-list"] [role="listitem"]');
    await expect(listAfter).not.toHaveCount(0);
    expect(await listAfter.count()).toBeGreaterThanOrEqual(initialCount);
  });
});

// Plain clicks and field edits, no pointer-drag physics — runs on every
// configured engine, like sibling tools' non-drag interaction specs.
test.describe('structural editing (D10) — add/delete', () => {
  test('adds a box, edits it via the keyboard-operable fields, then deletes it', async ({ page }) => {
    await page.goto('/edit-ascii-diagram/');
    await waitReady(page);
    await pasteDiagram(page, ['┌───┐', '│ x │', '└───┘'].join('\n'));

    await expect(page.locator('[data-testid="stats-boxes"]')).toContainText('1');
    await page.click('#add-box-action');
    await expect(page.locator('[data-testid="stats-boxes"]')).toContainText('2');

    // Adding a box auto-selects it — the geometry form is already visible.
    await expect(page.locator('#box-x-field')).toBeVisible();
    await page.fill('#box-width-field', '10');
    await page.waitForTimeout(500);
    await expect(page.locator('#box-width-field')).toHaveValue('10');

    await page.click('#delete-box-action');
    await expect(page.locator('[data-testid="stats-boxes"]')).toContainText('1');
  });

  test('undo/redo revert and reapply an edit', async ({ page }) => {
    await page.goto('/edit-ascii-diagram/');
    await waitReady(page);
    await pasteDiagram(page, ['┌───┐', '│ x │', '└───┘'].join('\n'));

    await page.click('#add-box-action');
    await expect(page.locator('[data-testid="stats-boxes"]')).toContainText('2');

    await page.click('#undo-action');
    await expect(page.locator('[data-testid="stats-boxes"]')).toContainText('1');

    await page.click('#redo-action');
    await expect(page.locator('[data-testid="stats-boxes"]')).toContainText('2');
  });
});

test.describe('output (chromium only, clipboard permissions)', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Clipboard permission grants are Chromium-only in Playwright');
  });

  test('"Copy for AI" puts a before/after template with the real edit on the clipboard (D14)', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/edit-ascii-diagram/');
    await waitReady(page);
    const original = ['┌───┐', '│ x │', '└───┘'].join('\n');
    await pasteDiagram(page, original);

    // Make one real edit so before/after actually differ.
    await page
      .locator('[data-testid="inspector-list"] button')
      .filter({ hasText: /^x/ })
      .click();
    await page.fill('#box-text-field', 'y');
    await page.waitForTimeout(500);

    await page.click('#copy-for-ai-action');
    await expect(page.locator('#copy-for-ai-action')).toContainText(/copied/i);

    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toContain('before:');
    expect(clipboardText).toContain('after:');
    const beforeIdx = clipboardText.indexOf('before:');
    const afterIdx = clipboardText.indexOf('after:');
    expect(afterIdx).toBeGreaterThan(beforeIdx);
    // "before" carries the original pasted text; "after" carries the edit.
    expect(clipboardText.slice(beforeIdx, afterIdx)).toContain('x');
    expect(clipboardText.slice(afterIdx)).toContain('y');
  });

  test('"Copy text" puts the current diagram text on the clipboard', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/edit-ascii-diagram/');
    await waitReady(page);
    await pasteDiagram(page, ['┌───┐', '│ x │', '└───┘'].join('\n'));

    await page.click('#copy-text-action');
    await expect(page.locator('#copy-text-action')).toContainText(/copied/i);
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toBe(['┌───┐', '│ x │', '└───┘'].join('\n'));
  });
});
