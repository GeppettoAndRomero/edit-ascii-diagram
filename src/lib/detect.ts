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
 *
 * Tolerant detection (border-gap healing): a diagram that's been hand-edited,
 * copied through a chat/doc tool, or maintained over time in a code comment
 * commonly ends up with slightly ragged borders — one row a column short of
 * its neighbors. Zero tolerance for that turns a common, realistic paste into
 * total, silent detection failure. So an edge scan treats a single blank
 * (missing or literal space) cell as a healed pass-through, PROVIDED it is a
 * lone gap — flanked by real border connectivity on both sides, never two or
 * more consecutive blanks. Corners themselves are never healed (only the
 * straight run of border cells between two corners can have a gap): a
 * missing/wrong corner is a structural question this heuristic doesn't try
 * to answer. The healing radius is fixed at exactly 1 cell — no
 * configuration surface, no wider tolerance — because bridging a bigger gap
 * risks detecting a box the user never actually drew.
 */
import { bounds, getCell, type GridDoc } from './grid';
import { connectivityOf, type Connectivity } from './boxChars';

export interface Box {
  /** Inclusive grid-column/row coordinates of the four border corners. */
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** A gap cell healed during detection, and the border character that belongs there. */
export interface HealedCell {
  x: number;
  y: number;
  ch: '─' | '│';
}

export interface DetectedBox {
  box: Box;
  /** Gap cells healed while confirming this box, empty when its border was already whole. */
  healed: HealedCell[];
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

function connAt(doc: GridDoc, x: number, y: number): Connectivity | null {
  const cell = getCell(doc, x, y);
  if (!cell || cell.continuation) return null;
  return connectivityOf(cell.ch);
}

type EdgeStep =
  | { kind: 'connector'; conn: Connectivity }
  | { kind: 'gap' } // a missing cell, or a literal space — a healable border imperfection
  | { kind: 'invalid' }; // real, non-box content sitting on the border line — never healed

/**
 * Classify one cell along an edge scan. A cell with real (non-space, non-box)
 * content is `invalid`, not a `gap` — this heuristic only ever papers over a
 * genuinely blank spot, never someone's actual text or a mis-shaped border
 * character (e.g. a stray corner glyph sitting where a straight edge should
 * be — that's a real, different character, not an absence).
 */
function classifyEdgeCell(doc: GridDoc, x: number, y: number): EdgeStep {
  const cell = getCell(doc, x, y);
  if (!cell) return { kind: 'gap' };
  if (cell.continuation) return { kind: 'invalid' };
  const conn = connectivityOf(cell.ch);
  if (conn) return { kind: 'connector', conn };
  if (cell.ch === ' ') return { kind: 'gap' };
  return { kind: 'invalid' };
}

/**
 * Search from (startX, startY) stepping by (dx, dy) for a cell matching
 * `isCornerMatch`, treating cells matching `isPassThrough` as "keep going"
 * and a single blank cell as a healed pass-through (never two in a row).
 * Returns the number of steps taken to reach the match, or -1.
 */
function scanForCorner(
  doc: GridDoc,
  startX: number,
  startY: number,
  dx: number,
  dy: number,
  maxSteps: number,
  isPassThrough: (c: Connectivity) => boolean,
  isCornerMatch: (c: Connectivity) => boolean
): number {
  let gapRun = 0;
  for (let i = 1; i <= maxSteps; i++) {
    const step = classifyEdgeCell(doc, startX + dx * i, startY + dy * i);
    if (step.kind === 'invalid') return -1;
    if (step.kind === 'gap') {
      gapRun++;
      if (gapRun > 1) return -1; // two+ consecutive blanks — not a small paste imperfection
      continue; // tentatively healed; only confirmed once a real cell is found on the far side
    }
    gapRun = 0;
    if (isPassThrough(step.conn)) continue;
    if (isCornerMatch(step.conn)) return i;
    return -1; // dead end — neither a pass-through nor the corner we're looking for
  }
  return -1;
}

/**
 * Verify a fixed-length straight run of `length` cells starting at
 * (startX, startY) stepping by (dx, dy), each required to satisfy `isValid`
 * — with the same single-blank-gap tolerance as scanForCorner. Returns the
 * healed gap positions (with the border character that belongs there) on
 * success, or `ok: false` if any cell is invalid or two+ gaps run together.
 */
function verifySegment(
  doc: GridDoc,
  startX: number,
  startY: number,
  dx: number,
  dy: number,
  length: number,
  isValid: (c: Connectivity) => boolean,
  healChar: '─' | '│'
): { ok: boolean; healed: HealedCell[] } {
  const healed: HealedCell[] = [];
  let gapRun = 0;
  for (let i = 0; i < length; i++) {
    const x = startX + dx * i;
    const y = startY + dy * i;
    const step = classifyEdgeCell(doc, x, y);
    if (step.kind === 'invalid') return { ok: false, healed: [] };
    if (step.kind === 'gap') {
      gapRun++;
      if (gapRun > 1) return { ok: false, healed: [] };
      healed.push({ x, y, ch: healChar });
      continue;
    }
    gapRun = 0;
    if (!isValid(step.conn)) return { ok: false, healed: [] };
  }
  return { ok: true, healed };
}

/**
 * Re-derive the gap cells healed for an already-known box (its four corners
 * given, not searched for). Used by edit operations (lib/ops.ts) so that
 * moving, resizing, or relabeling a box that had a healed border bakes the
 * real character in rather than reproducing the gap on export — without
 * touching any border cell that wasn't actually a gap (T-junctions and
 * crosses shared with a neighboring box are left exactly as they are).
 */
export function healBoxEdges(doc: GridDoc, box: Box): HealedCell[] {
  const innerWidth = box.x2 - box.x1 - 1;
  const innerHeight = box.y2 - box.y1 - 1;
  const top = verifySegment(doc, box.x1 + 1, box.y1, 1, 0, innerWidth, (c) => c.left && c.right, '─');
  const bottom = verifySegment(doc, box.x1 + 1, box.y2, 1, 0, innerWidth, (c) => c.left && c.right, '─');
  const left = verifySegment(doc, box.x1, box.y1 + 1, 0, 1, innerHeight, (c) => c.up && c.down, '│');
  const right = verifySegment(doc, box.x2, box.y1 + 1, 0, 1, innerHeight, (c) => c.up && c.down, '│');
  // A confirmed box's edges are already known-valid by construction; !ok here
  // would mean the box changed shape between calls, not a real case — treat
  // defensively as "nothing to heal" rather than throwing.
  return [
    ...(top.ok ? top.healed : []),
    ...(bottom.ok ? bottom.healed : []),
    ...(left.ok ? left.healed : []),
    ...(right.ok ? right.healed : []),
  ];
}

function detectBoxesDetailed(doc: GridDoc): DetectedBox[] {
  const { maxX, maxY } = bounds(doc);
  const results: DetectedBox[] = [];
  if (maxX < 0 || maxY < 0) return results;

  for (let y = 0; y <= maxY; y++) {
    for (let x = 0; x <= maxX; x++) {
      // Corners are never healed — only a confirmed real connector starts a box.
      const start = connAt(doc, x, y);
      if (!start || !start.right || !start.down) continue;

      // Top edge: search right for the top-right corner (left+down).
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
      const dxTop = scanForCorner(
        doc,
        x,
        y,
        1,
        0,
        maxX - x,
        (c) => c.left && c.right,
        (c) => c.left && c.down
      );
      if (dxTop === -1) continue;
      const x2 = x + dxTop;

      // Left edge: search down for the bottom-left corner (up+right), same priority.
      const dyLeft = scanForCorner(
        doc,
        x,
        y,
        0,
        1,
        maxY - y,
        (c) => c.up && c.down,
        (c) => c.up && c.right
      );
      if (dyLeft === -1) continue;
      const y2 = y + dyLeft;

      const bottomRight = connAt(doc, x2, y2);
      if (!bottomRight || !bottomRight.left || !bottomRight.up) continue;

      const innerWidth = x2 - x - 1;
      const innerHeight = y2 - y - 1;
      const bottomVerify = verifySegment(doc, x + 1, y2, 1, 0, innerWidth, (c) => c.left && c.right, '─');
      if (!bottomVerify.ok) continue;
      const rightVerify = verifySegment(doc, x2, y + 1, 0, 1, innerHeight, (c) => c.up && c.down, '│');
      if (!rightVerify.ok) continue;

      // Re-derive the top/left edges' own healed cells via the same
      // fixed-length verification used for bottom/right, rather than reusing
      // scanForCorner's internal bookkeeping — one shared definition of
      // "what counts as healed" for all four edges, not two separate ones
      // that could quietly drift apart.
      const topVerify = verifySegment(doc, x + 1, y, 1, 0, innerWidth, (c) => c.left && c.right, '─');
      const leftVerify = verifySegment(doc, x, y + 1, 0, 1, innerHeight, (c) => c.up && c.down, '│');

      const healed = [
        ...(topVerify.ok ? topVerify.healed : []),
        ...(leftVerify.ok ? leftVerify.healed : []),
        ...bottomVerify.healed,
        ...rightVerify.healed,
      ];

      results.push({ box: { x1: x, y1: y, x2, y2 }, healed });
    }
  }
  return results;
}

/** Detected boxes with their healed-gap info — used where the notice/canvas needs it. */
export function detectBoxesWithHealing(doc: GridDoc): DetectedBox[] {
  return detectBoxesDetailed(doc);
}

export function detectBoxes(doc: GridDoc): Box[] {
  return detectBoxesDetailed(doc).map((r) => r.box);
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
