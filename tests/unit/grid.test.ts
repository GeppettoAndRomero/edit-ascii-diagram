import { describe, it, expect } from 'vitest';
import { bounds, cloneDoc, emptyDoc, getCell, setCell } from '@/lib/grid';

describe('grid', () => {
  it('starts empty', () => {
    const doc = emptyDoc();
    expect(doc.cells.size).toBe(0);
    expect(doc.rowCount).toBe(0);
    expect(bounds(doc)).toEqual({ maxX: -1, maxY: -1 });
  });

  it('setCell stores and getCell retrieves by (x, y)', () => {
    const doc = emptyDoc();
    setCell(doc, 2, 3, { ch: 'X', continuation: false });
    expect(getCell(doc, 2, 3)).toEqual({ ch: 'X', continuation: false });
    expect(getCell(doc, 3, 3)).toBeUndefined();
  });

  it('setCell(null) clears a cell', () => {
    const doc = emptyDoc();
    setCell(doc, 0, 0, { ch: 'X', continuation: false });
    setCell(doc, 0, 0, null);
    expect(getCell(doc, 0, 0)).toBeUndefined();
  });

  it('setCell grows rowCount but never shrinks it', () => {
    const doc = emptyDoc();
    setCell(doc, 0, 5, { ch: 'X', continuation: false });
    expect(doc.rowCount).toBe(6);
    setCell(doc, 0, 5, null);
    expect(doc.rowCount).toBe(6);
  });

  it('bounds reflects the max placed (x, y) across all cells', () => {
    const doc = emptyDoc();
    setCell(doc, 5, 1, { ch: 'X', continuation: false });
    setCell(doc, 2, 9, { ch: 'Y', continuation: false });
    expect(bounds(doc)).toEqual({ maxX: 5, maxY: 9 });
  });

  it('getCell returns undefined for negative coordinates', () => {
    const doc = emptyDoc();
    expect(getCell(doc, -1, 0)).toBeUndefined();
  });

  it('cloneDoc makes an independent copy', () => {
    const doc = emptyDoc();
    setCell(doc, 0, 0, { ch: 'X', continuation: false });
    const clone = cloneDoc(doc);
    setCell(clone, 1, 1, { ch: 'Y', continuation: false });
    expect(getCell(doc, 1, 1)).toBeUndefined();
    expect(getCell(clone, 0, 0)).toEqual({ ch: 'X', continuation: false });
  });
});
