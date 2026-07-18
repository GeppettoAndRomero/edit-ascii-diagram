/**
 * D10 edit operations: move, resize, edit text, add, delete a box. Each
 * function mutates the given `GridDoc` in place and returns the freshly
 * printed text — the widget's `runOp` helper feeds that text back through
 * `commitCode`, which re-parses it for rendering and records a new undo
 * entry (D12), mirroring sibling tools/edit-flowchart's `runOp` shape.
 *
 * D11: move/resize/add never try to avoid overlapping other structure —
 * cells are simply overwritten, "standard naive grid canvas behavior". No
 * T-junction merging with neighboring boxes happens here (that recompute is
 * detect.ts's job, for *reading* an existing diagram — see D7's rationale).
 */
import { bounds, getCell, setCell, type GridCell, type GridDoc } from './grid';
import { printGrid } from './print';
import { healBoxEdges, type Box } from './detect';
import { clusterWidth, graphemeClusters } from './width';

export const MIN_BOX_WIDTH = 3;
export const MIN_BOX_HEIGHT = 3;
const DEFAULT_ADD_WIDTH = 14;
const DEFAULT_ADD_HEIGHT = 4;

function clearRect(doc: GridDoc, x1: number, y1: number, x2: number, y2: number): void {
  for (let y = y1; y <= y2; y++) {
    for (let x = x1; x <= x2; x++) setCell(doc, x, y, null);
  }
}

function drawBorder(doc: GridDoc, x1: number, y1: number, x2: number, y2: number): void {
  setCell(doc, x1, y1, { ch: '┌', continuation: false });
  setCell(doc, x2, y1, { ch: '┐', continuation: false });
  setCell(doc, x1, y2, { ch: '└', continuation: false });
  setCell(doc, x2, y2, { ch: '┘', continuation: false });
  for (let x = x1 + 1; x < x2; x++) {
    setCell(doc, x, y1, { ch: '─', continuation: false });
    setCell(doc, x, y2, { ch: '─', continuation: false });
  }
  for (let y = y1 + 1; y < y2; y++) {
    setCell(doc, x1, y, { ch: '│', continuation: false });
    setCell(doc, x2, y, { ch: '│', continuation: false });
  }
}

/**
 * Fill in any border gaps detect.ts's tolerant scan healed for this box —
 * surgically (only the specific gap cells, via the exact character that
 * belongs there), never touching a border cell that wasn't actually a gap
 * (a T-junction/cross shared with a neighboring box is left exactly as-is).
 * Called at the start of any op that touches an existing box's identity
 * (move/resize/relabel), so a box whose import was ragged comes out whole
 * once the user has actually edited it — see detect.ts's module doc and
 * issue tracker note on tolerant detection.
 */
function healBorder(doc: GridDoc, box: Box): void {
  for (const cell of healBoxEdges(doc, box)) {
    setCell(doc, cell.x, cell.y, { ch: cell.ch, continuation: false });
  }
}

/**
 * Write `text` (possibly multi-line) into the interior rectangle, clipping to
 * its current width/height — D10: interior text "reflows/clips", the box
 * never auto-grows to fit new text. A grapheme that would only partially fit
 * in the remaining width is dropped whole rather than split, consistent with
 * the D3/D4 double-width cell model (never leave a lone continuation cell
 * with no glyph before it).
 */
function writeInteriorText(doc: GridDoc, x1: number, y1: number, x2: number, y2: number, text: string): void {
  const innerX1 = x1 + 1;
  const innerY1 = y1 + 1;
  const innerX2 = x2 - 1;
  const innerY2 = y2 - 1;
  if (innerX2 < innerX1 || innerY2 < innerY1) return;
  clearRect(doc, innerX1, innerY1, innerX2, innerY2);
  const innerWidth = innerX2 - innerX1 + 1;
  const innerHeight = innerY2 - innerY1 + 1;
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').slice(0, innerHeight);
  for (let row = 0; row < lines.length; row++) {
    let col = 0;
    for (const cluster of graphemeClusters(lines[row])) {
      const w = Math.max(1, clusterWidth(cluster));
      if (col + w > innerWidth) break;
      const gx = innerX1 + col;
      const gy = innerY1 + row;
      setCell(doc, gx, gy, { ch: cluster, continuation: false });
      for (let i = 1; i < w; i++) setCell(doc, gx + i, gy, { ch: '', continuation: true });
      col += w;
    }
  }
}

