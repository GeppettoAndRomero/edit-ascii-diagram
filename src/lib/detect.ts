/**
 * D9: after import, scan the grid for rectangular areas enclosed by
 * box-drawing characters and treat each one as a selectable "box" — the unit
 * D10's click-to-select/move/resize/edit operations act on.
 *
 * The scan is connectivity-based (see boxChars.ts): a cell can start a box's
 * top-left corner as long as it connects right+down, regardless of whether
 * it's a plain `┌` or a T-junction/cross (`┬`, `├`, `┼`) formed where this
 * box's border touches another box's or an internal divider — so nested and
 * touching boxes are both detected without special-casing every shape. From a
 * candidate top-left corner we trace the four edges to their corners (the
 * docutils GridTableParser corner-tracing approach); this is what recovers
 * NESTING, and it's kept as-is.
 *
 * Tolerant detection — ONE order-based edge alignment.
 * ----------------------------------------------------
 * Real pasted input is RAGGED: a diagram that's been hand-edited, copied
 * through a chat/doc tool, or maintained in a code comment drifts. Rather than
 * three separately-tuned tolerance heuristics, every edge is traced by a
 * single mechanism (`alignEdge`): starting from a confirmed corner, step cell
 * by cell toward where the opposite corner should be and classify each cell
 * into one of four ALIGNMENT ROLES:
 *
 *   - rail   — a real border cell carrying the edge straight through this
 *              position (a plain ─/│, or a T-junction/cross whose matching arm
 *              passes through). The edge is present here; keep going.
 *   - corner — the corner we're aligning toward. Stop: the edge closes here.
 *   - slack  — the edge is ABSENT here but tolerably so: a blank to heal, an
 *              off-axis mark, plain label text bleeding onto the line, or a
 *              corner-shaped glyph that turns out to be a detached orphan.
 *              Step over it (an alignment gap/indel) — order is preserved.
 *   - break  — real, on-axis structure of the WRONG shape: a different box's
 *              wall, or a mis-drawn glyph. Aligning past it would cross into
 *              unrelated structure, so the whole edge is rejected right here.
 *              This is the safety boundary (see the "does not pair across
 *              unrelated structure" test): we never skip past a break to reach
 *              some farther, coincidentally-matching corner.
 *
 * This is the order-based / ordinal principle (as in GFM pipe tables and
 * org-mode: the k-th corner closes the k-th edge) rather than position
 * clustering: each edge is traced along a FIXED row or column, so two genuine
 * edges only two columns apart stay distinct even when per-row padding drift
 * is far larger — a case no position-snapping tolerance can handle. The three
 * former heuristics all fall out of this one model: single-cell gap healing is
 * `slack` under a tight run limit; unlimited blank-skipping is `slack` under
 * no run limit; orphan rejection is just how a corner-shaped cell is scored
 * `corner`-vs-`slack` (see isAttachedCorner).
 *
 * The ONLY thing that separates a horizontal edge from a vertical one is how
 * much CONSECUTIVE slack each tolerates, because the two border kinds are
 * drawn differently:
 *
 *   - A horizontal top/bottom border is a single deliberate run of dashes, so
 *     a real one is continuous. At most ONE blank in a row is a paste nick;
 *     two in a row means "not a closed box". → maxSlackRun = 1.
 *   - A vertical side border drifts: getting the padding right on every
 *     interior content row is far more error-prone than drawing one straight
 *     horizontal run, so the column is genuinely empty for many consecutive
 *     rows between two real corners. Its border is expected to be sparse, and
 *     order preservation — not a per-row border requirement — is what keeps it
 *     safe. → maxSlackRun = Infinity.
 *
 * Corners are never healed: only the run of border cells *between* two
 * already-real corners can have gaps filled in (collectGapHealing). A missing
 * or wrong corner is a structural question this heuristic doesn't try to
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

function isBlankCell(doc: GridDoc, x: number, y: number): boolean {
  const cell = getCell(doc, x, y);
  return !cell || cell.ch === ' ';
}

/** The role a cell plays when an edge is traced across it — see the module doc. */
type EdgeRole = 'rail' | 'corner' | 'slack' | 'break';

/**
 * Trace one edge from the confirmed anchor corner at (ax, ay), stepping by
 * (dx, dy) toward the opposite corner. `roleOf` scores each cell for this
 * edge; `maxSlackRun` bounds how many CONSECUTIVE slack cells are tolerated (1
 * for the continuous horizontal border, Infinity for the drifting vertical
 * one — the single knob that distinguishes the two edge kinds).
 *
 * Returns the number of steps taken to reach the terminating corner, or null
 * if the edge broke, over-ran its slack budget, or hit the grid edge without
 * closing. All three of detect.ts's former tolerance mechanisms live here now,
 * as the interplay of the four roles and this one run limit.
 */
function alignEdge(
  ax: number,
  ay: number,
  dx: number,
  dy: number,
  limit: number,
  maxSlackRun: number,
  roleOf: (x: number, y: number) => EdgeRole
): number | null {
  let slackRun = 0;
  for (let i = 1; i <= limit; i++) {
    const role = roleOf(ax + dx * i, ay + dy * i);
    if (role === 'break') return null; // unrelated structure — never align past it
    if (role === 'corner') return i; // the edge closes here
    if (role === 'rail') {
      slackRun = 0; // a real border cell resets the run
      continue;
    }
    // slack: an alignment gap. Step over it, but bail once the run of
    // consecutive gaps exceeds what this edge kind tolerates.
    slackRun += 1;
    if (slackRun > maxSlackRun) return null;
  }
  return null;
}

