/**
 * The exact real-world ragged wireframe fixture that motivated this tool's
 * detection tolerance work (see tests/fixtures/realWireframeRagged.ts for
 * the verbatim source, and detect.ts's module doc for the design: 1-cell-
 * tolerant horizontal top-edge scans, corner-anchored (unlimited-gap)
 * vertical edge scans, with an attachment check on each candidate corner).
 *
 * Corner-anchored vertical detection recovers all 4 of this fixture's
 * intended nested boxes, plus 3 further legitimate sub-boxes anchored at
 * internal T-junctions (the same connectivity-based design that already
 * lets a divider or a shared wall start its own valid box candidate; see
 * tests/unit/detect.test.ts's "side-by-side boxes" case) — 7 total.
 *
 * The outer box specifically needed one more piece of tolerance beyond
 * plain corner-anchoring to be recoverable:
 *
 *   The stray, disconnected '┘' character at (90, 11) — noted in the
 *   fixture as unrelated to any real box — has connectivity {left, up} with
 *   no other connections: an exact, unambiguous match for a "bottom-right
 *   corner" shape, sitting exactly on column 90, the outer box's own right
 *   edge column. A first version of corner-anchored matching stopped at the
 *   first corner-shaped cell found regardless of whether it was actually
 *   attached to anything, so it stopped here (row 11) instead of continuing
 *   to the real corner at row 17 — the two vertical scans (column 0 finding
 *   17, column 90 finding 11) disagreed, and the outer candidate was
 *   rejected.
 *
 *   detect.ts's isAttachedCorner closes this gap: every neighboring cell of
 *   the stray '┘' (all four directions, not just the two its shape claims)
 *   is a literal blank space — nothing leads into it from anywhere — so it
 *   is skipped as an orphan rather than accepted as a match, and the scan
 *   continues down to the real corner at row 17. Genuine corners elsewhere
 *   in this same fixture have exactly one of their two claimed-direction
 *   neighbors blank (the same interior raggedness that motivated corner-
 *   anchoring in the first place also reaches cells immediately adjacent to
 *   a real corner sometimes) — isAttachedCorner requires only ONE non-blank
 *   claimed-direction neighbor, not both, specifically so it doesn't reject
 *   those. Only a corner with NO real content on either claimed side — the
 *   stray character's actual signature — is treated as an orphan.
 */
import { describe, it, expect } from 'vitest';
import { parseDiagram } from '@/lib/parse';
import { bounds, getCell } from '@/lib/grid';
import { detectBoxes, detectBoxesWithHealing } from '@/lib/detect';
import { REAL_WIREFRAME_RAGGED } from '../fixtures/realWireframeRagged';

describe('the real ragged wireframe fixture', () => {
  const doc = parseDiagram(REAL_WIREFRAME_RAGGED);
  const { maxX, maxY } = bounds(doc);

  it('parses to the expected grid size (99 x 18) — sanity check on the fixture itself', () => {
    expect(maxX).toBe(99);
    expect(maxY).toBe(17);
  });

  it('detects the 4 intended nested boxes, with exact bounds', () => {
    const boxes = detectBoxes(doc);
    expect(boxes).toContainEqual({ x1: 0, y1: 0, x2: 90, y2: 17 }); // TemplatePage (outer)
    expect(boxes).toContainEqual({ x1: 2, y1: 2, x2: 88, y2: 16 });
    expect(boxes).toContainEqual({ x1: 25, y1: 4, x2: 89, y2: 15 }); // WorkspaceDetailView
    expect(boxes).toContainEqual({ x1: 28, y1: 8, x2: 81, y2: 14 });
  });

  it('additionally detects 3 legitimate sub-boxes anchored at internal T-junctions', () => {
    // Same design as the "side-by-side boxes" case in detect.test.ts: a
    // T-junction (here, where the 3-column table's own dividers meet the
    // outer rows) is a valid start/end corner in its own right.
    const boxes = detectBoxes(doc);
    expect(boxes).toContainEqual({ x1: 22, y1: 2, x2: 88, y2: 16 });
    expect(boxes).toContainEqual({ x1: 40, y1: 8, x2: 81, y2: 14 });
    expect(boxes).toContainEqual({ x1: 67, y1: 8, x2: 81, y2: 14 });
    expect(boxes).toHaveLength(7); // exactly the 4 real boxes + these 3, nothing else
  });

  it('confirms the exact mechanism: the stray ┘ is a fully isolated orphan, while the real outer corner has real (if mismatched) neighbors', () => {
    // Independent, direct evidence for the module doc's explanation.
    expect(getCell(doc, 0, 0)).toEqual({ ch: '┌', continuation: false });
    expect(getCell(doc, 90, 0)).toEqual({ ch: '┐', continuation: false });
    expect(getCell(doc, 0, 17)).toEqual({ ch: '└', continuation: false }); // left column's real corner
    expect(getCell(doc, 90, 17)).toEqual({ ch: '┘', continuation: false }); // right column's real corner
    expect(getCell(doc, 90, 11)).toEqual({ ch: '┘', continuation: false }); // the orphan, same shape

    // The orphan: every neighboring cell is blank — nothing leads into it.
    for (const [x, y] of [
      [89, 11],
      [91, 11],
      [90, 10],
      [90, 12],
    ]) {
      const cell = getCell(doc, x, y);
      expect(cell === undefined || cell.ch === ' ').toBe(true);
    }

    // The real corner: its "up" neighbor (90,16) is a genuine │, non-blank —
    // enough on its own for isAttachedCorner, even though its "left"
    // neighbor pattern varies row to row elsewhere in this fixture.
    expect(getCell(doc, 90, 16)).toEqual({ ch: '│', continuation: false });
  });

  it('the stray ┘ (90,11) is not treated as its own phantom box, and the cell itself is left untouched', () => {
    const boxes = detectBoxes(doc);
    expect(boxes).not.toContainEqual({ x1: 90, y1: 11, x2: 90, y2: 11 });

    // (90,11) legitimately sits ON the outer box's real right-edge column
    // and within its row range — that's expected, since column 90/row 11 is
    // genuinely part of the outer box's interior-facing border run. What
    // must NOT happen is this specific cell being overwritten by healing:
    // it already carries a real (if orphaned) box-drawing character, so
    // classifyEdgeCell must treat it as 'connector', never 'gap', and no
    // detected box's healed-cell list may include it.
    const detailed = detectBoxesWithHealing(doc);
    for (const { healed } of detailed) {
      expect(healed.some((h) => h.x === 90 && h.y === 11)).toBe(false);
    }
    expect(getCell(doc, 90, 11)).toEqual({ ch: '┘', continuation: false });
  });

  it('reports the actual computed healed-gap count across all detected boxes (51 distinct cells)', () => {
    // Computed, not guessed: interior rows commonly have no border character
    // at the expected column at all across many consecutive rows, since
    // vertical edges are corner-anchored rather than edge-walked, so the
    // healed count is substantial — now including the outer box's own
    // right-edge gaps once it's correctly detected.
    const detailed = detectBoxesWithHealing(doc);
    const distinctHealed = new Set(detailed.flatMap((d) => d.healed.map((h) => `${h.x},${h.y}`)));
    expect(distinctHealed.size).toBe(51);
  });
});
