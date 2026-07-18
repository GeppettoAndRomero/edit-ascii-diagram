/**
 * The Unicode box-drawing character set this tool understands (D6) — anything
 * else in a cell is "label/content" text, not structure.
 *
 * `Connectivity` is which of the four directions (up/down/left/right) a
 * character visually joins to its neighbor in. detect.ts uses this to
 * recognize a box's corners/edges algorithmically — including when a corner
 * position is actually a T-junction or cross (┬┴├┤┼) because two boxes touch
 * or a box has an internal divider (D7) — instead of only ever matching the
 * plain ┌┐└┘ corner glyphs. This is an independent implementation of a
 * well-known box-drawing technique; it is not derived from or copied out of
 * any specific existing diagram tool's source (see issue #115 D7).
 */
export interface Connectivity {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

export const BOX_CHARS = ['┌', '┐', '└', '┘', '│', '─', '├', '┤', '┬', '┴', '┼'] as const;
export type BoxChar = (typeof BOX_CHARS)[number];

const CONNECTIVITY: Record<BoxChar, Connectivity> = {
  '─': { left: true, right: true, up: false, down: false },
  '│': { left: false, right: false, up: true, down: true },
  '┌': { left: false, right: true, up: false, down: true },
  '┐': { left: true, right: false, up: false, down: true },
  '└': { left: false, right: true, up: true, down: false },
  '┘': { left: true, right: false, up: true, down: false },
  '├': { left: false, right: true, up: true, down: true },
  '┤': { left: true, right: false, up: true, down: true },
  '┬': { left: true, right: true, up: false, down: true },
  '┴': { left: true, right: true, up: true, down: false },
  '┼': { left: true, right: true, up: true, down: true },
};

export function isBoxChar(ch: string): ch is BoxChar {
  return Object.prototype.hasOwnProperty.call(CONNECTIVITY, ch);
}

/** The connectivity of a structural character, or null for label/content text. */
export function connectivityOf(ch: string): Connectivity | null {
  return isBoxChar(ch) ? CONNECTIVITY[ch] : null;
}
