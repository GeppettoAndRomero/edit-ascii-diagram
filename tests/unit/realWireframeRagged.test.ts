/**
 * The exact real-world ragged wireframe fixture that exposed the original
 * "0 boxes detected, no diagnostics" bug. See tests/fixtures/realWireframeRagged.ts
 * for the verbatim source and a summary of the finding below.
 *
 * IMPORTANT — this test documents the MEASURED, actual behavior of tolerant
 * detection against this specific fixture, not an assumed one. Direct
 * inspection (see the per-row breakdown in this file's second describe
 * block) found that this fixture's raggedness is NOT limited to isolated
 * single-cell gaps, which is the only thing the tolerant-detection design
 * heals (see detect.ts's module doc — the healing radius is fixed at
 * exactly 1 cell, deliberately, so it can't bridge a gap wide enough to risk
 * detecting a box the user never drew). Concretely, on the outer box's right
 * edge alone:
 *
 *   row  1: gap width 4    row  9: gap width 3
 *   row  3: gap width 2    row 10: gap width 6
 *   row  6: gap width 1 ✓  row 12: gap width 3
 *   row  7: gap width 1 ✓  row 13: gap width 6
 *   row 11: a real '┘' character sitting on the scan column (not a gap at all)
 *
 * Only rows 6 and 7 are within the 1-cell healing radius; every other listed
 * row is not, by design. The inner boxes (the 2-column split, and the
 * WorkspaceDetailView-adjacent box) hit the same kind of multi-cell
 * misalignment and/or real text content overlapping their own border
 * columns on independent inspection. Net result: this fixture still
 * produces 0 detected boxes even with tolerant detection — a real,
 * confirmed limitation of the fixed 1-cell healing radius as specified, not
 * a bug in this test or in detect.ts's implementation of that spec. Flagged
 * to the requester; the mechanism itself (heals a genuine isolated 1-cell
 * gap, correctly refuses to bridge 2+) is proven by
 * tests/unit/healing.test.ts's controlled fixtures, including one built
 * from THIS exact box shape with a single manufactured 1-cell gap.
 */
import { describe, it, expect } from 'vitest';
import { parseDiagram } from '@/lib/parse';
import { bounds, getCell } from '@/lib/grid';
import { detectBoxes, detectBoxesWithHealing } from '@/lib/detect';
import { REAL_WIREFRAME_RAGGED } from '../fixtures/realWireframeRagged';

describe('the real ragged wireframe fixture: measured per-edge evidence', () => {
  const doc = parseDiagram(REAL_WIREFRAME_RAGGED);
  const { maxX, maxY } = bounds(doc);

  it('parses to the expected grid size (99 x 18) — sanity check on the fixture itself', () => {
    expect(maxX).toBe(99);
    expect(maxY).toBe(17);
  });

  it('confirms the outer box\'s top/left/bottom-right corners are exact — only the right edge is ragged', () => {
    expect(getCell(doc, 0, 0)).toEqual({ ch: '┌', continuation: false });
    expect(getCell(doc, 90, 0)).toEqual({ ch: '┐', continuation: false });
    expect(getCell(doc, 0, 17)).toEqual({ ch: '└', continuation: false });
    expect(getCell(doc, 90, 17)).toEqual({ ch: '┘', continuation: false });
    for (let y = 1; y <= 16; y++) expect(getCell(doc, 0, y)).toEqual({ ch: '│', continuation: false });
  });

  it('finds exactly 2 single-cell-healable rows and several wider/invalid ones on the right edge (x=90)', () => {
    const rows: Record<number, { kind: 'ok' | 'gap' | 'invalid'; width?: number; ch?: string }> = {};
    for (let y = 1; y <= 16; y++) {
      const cell = getCell(doc, 90, y);
      if (cell?.ch === '│') {
        rows[y] = { kind: 'ok' };
        continue;
      }
      if (cell && cell.ch !== ' ') {
        rows[y] = { kind: 'invalid', ch: cell.ch };
        continue;
      }
      let width = 0;
      for (let x = 90; x <= maxX; x++) {
        const c = getCell(doc, x, y);
        if (c?.ch === '│') break;
        width++;
      }
      rows[y] = { kind: 'gap', width };
    }

    const singleCellGapRows = Object.entries(rows).filter(([, r]) => r.kind === 'gap' && r.width === 1);
    const widerGapRows = Object.entries(rows).filter((r) => r[1].kind === 'gap' && r[1].width! > 1);
    const invalidRows = Object.entries(rows).filter(([, r]) => r.kind === 'invalid');

    expect(singleCellGapRows.map(([y]) => Number(y))).toEqual([6, 7]);
    expect(widerGapRows.length).toBeGreaterThan(0); // rows 1,3,9,10,12,13 — not healable by design
    expect(invalidRows).toEqual([['11', { kind: 'invalid', ch: '┘' }]]); // the noted stray character
  });

  it('still detects 0 boxes even with tolerant detection, because the raggedness exceeds the 1-cell healing radius', () => {
    // This is the honest, measured result for this exact input — see this
    // file's module doc for the full explanation. It is not the outcome
    // requested (a fully healed outer + inner box structure), and is flagged
    // as a conflict between the fixed-1-cell-radius spec and this particular
    // real-world input rather than silently asserting a result that isn't true.
    expect(detectBoxes(doc)).toEqual([]);
    expect(detectBoxesWithHealing(doc)).toEqual([]);
  });

  it('the stray ┘ character (row 11) renders as inert content, not a phantom box or a crash', () => {
    // It sits at a column that happens to coincide with the outer box's
    // right-edge scan for this fixture, but detection never crashes or
    // treats it as a corner on its own (it lacks right+down connectivity,
    // so it's never even tried as a top-left start) — it simply survives
    // untouched, exactly like tests/unit/healing.test.ts's simpler isolated
    // case, just unlucky enough here to also be *why* one particular row
    // fails the outer box's edge check (see the 'invalid' row 11 above).
    expect(() => detectBoxes(doc)).not.toThrow();
    expect(getCell(doc, 90, 11)).toEqual({ ch: '┘', continuation: false });
  });
});
