import { describe, it, expect } from 'vitest';
import { parseDiagram } from '@/lib/parse';
import { detectBoxes } from '@/lib/detect';
import { addBox, boxText, defaultAddPosition, moveBox, removeBox, resizeBox, setBoxText } from '@/lib/ops';

function boxesOf(text: string) {
  return detectBoxes(parseDiagram(text));
}

describe('moveBox', () => {
  it('translates the whole box (border + content) by the given delta', () => {
    const original = ['┌───┐', '│ x │', '└───┘'].join('\n');
    const doc = parseDiagram(original);
    const [box] = boxesOf(original);
    const moved = moveBox(doc, box, 3, 2);
    const lines = moved.split('\n');
    expect(lines[2]).toBe('   ┌───┐');
    expect(lines[3]).toBe('   │ x │');
    expect(lines[4]).toBe('   └───┘');
    // old location is cleared
    expect(lines[0]).toBe('');
  });

  it('clamps a move to non-negative coordinates', () => {
    const original = ['┌───┐', '│ x │', '└───┘'].join('\n');
    const doc = parseDiagram(original);
    const [box] = boxesOf(original);
    const moved = moveBox(doc, box, -10, -10);
    expect(boxesOf(moved)).toEqual([{ x1: 0, y1: 0, x2: 4, y2: 2 }]);
  });

  it('is a no-op when moved to its own position', () => {
    const original = ['┌───┐', '│ x │', '└───┘'].join('\n');
    const doc = parseDiagram(original);
    const [box] = boxesOf(original);
    expect(moveBox(doc, box, box.x1, box.y1)).toBe(original);
  });
});

describe('resizeBox', () => {
  it('grows the border and keeps the top-left corner fixed', () => {
    const original = ['┌───┐', '│ x │', '└───┘'].join('\n');
    const doc = parseDiagram(original);
    const [box] = boxesOf(original);
    const resized = resizeBox(doc, box, 8, 5);
    const boxes = boxesOf(resized);
    expect(boxes).toEqual([{ x1: 0, y1: 0, x2: 7, y2: 4 }]);
  });

  it('preserves existing text when growing', () => {
    const original = ['┌───┐', '│ x │', '└───┘'].join('\n');
    const doc = parseDiagram(original);
    const [box] = boxesOf(original);
    const resized = resizeBox(doc, box, 10, 5);
    expect(resized).toContain('x');
  });

  it('clips text that no longer fits when shrinking', () => {
    const original = ['┌──────────┐', '│ long text│', '└──────────┘'].join('\n');
    const doc = parseDiagram(original);
    const [box] = boxesOf(original);
    const resized = resizeBox(doc, box, 5, 3);
    const resizedDoc = parseDiagram(resized);
    const [shrunk] = boxesOf(resized);
    expect(shrunk).toEqual({ x1: 0, y1: 0, x2: 4, y2: 2 });
    // the interior text was clipped to fit, not left overflowing the new border
    expect(boxText(resizedDoc, shrunk).length).toBeLessThanOrEqual(3);
  });

  it('never shrinks below the minimum size', () => {
    const original = ['┌───┐', '│ x │', '└───┘'].join('\n');
    const doc = parseDiagram(original);
    const [box] = boxesOf(original);
    const resized = resizeBox(doc, box, 1, 1);
    const [shrunk] = boxesOf(resized);
    expect(shrunk.x2 - shrunk.x1 + 1).toBeGreaterThanOrEqual(3);
    expect(shrunk.y2 - shrunk.y1 + 1).toBeGreaterThanOrEqual(3);
  });
});

describe('setBoxText', () => {
  it('replaces the interior text', () => {
    const original = ['┌──────┐', '│ old  │', '└──────┘'].join('\n');
    const doc = parseDiagram(original);
    const [box] = boxesOf(original);
    const updated = setBoxText(doc, box, 'new');
    expect(updated).toContain('new');
    expect(updated).not.toContain('old');
  });

  it('supports multi-line text, one line per interior row', () => {
    const original = ['┌──────┐', '│      │', '│      │', '└──────┘'].join('\n');
    const doc = parseDiagram(original);
    const [box] = boxesOf(original);
    const updated = setBoxText(doc, box, 'one\ntwo');
    const lines = updated.split('\n');
    expect(lines[1]).toContain('one');
    expect(lines[2]).toContain('two');
  });

  it('never splits a double-width glyph across the clip boundary', () => {
    // interior width is 3; "AB日" is A(1)+B(1)+日(2) = 4, one column too wide
    const original = ['┌───┐', '│   │', '└───┘'].join('\n');
    const doc = parseDiagram(original);
    const [box] = boxesOf(original);
    const updated = setBoxText(doc, box, 'AB日');
    const updatedDoc = parseDiagram(updated);
    // 日 (width 2) doesn't fit after "AB" in a 3-wide interior, so it's dropped
    // whole — never emitting a lone continuation cell with no glyph before it.
    expect(boxText(updatedDoc, box)).toBe('AB');
  });
});

describe('addBox / removeBox', () => {
  it('adds a new empty box at the given position', () => {
    const doc = parseDiagram('');
    const withBox = addBox(doc, 0, 0, 6, 3);
    expect(boxesOf(withBox)).toEqual([{ x1: 0, y1: 0, x2: 5, y2: 2 }]);
  });

  it('removes a box entirely, clearing its rectangle', () => {
    const original = ['┌───┐', '│ x │', '└───┘'].join('\n');
    const doc = parseDiagram(original);
    const [box] = boxesOf(original);
    const cleared = removeBox(doc, box);
    expect(boxesOf(cleared)).toEqual([]);
    expect(cleared.trim()).toBe('');
  });

  it('leaves other boxes untouched when removing one', () => {
    const original = ['┌───┐ ┌───┐', '│ a │ │ b │', '└───┘ └───┘'].join('\n');
    const doc = parseDiagram(original);
    const [a] = boxesOf(original);
    const after = removeBox(doc, a);
    expect(boxesOf(after)).toHaveLength(1);
    expect(after).toContain('b');
  });
});

describe('defaultAddPosition', () => {
  it('starts at the origin for an empty document', () => {
    expect(defaultAddPosition(parseDiagram(''))).toEqual({ x: 0, y: 0 });
  });

  it('places a new box one row below the last content row', () => {
    const doc = parseDiagram(['┌───┐', '│ x │', '└───┘'].join('\n'));
    expect(defaultAddPosition(doc)).toEqual({ x: 0, y: 4 });
  });
});
