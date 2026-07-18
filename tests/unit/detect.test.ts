import { describe, it, expect } from 'vitest';
import { parseDiagram } from '@/lib/parse';
import { boxArea, boxContains, detectBoxes, smallestBoxAt } from '@/lib/detect';

describe('detectBoxes', () => {
  it('detects a single simple box', () => {
    const doc = parseDiagram(['┌───┐', '│ x │', '└───┘'].join('\n'));
    const boxes = detectBoxes(doc);
    expect(boxes).toEqual([{ x1: 0, y1: 0, x2: 4, y2: 2 }]);
  });

  it('detects nothing for an unclosed shape', () => {
    const doc = parseDiagram(['┌───┐', '│ x  ', '  ───┘'].join('\n'));
    expect(detectBoxes(doc)).toEqual([]);
  });

  it('detects nothing for plain text with no box-drawing characters', () => {
    const doc = parseDiagram('just some text\nwith no boxes at all');
    expect(detectBoxes(doc)).toEqual([]);
  });

  it('detects two properly nested boxes', () => {
    const doc = parseDiagram(
      ['┌─────────────┐', '│ ┌─────────┐ │', '│ │ inner   │ │', '│ └─────────┘ │', '└─────────────┘'].join('\n')
    );
    const boxes = detectBoxes(doc);
    expect(boxes).toHaveLength(2);
    const outer = boxes.find((b) => b.x1 === 0)!;
    const inner = boxes.find((b) => b.x1 === 2)!;
    expect(outer).toEqual({ x1: 0, y1: 0, x2: 14, y2: 4 });
    expect(inner).toEqual({ x1: 2, y1: 1, x2: 12, y2: 3 });
  });

  // Regression test for a real bug found while building this tool's fixtures:
  // a `┬`/`┴`/`├`/`┤`/`┼` T-junction where a divider line crosses a box's own
  // border must NOT be mistaken for that box's corner — the outer box's edge
  // has to be recognized as continuing straight through the junction.
  it('does not let a header divider (which touches the outer box border) truncate the outer box', () => {
    const doc = parseDiagram(
      ['┌───────────┐', '│ header    │', '├───────────┤', '│ body      │', '│           │', '└───────────┘'].join(
        '\n'
      )
    );
    const boxes = detectBoxes(doc);
    const outer = boxes.find((b) => b.y1 === 0 && b.x1 === 0)!;
    expect(outer).toBeDefined();
    expect(outer.y2).toBe(5); // spans all the way to the bottom border, not truncated at the divider (row 2)
  });

  it('also finds the divider-bounded body region as its own legitimate sub-rectangle', () => {
    // This is intentional, not a bug: a `├─...─┤` divider forms a real closed
    // rectangle with the box's own left/right/bottom borders, exactly like an
    // internal row divider in a table creates individually selectable cells.
    const doc = parseDiagram(
      ['┌───────────┐', '│ header    │', '├───────────┤', '│ body      │', '└───────────┘'].join('\n')
    );
    const boxes = detectBoxes(doc);
    const bodyOnly = boxes.find((b) => b.y1 === 2);
    expect(bodyOnly).toEqual({ x1: 0, y1: 2, x2: 12, y2: 4 });
  });

  it('finds the outer envelope (not truncated at the shared divider) plus the cell that has its own unshared corner', () => {
    const doc = parseDiagram(['┌───┬───┐', '│ a │ b │', '└───┴───┘'].join('\n'));
    const boxes = detectBoxes(doc);
    // The outer envelope's own top-left corner (0,0) is shared with the left
    // cell's top-left corner, and the pass-through-first priority (see the
    // regression test above) always resolves a shared start to the LARGER
    // rectangle — so only the outer envelope, not the left cell alone, comes
    // out of that particular starting corner. The right cell has its own
    // unshared starting corner (the divider's `┬`), so it's found
    // independently. This is a known, acceptable shape of the heuristic:
    // full spreadsheet-style "every table cell is its own box" detection
    // is out of scope (D2 is nested rectangular boxes, not tables).
    expect(boxes).toContainEqual({ x1: 0, y1: 0, x2: 8, y2: 2 });
    expect(boxes).toContainEqual({ x1: 4, y1: 0, x2: 8, y2: 2 });
    expect(boxes).toHaveLength(2);
  });
});

describe('boxContains / smallestBoxAt', () => {
  const outer = { x1: 0, y1: 0, x2: 15, y2: 4 };
  const inner = { x1: 2, y1: 1, x2: 13, y2: 3 };

  it('boxContains is inclusive of the border', () => {
    expect(boxContains(outer, 0, 0)).toBe(true);
    expect(boxContains(outer, 15, 4)).toBe(true);
    expect(boxContains(outer, 16, 0)).toBe(false);
  });

  it('smallestBoxAt picks the innermost box for a point inside both', () => {
    expect(smallestBoxAt([outer, inner], 5, 2)).toBe(inner);
  });

  it('smallestBoxAt picks the only containing box when just one matches', () => {
    expect(smallestBoxAt([outer, inner], 0, 0)).toBe(outer);
  });

  it('smallestBoxAt returns null when no box contains the point', () => {
    expect(smallestBoxAt([outer, inner], 100, 100)).toBeNull();
  });

  it('boxArea is width times height', () => {
    expect(boxArea({ x1: 0, y1: 0, x2: 3, y2: 1 })).toBe(4 * 2);
  });
});
