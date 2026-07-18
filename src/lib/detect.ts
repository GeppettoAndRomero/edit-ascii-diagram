/**
 * D9: after import, scan the grid for rectangular areas enclosed by
 * box-drawing characters and treat each one as a selectable "box" — the unit
 * D10's click-to-select/move/resize/edit operations act on.
 *
 * The scan is connectivity-based (see boxChars.ts): a cell can start a box's
 * top-left corner as long as it connects right+down, regardless of whether
 * it's a plain `┌` or a T-junction/cross (`┬`, `├`, `┼`) formed where this
 * box's border touches another box's or an internal divider — so nested and
 * touching boxes are both detected without special-casing every shape.
 */
import { bounds, getCell, type GridDoc } from './grid';
import { connectivityOf } from './boxChars';

export interface Box {
  /** Inclusive grid-column/row coordinates of the four border corners. */
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export function boxWidth(box: Box): number {
  return box.x2 - box.x1 + 1;
}

export function boxHeight(box: Box): number {
  return box.y2 - box.y1 + 1;
}

export function boxArea(box: Box): number {
  return boxWidth(box) * boxHeight(box);
}

export function boxContains(box: Box, x: number, y: number): boolean {
  return x >= box.x1 && x <= box.x2 && y >= box.y1 && y <= box.y2;
}

export function boxesEqual(a: Box, b: Box): boolean {
  return a.x1 === b.x1 && a.y1 === b.y1 && a.x2 === b.x2 && a.y2 === b.y2;
}

function connAt(doc: GridDoc, x: number, y: number) {
  const cell = getCell(doc, x, y);
  if (!cell || cell.continuation) return null;
  return connectivityOf(cell.ch);
}

export function detectBoxes(doc: GridDoc): Box[] {
  const { maxX, maxY } = bounds(doc);
  const boxes: Box[] = [];
  if (maxX < 0 || maxY < 0) return boxes;

  for (let y = 0; y <= maxY; y++) {
    for (let x = 0; x <= maxX; x++) {
      const start = connAt(doc, x, y);
      if (!start || !start.right || !start.down) continue; // not a valid top-left corner

      // Scan right along the top edge for the matching top-right corner.
      //
      // Order matters here: a T-junction like `┤` or `┼` satisfies BOTH "this
      // is a plain pass-through edge cell" (left+right) AND "this looks like
      // a corner" (left+down) at once — e.g. where a `├─...─┤` divider row
      // crosses this box's own left/right border on its way through the
      // interior. Checking the pass-through condition FIRST means the scan
      // treats such a cell as "the border keeps going", not "the border ends
      // here", so a divider crossing a box's edge doesn't truncate it. Only
      // a cell that is a corner but NOT also a valid pass-through stops the
      // scan. (Whether an ambiguous ┼-as-true-corner case is instead a
      // pass-through is inherently undecidable from local connectivity alone
      // — this heuristic favors the larger enclosing rectangle, matching how
      // dividers are actually used in real diagrams; see boxChars.ts.)
      let x2 = -1;
      for (let cx = x + 1; cx <= maxX; cx++) {
        const c = connAt(doc, cx, y);
        if (!c) break;
        if (c.left && c.right) continue; // pass-through — the top edge keeps going
        if (c.left && c.down) {
          x2 = cx;
          break;
        }
        break; // dead end — neither a pass-through nor a valid corner
      }
      if (x2 === -1) continue;

      // Scan down along the left edge for the matching bottom-left corner (same pass-through-first priority).
      let y2 = -1;
      for (let cy = y + 1; cy <= maxY; cy++) {
        const c = connAt(doc, x, cy);
        if (!c) break;
        if (c.up && c.down) continue;
        if (c.up && c.right) {
          y2 = cy;
          break;
        }
        break;
      }
      if (y2 === -1) continue;

      const bottomRight = connAt(doc, x2, y2);
      if (!bottomRight || !bottomRight.left || !bottomRight.up) continue;

      let ok = true;
      for (let cx = x + 1; cx < x2 && ok; cx++) {
        const c = connAt(doc, cx, y2);
        if (!c || !c.left || !c.right) ok = false;
      }
      for (let cy = y + 1; cy < y2 && ok; cy++) {
        const c = connAt(doc, x2, cy);
        if (!c || !c.up || !c.down) ok = false;
      }
      if (!ok) continue;

      boxes.push({ x1: x, y1: y, x2, y2 });
    }
  }
  return boxes;
}

/** The smallest box (by area) that contains (x, y) — the natural "innermost/topmost" pick for nested boxes. */
export function smallestBoxAt(boxes: Box[], x: number, y: number): Box | null {
  let best: Box | null = null;
  for (const box of boxes) {
    if (!boxContains(box, x, y)) continue;
    if (!best || boxArea(box) < boxArea(best)) best = box;
  }
  return best;
}
