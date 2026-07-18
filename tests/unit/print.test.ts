import { describe, it, expect } from 'vitest';
import { parseDiagram } from '@/lib/parse';
import { printGrid } from '@/lib/print';

describe('printGrid', () => {
  it('strips trailing whitespace per line (D13)', () => {
    const doc = parseDiagram('abc   \ndef');
    expect(printGrid(doc)).toBe('abc\ndef');
  });

  it('preserves interior blank lines', () => {
    const doc = parseDiagram('a\n\nb');
    expect(printGrid(doc)).toBe('a\n\nb');
  });

  it('trims a fully-blank trailing tail', () => {
    const doc = parseDiagram('a\n\n\n');
    expect(printGrid(doc)).toBe('a');
  });

  it('round-trips a plain box unchanged', () => {
    const text = '┌───┐\n│ x │\n└───┘';
    expect(printGrid(parseDiagram(text))).toBe(text);
  });

  it('returns an empty string for empty input', () => {
    expect(printGrid(parseDiagram(''))).toBe('');
  });

  it('normalizes CRLF input to LF output', () => {
    const doc = parseDiagram('a\r\nb\r\n');
    expect(printGrid(doc)).toBe('a\nb');
  });
});
