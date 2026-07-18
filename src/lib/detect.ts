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
 * Tolerant detection: a diagram that's been hand-edited, copied through a
 * chat/doc tool, or maintained over time in a code comment commonly ends up
 * with a ragged border. Two different kinds of raggedness turned out to need
 * two different tolerance strategies, confirmed against a real, messy
 * user-provided wireframe:
 *
 *  - The horizontal top edge (found by scanForCorner, unchanged from the
 *    original design) tolerates exactly one isolated blank cell, healed as a
 *    pass-through — real top/bottom border rows are typically drawn as one
 *    continuous, deliberate run of dashes, so a wider gap there really does
 *    mean "this isn't a closed box".
 *  - The vertical edges (searchColumnForCorner) are corner-anchored instead
 *    of edge-walked: interior content rows commonly don't have a border
 *    character at the expected column AT ALL — not off by one cell, but
 *    genuinely missing for many consecutive rows — because getting a side
 *    border's padding exactly right on every single content row is far more
 *    error-prone than drawing one straight horizontal run. Requiring every
 *    row between two corners to carry real connectivity is the wrong
 *    requirement; the corners themselves (┌┐└┘, or a T-junction/cross where
 *    this box's edge meets another box's or a divider) are reliable, so a
 *    vertical scan skips an unlimited run of blanks/plain content and
 *    anchors on the next genuine corner-shaped character instead. Finding a
 *    corner of the WRONG shape (not blank, not our corner, not a pass-
 *    through) means the scan has walked into unrelated structure — it must
 *    stop and reject there, never skip past it to pair with some farther,
 *    coincidentally-matching corner (that's what actually keeps this safe:
 *    see the "does not pair across unrelated structure" test). A corner-
 *    shaped cell that IS the right shape still isn't accepted blindly: it
 *    must be attached to real content on at least one of its two claimed
 *    sides (see isAttachedCorner) — otherwise it may be a stray, fully
 *    isolated character that only coincidentally shares a real corner's
 *    connectivity signature, confirmed as an actual case in real input.
 *
 * Corners are never healed in either scan — only the run of border cells
 * *between* two already-real corners can have gaps filled in. A missing or
 * wrong corner is a structural question this heuristic doesn't try to
 * answer.
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
 *
 * Used only for the horizontal top-edge scan — see this module's doc for why
 * the vertical scans (searchColumnForCorner, below) use a different,
 * unlimited-gap strategy instead.
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

function isBlankCell(doc: GridDoc, x: number, y: number): boolean {
  const cell = getCell(doc, x, y);
  return !cell || cell.ch === ' ';
}

/**
 * A corner-shaped cell is only a *real* corner if it isn't floating alone in
 * blank space — otherwise it's a stray, disconnected character that happens
 * to share a corner's connectivity signature without being attached to
 * anything (e.g. an isolated `┘` sitting in blank padding, confirmed as a
 * real case in user-provided input: every one of its four neighboring cells
 * is a literal space).
 *
 * Requires only ONE of the corner's claimed-direction neighbors to be
 * non-blank, not both — real corners in ragged input can legitimately have
 * ONE side blank too (e.g. a box's own right column has the usual missing-
 * border-on-interior-rows raggedness right up to the last row before its
 * bottom corner, so the corner's "up" neighbor is genuinely blank even
 * though the corner itself is completely real; confirmed as a real case in
 * user-provided input). Only a corner with NO real content on either claimed
 * side at all is the isolated-orphan pattern this exists to catch.
 *
 * Also deliberately checks "is the neighbor blank", not "does the
 * neighbor's connectivity exactly match" — a genuine corner's non-blank
 * neighbor is sometimes a cell that belongs to a *different*, coincidentally
 * -adjacent structure (e.g. one nested box's bottom row sitting directly
 * above a sibling box's own bottom-right corner) rather than this box's own
 * continuing border. That's real content, not an absence, so it counts as
 * "attached" even though its connectivity doesn't line up with this
 * corner's — only a genuinely empty cell on both claimed sides means
 * "nothing leads into this corner at all".
 * Checked once per candidate corner, not per plain pass-through cell, so
 * this stays cheap.
 */
function isAttachedCorner(doc: GridDoc, x: number, y: number, conn: Connectivity): boolean {
  const sides: boolean[] = [];
  if (conn.up) sides.push(!isBlankCell(doc, x, y - 1));
  if (conn.down) sides.push(!isBlankCell(doc, x, y + 1));
  if (conn.left) sides.push(!isBlankCell(doc, x - 1, y));
  if (conn.right) sides.push(!isBlankCell(doc, x + 1, y));
  return sides.some(Boolean);
}

