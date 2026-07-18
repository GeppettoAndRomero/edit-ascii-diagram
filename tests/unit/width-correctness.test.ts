/**
 * The width-correctness test issue #115 exists to prove: a box-drawing
 * diagram whose content mixes ASCII, full-width Japanese characters, and
 * emoji (including a multi-codepoint ZWJ sequence) must have its border
 * columns land in the same place the parser reads them — not shifted by
 * mistaking a double-width glyph for a single grid column, the exact,
 * audited bug in this tool's prior-art competitors (see boxChars.ts / the
 * issue). This is checked structurally (asserted box corner coordinates),
 * not just visually.
 */
import { describe, it, expect } from 'vitest';
import { parseDiagram } from '@/lib/parse';
import { printGrid } from '@/lib/print';
import { detectBoxes } from '@/lib/detect';

describe('width-correctness: mixed ASCII/CJK/emoji column alignment', () => {
  // Interior content "A日😀B" is A(1) + 日(2, fullwidth) + 😀(2, emoji) + B(1)
  // = 6 display columns, so the box is exactly 8 display columns wide
  // (2 borders + 6 interior). A parser that walks UTF-16 code units instead
  // of display columns would count 日 as 1 column (instead of 2) and 😀 (a
  // surrogate pair) as 2 *code units* that don't line up with display
  // columns either — either way the content row's border character would
  // land at a different column index than the top/bottom borders' corners.
  const TOP = '┌──────┐';
  const MID = '│A日😀B│';
  const BOTTOM = '└──────┘';
  const input = [TOP, MID, BOTTOM].join('\n');

  it('detects one box whose right border is at the correct column (not shifted)', () => {
    const doc = parseDiagram(input);
    const boxes = detectBoxes(doc);
    expect(boxes).toHaveLength(1);
    const [box] = boxes;
    expect(box.x1).toBe(0);
    expect(box.y1).toBe(0);
    expect(box.x2).toBe(7); // 8 display columns wide, i.e. columns 0..7
    expect(box.y2).toBe(2);
  });

  it('re-serializes with every border character at its original column', () => {
    const doc = parseDiagram(input);
    const out = printGrid(doc).split('\n');
    expect(out[0]).toBe(TOP);
    expect(out[1]).toBe(MID);
    expect(out[2]).toBe(BOTTOM);
  });

  it('does not shift alignment for a multi-codepoint ZWJ emoji sequence in the content', () => {
    // A ZWJ family emoji: 4 emoji joined by U+200D — one grapheme cluster,
    // one RGI emoji sequence, display width 2, but 11 UTF-16 code units long.
    const family = '👨‍👩‍👧‍👦';
    expect(family.length).toBeGreaterThan(4); // genuinely several UTF-16 code units, not one

    // interior: "Hi" (2) + family (2) + "!" (1) = 5 display columns -> box is 7 wide.
    const top = '┌─────┐';
    const mid = `│Hi${family}!│`;
    const bottom = '└─────┘';
    const doc = parseDiagram([top, mid, bottom].join('\n'));

    const boxes = detectBoxes(doc);
    expect(boxes).toHaveLength(1);
    expect(boxes[0]).toEqual({ x1: 0, y1: 0, x2: 6, y2: 2 });

    const out = printGrid(doc).split('\n');
    expect(out).toEqual([top, mid, bottom]);
  });

  it('places the double-width glyph and its continuation cell at the exact expected grid coordinates', () => {
    // "A日B" inside a box: A@col1(w1), 日@col2(w2, continuation@col3), B@col4(w1).
    const doc = parseDiagram(['┌─────┐', '│A日B │', '└─────┘'].join('\n'));
    const a = doc.cells.get('1,1');
    const wide = doc.cells.get('2,1');
    const continuation = doc.cells.get('3,1');
    const b = doc.cells.get('4,1');
    expect(a).toEqual({ ch: 'A', continuation: false });
    expect(wide).toEqual({ ch: '日', continuation: false });
    expect(continuation).toEqual({ ch: '', continuation: true });
    expect(b).toEqual({ ch: 'B', continuation: false });
  });
});
