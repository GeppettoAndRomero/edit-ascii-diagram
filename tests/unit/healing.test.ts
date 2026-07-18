/**
 * Tolerant detection (border-gap healing) — see detect.ts's module doc.
 * Covers the mechanism in isolation (a genuine single-cell gap heals; a
 * two-cell gap correctly does not — the tolerance boundary itself, not just
 * the happy path), the healed-cell count exposed for the UI notice, healing
 * baked into edits via lib/ops.ts, and the real-world fixture that motivated
 * this feature (tests/unit/realWireframeRagged.test.ts covers that one in
 * full detail; see that file for why it is NOT a simple "now detects"
 * result).
 */
import { describe, it, expect } from 'vitest';
import { parseDiagram } from '@/lib/parse';
import { printGrid } from '@/lib/print';
import { detectBoxes, detectBoxesWithHealing, healBoxEdges } from '@/lib/detect';
import { getCell, setCell } from '@/lib/grid';
import { moveBox, resizeBox, setBoxText, boxText } from '@/lib/ops';

/** A clean 10x3 box, then punch a hole at (x, y) to simulate a ragged paste. */
function boxWithGapAt(x: number, y: number): string {
  const doc = parseDiagram(['┌────────┐', '│        │', '└────────┘'].join('\n'));
  setCell(doc, x, y, null);
  return printGrid(doc);
}

describe('tolerant detection: a single isolated blank cell heals', () => {
  it('detects the box through a single missing cell on the top edge', () => {
    const text = boxWithGapAt(3, 0); // punch a hole in the top border
    expect(detectBoxes(parseDiagram(text))).toEqual([{ x1: 0, y1: 0, x2: 9, y2: 2 }]);
  });

  it('detects the box through a single missing cell on the bottom edge', () => {
    const text = boxWithGapAt(6, 2);
    expect(detectBoxes(parseDiagram(text))).toEqual([{ x1: 0, y1: 0, x2: 9, y2: 2 }]);
  });

  it('detects the box through a single missing cell on the left edge', () => {
    const text = boxWithGapAt(0, 1);
    expect(detectBoxes(parseDiagram(text))).toEqual([{ x1: 0, y1: 0, x2: 9, y2: 2 }]);
  });

  it('detects the box through a single missing cell on the right edge', () => {
    const text = boxWithGapAt(9, 1);
    expect(detectBoxes(parseDiagram(text))).toEqual([{ x1: 0, y1: 0, x2: 9, y2: 2 }]);
  });

  it('heals a literal explicit space character the same as a missing cell', () => {
    const doc = parseDiagram(['┌────────┐', '│        │', '└────────┘'].join('\n'));
    setCell(doc, 4, 0, { ch: ' ', continuation: false }); // explicit space, not just absent
    expect(detectBoxes(doc)).toEqual([{ x1: 0, y1: 0, x2: 9, y2: 2 }]);
  });

  it('reports the healed cell with the correct fill character', () => {
    const text = boxWithGapAt(3, 0); // top edge -> horizontal fill
    const [detailed] = detectBoxesWithHealing(parseDiagram(text));
    expect(detailed.healed).toEqual([{ x: 3, y: 0, ch: '─' }]);
  });

  it('reports a vertical-edge heal with the correct fill character', () => {
    const text = boxWithGapAt(0, 1); // left edge -> vertical fill
    const [detailed] = detectBoxesWithHealing(parseDiagram(text));
    expect(detailed.healed).toEqual([{ x: 0, y: 1, ch: '│' }]);
  });
});