/**
 * Search down column `x`, from row `startY + 1` to `maxY`, for the row where
 * this box's vertical edge terminates — see this module's doc for why this
 * is corner-anchored (unlimited gap skipping) rather than edge-walked.
 *
 * At each row, a genuine box-drawing character decides the outcome:
 *  - a vertical pass-through (has both up AND down connectivity — a plain
 *    │, or a T-junction/cross whose vertical arm continues through this
 *    cell, e.g. a divider crossing this box's own border) — the edge
 *    continues past this row, keep scanning.
 *  - a match for `wantedCorner` that is also attached (see
 *    isAttachedCorner) — this is where the edge terminates.
 *  - a match for `wantedCorner` that is NOT attached — an orphan character
 *    sharing the right shape by coincidence; treat it exactly like a gap
 *    and keep scanning past it, since a real corner may still be farther
 *    down.
 *  - a purely horizontal mark (left and/or right, but no vertical
 *    connectivity at all — e.g. a stray ─ sitting mid-column) — not
 *    relevant to a vertical scan either way, keep scanning.
 *  - anything else (some other shape with a vertical component that's
 *    neither a through-line nor our corner) — we've walked into unrelated
 *    structure; stop and reject rather than skip past it. This is the
 *    safety boundary that prevents pairing this box's start with a corner
 *    that belongs to something else.
 * Blank cells and plain (non-box-drawing) content are skipped silently, with
 * no limit on how many in a row.
 */
function searchColumnForCorner(
  doc: GridDoc,
  x: number,
  startY: number,
  maxY: number,
  wantedCorner: (c: Connectivity) => boolean
): number | null {
  for (let y = startY + 1; y <= maxY; y++) {
    const conn = connAt(doc, x, y);
    if (!conn) continue; // blank or plain (non-box-drawing) content
    if (conn.up && conn.down) continue; // the vertical edge continues past this row
    if (wantedCorner(conn)) {
      if (isAttachedCorner(doc, x, y, conn)) return y;
      continue; // right shape, but an orphan — not the real corner, keep looking
    }
    if (!conn.up && !conn.down) continue; // purely horizontal — irrelevant to this vertical scan
    return null; // a shape with a vertical component that doesn't match — unrelated structure
  }
  return null;
}

/**
 * Every blank/gap cell along a straight run, and what should fill it — no
 * limit on how many (unlike detection's tolerances above, which exist to
 * decide whether a box exists at all; once a box's corners are already
 * confirmed, every gap along its edges gets healed for rendering/export).
 * Real, non-blank content already there (T-junctions, crosses, or a stray
 * character that doesn't belong to this box) is left untouched — same
 * never-heal-real-content principle as detection's `invalid` classification.
 */
function collectGapHealing(
  doc: GridDoc,
  startX: number,
  startY: number,
  dx: number,
  dy: number,
  length: number,
  healChar: '─' | '│'
): HealedCell[] {
  const healed: HealedCell[] = [];
  for (let i = 0; i < length; i++) {
    const x = startX + dx * i;
    const y = startY + dy * i;
    if (classifyEdgeCell(doc, x, y).kind === 'gap') healed.push({ x, y, ch: healChar });
  }
  return healed;
}

/**
 * Every gap cell along an already-known box's four edges, healed. Used both
 * internally (once detection confirms a box's corners) and by edit
 * operations (lib/ops.ts) so that moving, resizing, or relabeling a box that
 * had a ragged border bakes the real characters in rather than reproducing
 * the gaps on export.
 */
export function healBoxEdges(doc: GridDoc, box: Box): HealedCell[] {
  const innerWidth = box.x2 - box.x1 - 1;
  const innerHeight = box.y2 - box.y1 - 1;
  return [
    ...collectGapHealing(doc, box.x1 + 1, box.y1, 1, 0, innerWidth, '─'), // top
    ...collectGapHealing(doc, box.x1 + 1, box.y2, 1, 0, innerWidth, '─'), // bottom
    ...collectGapHealing(doc, box.x1, box.y1 + 1, 0, 1, innerHeight, '│'), // left
    ...collectGapHealing(doc, box.x2, box.y1 + 1, 0, 1, innerHeight, '│'), // right
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

      // Top edge: search right for the top-right corner (left+down) — see
      // scanForCorner's doc for the pass-through-first priority and the
      // 1-cell healing tolerance, both unchanged from the original design.
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

      // Vertical edges: corner-anchored, independently down column x and
      // column x2, requiring them to agree on the same row — see
      // searchColumnForCorner's doc.
      const y2Left = searchColumnForCorner(doc, x, y, maxY, (c) => c.up && c.right);
      if (y2Left === null) continue;
      const y2Right = searchColumnForCorner(doc, x2, y, maxY, (c) => c.left && c.up);
      if (y2Right === null || y2Right !== y2Left) continue;
      const y2 = y2Left;

      const box: Box = { x1: x, y1: y, x2, y2 };
      results.push({ box, healed: healBoxEdges(doc, box) });
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
