import { describe, it, expect } from 'vitest';
import { buildAiInstructionCopy } from '@/lib/aiCopy';

describe('buildAiInstructionCopy', () => {
  it('produces the D14 template: intro, before block, after block, in order', () => {
    const out = buildAiInstructionCopy('Intro sentence.', '┌─┐\n└─┘\n', '┌───┐\n└───┘\n');
    expect(out).toBe('Intro sentence.\n\nbefore:\n```\n┌─┐\n└─┘\n```\n\nafter:\n```\n┌───┐\n└───┘\n```\n');
  });

  it('adds a trailing newline before the closing fence when the source has none', () => {
    const out = buildAiInstructionCopy('Intro.', '┌─┐\n└─┘', '┌───┐\n└───┘');
    expect(out).toContain('┌─┐\n└─┘\n```');
    expect(out).toContain('┌───┐\n└───┘\n```');
  });

  it('keeps before and after distinct even when only one changed', () => {
    const out = buildAiInstructionCopy('Intro.', '┌─┐\n└─┘\n', '┌─┐\n└─┘\n');
    const beforeIdx = out.indexOf('before:');
    const afterIdx = out.indexOf('after:');
    expect(beforeIdx).toBeGreaterThanOrEqual(0);
    expect(afterIdx).toBeGreaterThan(beforeIdx);
  });
});