describe('tolerant detection boundary: the TOP edge (unchanged) rejects two-or-more consecutive blanks', () => {
  // The horizontal top-edge scan is unchanged from the original design: a
  // real top border row is typically drawn as one continuous, deliberate
  // run of dashes, so a wider gap there really does mean "this isn't a
  // closed box" — see detect.ts's module doc. The VERTICAL edges are a
  // different story (below): they're corner-anchored, not edge-walked, so a
  // gap of any width between two confirmed corners is fine — that's the
  // actual fix for the real ragged wireframe (tests/unit/realWireframeRagged
  // .test.ts), where interior rows commonly have no border character at the
  // expected column at all, not just one cell short.
  it('does not detect a box with a 2-cell gap on the top edge', () => {
    const doc = parseDiagram(['┌────────┐', '│        │', '└────────┘'].join('\n'));
    setCell(doc, 3, 0, null);
    setCell(doc, 4, 0, null); // two consecutive
    expect(detectBoxes(doc)).toEqual([]);
  });

  it('does not bridge two separate single-cell gaps into one larger healed run', () => {
    // Two isolated 1-cell gaps, each individually flanked by real border —
    // this SHOULD still heal (they are not consecutive with each other).
    const doc = parseDiagram(['┌──────────┐', '│          │', '└──────────┘'].join('\n'));
    setCell(doc, 3, 0, null);
    setCell(doc, 7, 0, null); // separated by real '─' cells in between
    const boxes = detectBoxes(doc);
    expect(boxes).toEqual([{ x1: 0, y1: 0, x2: 11, y2: 2 }]);
  });

  it('does not heal a real (non-blank) character sitting on the border line', () => {
    // A stray box-drawing character of the wrong shape is real content, not
    // a gap — this must not be papered over even though it's a single cell.
    const doc = parseDiagram(['┌────────┐', '│        │', '└────────┘'].join('\n'));
    setCell(doc, 4, 0, { ch: '┘', continuation: false });
    expect(detectBoxes(doc)).toEqual([]);
  });

  it('does not heal arbitrary text content sitting on the border line', () => {
    const doc = parseDiagram(['┌────────┐', '│        │', '└────────┘'].join('\n'));
    setCell(doc, 4, 0, { ch: 'X', continuation: false });
    expect(detectBoxes(doc)).toEqual([]);
  });
});

describe('corner-anchored vertical edges: gaps of any width between confirmed corners are fine', () => {
  it('detects a box whose entire right column is blank for several rows in a row', () => {
    // A gap far wider than 1 cell — exactly the real-world case (padding
    // drift across many interior rows) the 1-cell tolerance couldn't cover.
    const doc = parseDiagram(['┌────────┐', '│        │', '│        │', '│        │', '└────────┘'].join('\n'));
    setCell(doc, 9, 1, null);
    setCell(doc, 9, 2, null);
    setCell(doc, 9, 3, null);
    expect(detectBoxes(doc)).toEqual([{ x1: 0, y1: 0, x2: 9, y2: 4 }]);
  });

  it('detects a box whose left column has real text content bleeding into it (skipped, not a border char)', () => {
    const doc = parseDiagram(['┌────────┐', '│hi      │', '└────────┘'].join('\n'));
    setCell(doc, 0, 1, { ch: 'X', continuation: false }); // real content sitting where '│' should be
    expect(detectBoxes(doc)).toEqual([{ x1: 0, y1: 0, x2: 9, y2: 2 }]);
  });

  it('detects a box with wide gaps on both the left and right columns simultaneously', () => {
    const doc = parseDiagram(['┌────────┐', '│        │', '│        │', '└────────┘'].join('\n'));
    setCell(doc, 0, 1, null);
    setCell(doc, 0, 2, null);
    setCell(doc, 9, 1, null);
    setCell(doc, 9, 2, null);
    expect(detectBoxes(doc)).toEqual([{ x1: 0, y1: 0, x2: 9, y2: 3 }]);
  });

  it('reports every gap cell healed, not capped at one, once corners are confirmed', () => {
    const doc = parseDiagram(['┌────────┐', '│        │', '│        │', '│        │', '└────────┘'].join('\n'));
    setCell(doc, 9, 1, null);
    setCell(doc, 9, 2, null);
    setCell(doc, 9, 3, null);
    const [detailed] = detectBoxesWithHealing(doc);
    expect(detailed.healed).toEqual([
      { x: 9, y: 1, ch: '│' },
      { x: 9, y: 2, ch: '│' },
      { x: 9, y: 3, ch: '│' },
    ]);
  });
});

describe('corner-anchored vertical edges: the safety boundary against pairing across unrelated structure', () => {
  // The property that actually keeps corner-anchoring safe: if the first
  // corner-shaped cell found while scanning down a column is NOT the shape
  // we want, that means we've walked into a different, unrelated piece of
  // structure — the scan must stop and reject right there, never skip past
  // it hoping to find a farther, coincidentally-matching corner. Without
  // this, a "bigger box" with a missing bottom border could silently swallow
  // a genuinely separate smaller box sitting in the gap below it.
  it('stops at a separate smaller box\'s own top corner rather than pairing with a farther unrelated bottom corner', () => {
    // "Outer" candidate: a real ┌────┐ top row, but its own bottom border
    // was never drawn (just a blank line) — if the left-column scan skipped
    // past ANY corner-shaped cell looking only for a shape match, it would
    // walk straight through the smaller, wholly separate box below and
    // incorrectly close the "outer" box at the smaller box's own bottom
    // corner, spanning across unrelated structure.
    const text = ['┌────┐', '│    │', '', '┌───┐', '│   │', '└───┘'].join('\n');
    const doc = parseDiagram(text);
    const boxes = detectBoxes(doc);

    // The wrongly-paired box would be exactly this — it must NOT appear.
    expect(boxes).not.toContainEqual({ x1: 0, y1: 0, x2: 5, y2: 5 });
    // The small, separate box is still detected correctly on its own.
    expect(boxes).toContainEqual({ x1: 0, y1: 3, x2: 4, y2: 5 });
    // And nothing masquerades as the outer box at all.
    expect(boxes.filter((b) => b.y1 === 0)).toEqual([]);
  });

  it('rejects when the left and right column scans land on different rows', () => {
    // Left column closes cleanly at row 2; right column's corner is missing
    // entirely (runs off the grid) — the two must agree, or the box doesn't exist.
    const doc = parseDiagram(['┌───┐', '│   │', '└───┘'].join('\n'));
    setCell(doc, 4, 2, null); // right column never finds its bottom-right corner
    expect(detectBoxes(doc)).toEqual([]);
  });
});

