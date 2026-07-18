import { describe, it, expect } from 'vitest';
import { BOX_CHARS, connectivityOf, isBoxChar } from '@/lib/boxChars';

describe('boxChars', () => {
  it('recognizes every character in the D6 structural set', () => {
    for (const ch of BOX_CHARS) {
      expect(isBoxChar(ch)).toBe(true);
      expect(connectivityOf(ch)).not.toBeNull();
    }
  });

  it('treats label/content characters as non-structural', () => {
    for (const ch of ['A', ' ', '日', '😀', '-', '|', '+']) {
      expect(isBoxChar(ch)).toBe(false);
      expect(connectivityOf(ch)).toBeNull();
    }
  });

  it('gives the cross ┼ all four connections', () => {
    expect(connectivityOf('┼')).toEqual({ up: true, down: true, left: true, right: true });
  });

  it('gives a plain corner exactly the two connections it visually has', () => {
    expect(connectivityOf('┌')).toEqual({ up: false, down: true, left: false, right: true });
    expect(connectivityOf('┘')).toEqual({ up: true, down: false, left: true, right: false });
  });

  it('gives straight edges exactly their two opposite connections', () => {
    expect(connectivityOf('─')).toEqual({ up: false, down: false, left: true, right: true });
    expect(connectivityOf('│')).toEqual({ up: true, down: true, left: false, right: false });
  });
});