/** The current interior text of a box, one grid row per source line, trailing spaces trimmed. */
export function boxText(doc: GridDoc, box: Box): string {
  const rows: string[] = [];
  for (let y = box.y1 + 1; y < box.y2; y++) {
    let row = '';
    for (let x = box.x1 + 1; x < box.x2; x++) {
      const cell = getCell(doc, x, y);
      if (!cell || cell.continuation) continue;
      row += cell.ch;
    }
    rows.push(row.replace(/[ \t]+$/u, ''));
  }
  return rows.join('\n');
}

/** Move a box so its top-left corner is at (newX1, newY1). Off-canvas negative targets are clamped to 0. */
export function moveBox(doc: GridDoc, box: Box, newX1: number, newY1: number): string {
  const x1 = Math.max(0, Math.round(newX1));
  const y1 = Math.max(0, Math.round(newY1));
  const dx = x1 - box.x1;
  const dy = y1 - box.y1;
  if (dx !== 0 || dy !== 0) {
    // Heal before snapshotting so the healed cells — not the gaps — travel
    // with the box to its new position.
    healBorder(doc, box);
    const snapshot: Array<[number, number, GridCell]> = [];
    for (let y = box.y1; y <= box.y2; y++) {
      for (let x = box.x1; x <= box.x2; x++) {
        const cell = getCell(doc, x, y);
        if (cell) snapshot.push([x, y, cell]);
      }
    }
    clearRect(doc, box.x1, box.y1, box.x2, box.y2);
    for (const [x, y, cell] of snapshot) setCell(doc, x + dx, y + dy, cell);
  }
  return printGrid(doc);
}

/**
 * Resize a box to `newWidth` x `newHeight` grid columns/rows, keeping its
 * top-left corner fixed. No explicit healBorder() call needed here: drawBorder
 * below unconditionally overwrites every border cell of the new rectangle
 * with a fresh, correct character regardless of what (if anything) was there
 * before, so any gap is filled as a side effect of the ordinary redraw.
 */
export function resizeBox(doc: GridDoc, box: Box, newWidth: number, newHeight: number): string {
  const width = Math.max(MIN_BOX_WIDTH, Math.round(newWidth));
  const height = Math.max(MIN_BOX_HEIGHT, Math.round(newHeight));
  const text = boxText(doc, box);
  const x2 = box.x1 + width - 1;
  const y2 = box.y1 + height - 1;
  clearRect(doc, box.x1, box.y1, Math.max(box.x2, x2), Math.max(box.y2, y2));
  drawBorder(doc, box.x1, box.y1, x2, y2);
  writeInteriorText(doc, box.x1, box.y1, x2, y2, text);
  return printGrid(doc);
}

/** Replace a box's interior text (D10 inline text editing). */
export function setBoxText(doc: GridDoc, box: Box, text: string): string {
  healBorder(doc, box); // relabeling still touches this box's identity — see healBorder's doc comment
  writeInteriorText(doc, box.x1, box.y1, box.x2, box.y2, text);
  return printGrid(doc);
}

/** Draw a new empty box at (x1, y1) with the given size, returning the new text. */
export function addBox(
  doc: GridDoc,
  x1: number,
  y1: number,
  width = DEFAULT_ADD_WIDTH,
  height = DEFAULT_ADD_HEIGHT
): string {
  const w = Math.max(MIN_BOX_WIDTH, width);
  const h = Math.max(MIN_BOX_HEIGHT, height);
  drawBorder(doc, x1, y1, x1 + w - 1, y1 + h - 1);
  return printGrid(doc);
}

/** Clear a box's entire rectangle (border + interior) — D11: no attempt to repair neighbors it may have touched. */
export function removeBox(doc: GridDoc, box: Box): string {
  clearRect(doc, box.x1, box.y1, box.x2, box.y2);
  return printGrid(doc);
}

/**
 * A reasonable default position for a newly-added box: left-aligned, one
 * blank row below the lowest actually-placed cell. Based on `bounds()` (real
 * content), not `rowCount` — a grid with only blank lines (e.g. freshly
 * parsed from `''`) has `rowCount` >= 1 but no content to leave room below.
 */
export function defaultAddPosition(doc: GridDoc): { x: number; y: number } {
  const { maxY } = bounds(doc);
  return { x: 0, y: maxY === -1 ? 0 : maxY + 2 };
}
