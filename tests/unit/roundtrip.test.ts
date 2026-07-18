/**
 * D13: byte-identical round trip is NOT the goal for this tool (unlike
 * sibling tools/edit-flowchart) — output is always a fully regenerated grid.
 * What must hold instead: importing a diagram and immediately exporting it
 * again with no edits, then re-parsing that export, recovers the same box
 * structure — same count, same position, same contained text — that was
 * detected right after the original import.
 */
import { describe, it, expect } from 'vitest';
import { parseDiagram } from '@/lib/parse';
import { printGrid } from '@/lib/print';
import { detectBoxes } from '@/lib/detect';
import { boxText } from '@/lib/ops';
import { ASCII_ONLY, BASIC_NESTED, EMOJI_BOX, WIREFRAME } from '../fixtures/diagrams';

function structureOf(text: string) {
  const doc = parseDiagram(text);
  const boxes = detectBoxes(doc)
    .map((b) => ({ x1: b.x1, y1: b.y1, x2: b.x2, y2: b.y2, text: boxText(doc, b) }))
    // stable order for comparison
    .sort((a, b) => a.y1 - b.y1 || a.x1 - b.x1 || a.x2 - b.x2 || a.y2 - b.y2);
  return boxes;
}

describe.each([
  ['ASCII-only box', ASCII_ONLY],
  ['basic nested boxes', BASIC_NESTED],
  ['a box containing a multi-codepoint emoji sequence', EMOJI_BOX],
  ['Japanese UI wireframe with emoji icons', WIREFRAME],
])('round trip: %s', (_label, fixture) => {
  it('import -> export (no edits) -> re-parse recovers the same box structure', () => {
    const original = structureOf(fixture);
    expect(original.length).toBeGreaterThan(0);

    const doc = parseDiagram(fixture);
    const exported = printGrid(doc);
    const reimported = structureOf(exported);

    expect(reimported).toEqual(original);
  });

  it('is idempotent under a second export/re-parse cycle', () => {
    const once = printGrid(parseDiagram(fixture));
    const twice = printGrid(parseDiagram(once));
    expect(twice).toBe(once);
    expect(structureOf(twice)).toEqual(structureOf(once));
  });
});

describe('round trip: box counts for known fixtures', () => {
  it('finds exactly 2 boxes in the basic nested fixture (outer + inner)', () => {
    expect(structureOf(BASIC_NESTED)).toHaveLength(2);
  });

  it('finds exactly 1 box in the ASCII-only fixture', () => {
    expect(structureOf(ASCII_ONLY)).toHaveLength(1);
  });

  it('finds the outer frame, the search box, and the two side-by-side boxes in the wireframe', () => {
    const boxes = structureOf(WIREFRAME);
    // outer frame, header-divider sub-rectangle, search box, profile box, stats box
    expect(boxes.length).toBeGreaterThanOrEqual(4);
    const widths = boxes.map((b) => b.x2 - b.x1 + 1);
    expect(Math.max(...widths)).toBe(37); // the outer frame spans the full 37-column canvas
  });
});
