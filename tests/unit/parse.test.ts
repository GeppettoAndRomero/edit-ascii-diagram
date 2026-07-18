import { describe, it, expect } from 'vitest';
import { parseDiagram } from '@/lib/parse';
import { getCell } from '@/lib/grid';

describe('parseDiagram', () => {
  it('places single-width ASCII characters at sequential columns', () => {
    const doc = parseDiagram('AB');
    expect(getCell(doc, 0, 0)).toEqual({ ch: 'A', continuation: false });
    expect(getCell(doc, 1, 0)).toEqual({ ch: 'B', continuation: false });
  });

  it('records rowCount for blank lines even though they place no cells', () => {
    const doc = parseDiagram('a\n\n\nb');
    expect(doc.rowCount).toBe(4);
    expect(doc.cells.size).toBe(2); // just 'a' and 'b'
  });

  it('normalizes CRLF and CR line endings', () => {
    const crlf = parseDiagram('a\r\nb');
    expect(crlf.rowCount).toBe(2);
    const cr = parseDiagram('a\rb');
    expect(cr.rowCount).toBe(2);
  });

  it('handles an empty string as a single empty row', () => {
    const doc = parseDiagram('');
    expect(doc.rowCount).toBe(1);
    expect(doc.cells.size).toBe(0);
  });

  it('places a lone combining mark (0-width cluster) into a real column rather than dropping it', () => {
    // A leading combining acute accent with nothing to attach to is a rare
    // but real edge case; the clamp in parse.ts (Math.max(1, clusterWidth))
    // guarantees it still consumes one column instead of vanishing and
    // silently shifting every subsequent glyph left.
    const doc = parseDiagram('́X');
    expect(getCell(doc, 0, 0)?.ch).toBe('́');
    expect(getCell(doc, 1, 0)).toEqual({ ch: 'X', continuation: false });
  });
});