describe('healBoxEdges: re-derives healed cells for an already-known box', () => {
  it('finds the same single gap ops.ts needs to fill in', () => {
    const doc = parseDiagram(boxWithGapAt(3, 0));
    const healed = healBoxEdges(doc, { x1: 0, y1: 0, x2: 9, y2: 2 });
    expect(healed).toEqual([{ x: 3, y: 0, ch: '─' }]);
  });

  it('returns an empty list for a box with no gaps', () => {
    const doc = parseDiagram(['┌────────┐', '│        │', '└────────┘'].join('\n'));
    const healed = healBoxEdges(doc, { x1: 0, y1: 0, x2: 9, y2: 2 });
    expect(healed).toEqual([]);
  });
});

describe('healing is baked into edits (not just detection/display)', () => {
  it('moveBox carries the healed border to the new position', () => {
    const doc = parseDiagram(boxWithGapAt(3, 0));
    const [box] = detectBoxes(doc);
    const moved = moveBox(doc, box, 5, 5);
    const lines = moved.split('\n');
    // the box moved to (5,5); its top border row (row 5) should be a whole,
    // unbroken run of dashes — no reproduced gap.
    expect(lines[5]).toBe('     ┌────────┐');
  });

  it('setBoxText (relabel) heals the border while replacing the interior text', () => {
    const doc = parseDiagram(boxWithGapAt(3, 0));
    const [box] = detectBoxes(doc);
    const relabeled = setBoxText(doc, box, 'hi');
    const lines = relabeled.split('\n');
    expect(lines[0]).toBe('┌────────┐'); // gap filled, not reproduced
    expect(boxText(parseDiagram(relabeled), box)).toBe('hi');
  });

  it('resizeBox heals the border as a side effect of its unconditional full redraw', () => {
    const doc = parseDiagram(boxWithGapAt(3, 0));
    const [box] = detectBoxes(doc);
    const resized = resizeBox(doc, box, 12, 3);
    expect(resized.split('\n')[0]).toBe('┌──────────┐'); // whole border, wider, no gap
  });
});

describe('healing count for the UI notice', () => {
  it('counts distinct healed cells across all detected boxes, deduplicated', () => {
    const doc = parseDiagram(['┌──────────┐', '│          │', '└──────────┘'].join('\n'));
    setCell(doc, 3, 0, null);
    setCell(doc, 7, 0, null);
    const detailed = detectBoxesWithHealing(doc);
    const seen = new Set(detailed.flatMap((d) => d.healed.map((h) => `${h.x},${h.y}`)));
    expect(seen.size).toBe(2);
  });

  it('is zero for a diagram with no gaps at all', () => {
    const doc = parseDiagram(['┌────────┐', '│        │', '└────────┘'].join('\n'));
    const detailed = detectBoxesWithHealing(doc);
    const seen = new Set(detailed.flatMap((d) => d.healed.map((h) => `${h.x},${h.y}`)));
    expect(seen.size).toBe(0);
  });
});

describe('a stray disconnected box-drawing character is inert', () => {
  it('does not become a phantom 1x1 box and does not affect an unrelated box elsewhere', () => {
    const doc = parseDiagram(
      ['┌────────┐', '│  ┘     │', '└────────┘'].join('\n') // a stray ┘ floating in open interior
    );
    const boxes = detectBoxes(doc);
    expect(boxes).toEqual([{ x1: 0, y1: 0, x2: 9, y2: 2 }]);
    // the stray character survives untouched, not healed, not erased.
    expect(getCell(doc, 3, 1)).toEqual({ ch: '┘', continuation: false });
  });
});
