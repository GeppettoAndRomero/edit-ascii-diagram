import { describe, it, expect } from 'vitest';
import { clusterWidth, graphemeClusters } from '@/lib/width';

describe('graphemeClusters', () => {
  it('splits plain ASCII one code point at a time', () => {
    expect(graphemeClusters('AB')).toEqual(['A', 'B']);
  });

  it('keeps a surrogate-pair emoji as one cluster', () => {
    expect(graphemeClusters('A😀B')).toEqual(['A', '😀', 'B']);
  });

  it('keeps a ZWJ emoji sequence as one cluster', () => {
    const family = '👨‍👩‍👧‍👦';
    expect(graphemeClusters(`X${family}Y`)).toEqual(['X', family, 'Y']);
    // Proof this is genuinely a multi-UTF-16-code-unit cluster, not a fluke
    // of a single character — 4 emoji (2 code units each) + 3 ZWJ.
    expect(family.length).toBe(4 * 2 + 3);
  });

  it('keeps an emoji + variation selector as one cluster', () => {
    const heart = '❤️';
    expect(graphemeClusters(`X${heart}Y`)).toEqual(['X', heart, 'Y']);
  });

  it('keeps a base character plus a combining mark as one cluster', () => {
    const eAcute = 'é'; // 'e' + COMBINING ACUTE ACCENT
    expect(graphemeClusters(`X${eAcute}Y`)).toEqual(['X', eAcute, 'Y']);
  });

  it('returns an empty array for an empty line', () => {
    expect(graphemeClusters('')).toEqual([]);
  });
});

describe('clusterWidth', () => {
  it('scores ASCII as width 1', () => {
    expect(clusterWidth('A')).toBe(1);
    expect(clusterWidth(' ')).toBe(1);
  });

  it('scores box-drawing characters as width 1', () => {
    for (const ch of ['┌', '┐', '└', '┘', '│', '─', '├', '┤', '┬', '┴', '┼']) {
      expect(clusterWidth(ch)).toBe(1);
    }
  });

  it('scores CJK fullwidth characters as width 2', () => {
    for (const ch of ['日', '本', '語', 'ア', 'プ', 'リ']) {
      expect(clusterWidth(ch)).toBe(2);
    }
  });

  it('scores fullwidth punctuation/forms as width 2', () => {
    expect(clusterWidth('　')).toBe(2); // IDEOGRAPHIC SPACE (U+3000)
  });

  it('scores a plain single-codepoint emoji as width 2', () => {
    expect(clusterWidth('😀')).toBe(2);
    expect(clusterWidth('🔍')).toBe(2);
  });

  it('scores a ZWJ emoji sequence as width 2 (one glyph), not 2 per component', () => {
    const family = '👨‍👩‍👧‍👦';
    expect(clusterWidth(family)).toBe(2);
  });

  it('scores an emoji + variation selector sequence as width 2', () => {
    expect(clusterWidth('❤️')).toBe(2);
  });

  it('scores a keycap emoji sequence as width 2', () => {
    expect(clusterWidth('1️⃣')).toBe(2);
  });
});