/**
 * Score a cell on a horizontal top/bottom edge aligning toward a corner of
 * shape `isCorner`. A real top border is one continuous run of dashes, so real
 * (non-space, non-box) content or a wrong-shaped connector is a `break`, not
 * `slack` — this only ever papers over a genuinely blank spot, never someone's
 * text or a mis-shaped border character. Pass-through (`─`, or a `┬`/`┴`/`┼`
 * crossing straight through) is scored `rail` BEFORE the corner test, so a
 * shared start always resolves to the larger rectangle.
 */
function horizontalRole(
  doc: GridDoc,
  x: number,
  y: number,
  isCorner: (c: Connectivity) => boolean
): EdgeRole {
  const cell = getCell(doc, x, y);
  if (!cell) return 'slack'; // absent — a gap to heal
  if (cell.continuation) return 'break'; // second column of a wide glyph — real content
  const conn = connectivityOf(cell.ch);
  if (!conn) return cell.ch === ' ' ? 'slack' : 'break'; // blank heals; other text breaks
  if (conn.left && conn.right) return 'rail'; // the top edge passes straight through
  if (isCorner(conn)) return 'corner';
  return 'break'; // a connector of the wrong shape sitting on the border line
}

/**
 * Score a cell on a vertical side edge aligning toward a corner of shape
 * `isCorner`. Unlike the horizontal border, this one is expected to be sparse:
 * blanks and plain label text alike are `slack` (skipped with no run limit),
 * and only a box-drawing character decides the outcome. A vertical
 * pass-through (both up AND down — a plain `│`, or a divider/cross whose
 * vertical arm continues through this cell) is `rail`. A purely horizontal
 * mark (a stray `─` with no vertical component) is off this axis — `slack`.
 * Anything with a vertical component that is neither a through-line nor our
 * corner is unrelated structure — a `break`.
 *
 * A corner-shaped cell is only scored `corner` when it is also attached (see
 * isAttachedCorner); a detached orphan of the right shape is scored `slack`
 * and stepped over, since a real corner may still lie farther along.
 */
function verticalRole(
  doc: GridDoc,
  x: number,
  y: number,
  isCorner: (c: Connectivity) => boolean
): EdgeRole {
  const conn = connAt(doc, x, y);
  if (!conn) return 'slack'; // blank or plain (non-box-drawing) content — border drift
  if (conn.up && conn.down) return 'rail'; // the vertical edge continues past this row
  if (isCorner(conn)) return isAttachedCorner(doc, x, y, conn) ? 'corner' : 'slack';
  if (!conn.up && !conn.down) return 'slack'; // purely horizontal — irrelevant here
  return 'break'; // a vertical shape that doesn't match — unrelated structure
}

/**
 * A corner-shaped cell is only a *real* corner if it isn't floating alone in
 * blank space — otherwise it's a stray, disconnected character that happens
 * to share a corner's connectivity signature without being attached to
 * anything (e.g. an isolated `┘` sitting in blank padding, confirmed as a
 * real case in user-provided input: every one of its four neighboring cells
 * is a literal space). This is what makes verticalRole score such an orphan
 * `slack` (stepped over) rather than `corner`.
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
 * Checked once per candidate corner, not per plain slack cell, so this stays
 * cheap.
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
 * Every blank/gap cell along a straight run, and what should fill it — no
 * limit on how many (unlike detection's alignment slack budget, which exists
 * to decide whether a box exists at all; once a box's corners are already
 * confirmed, every gap along its edges gets healed for rendering/export).
 * Real, non-blank content already there (T-junctions, crosses, or a stray
 * character that doesn't belong to this box) is left untouched — same
 * never-heal-real-content principle as an edge trace's `break`/off-axis cells.
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
    if (isBlankCell(doc, x, y)) healed.push({ x, y, ch: healChar });
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

      // Top edge: align rightward toward the top-right corner (left+down),
      // tolerating at most one consecutive blank (continuous-border rule).
      const topSteps = alignEdge(x, y, 1, 0, maxX - x, 1, (cx, cy) =>
        horizontalRole(doc, cx, cy, (c) => c.left && c.down)
      );
      if (topSteps === null) continue;
      const x2 = x + topSteps;

      // Vertical edges: align downward independently down column x (toward the
      // bottom-left corner) and column x2 (toward the bottom-right), with no
      // slack limit (drifting-border rule). Both must close on the same row.
      const leftSteps = alignEdge(x, y, 0, 1, maxY - y, Infinity, (cx, cy) =>
        verticalRole(doc, cx, cy, (c) => c.up && c.right)
      );
      if (leftSteps === null) continue;
      const rightSteps = alignEdge(x2, y, 0, 1, maxY - y, Infinity, (cx, cy) =>
        verticalRole(doc, cx, cy, (c) => c.left && c.up)
      );
      if (rightSteps === null || rightSteps !== leftSteps) continue;
      const y2 = y + leftSteps;

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
