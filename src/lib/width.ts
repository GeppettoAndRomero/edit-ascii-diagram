/**
 * Display-column-aware width computation (D5). We do NOT hand-roll Unicode
 * East Asian Width / emoji-width tables — width is delegated to the
 * `string-width` npm package (MIT; see NOTICE.md for the exact version and
 * its transitive deps). This is the tool's core differentiator: existing
 * open-source box-diagram editors (audited in issue #115) walk a pasted line
 * one UTF-16 code unit at a time, so a full-width Japanese character or an
 * emoji desyncs their column count. Here every "logical character" placed
 * into the grid is a full grapheme cluster (Intl.Segmenter), and its grid
 * width (0, 1, or 2 columns) comes from `string-width` run on that one
 * cluster — which already implements RGI-emoji / ZWJ-sequence / Extended
 * Pictographic detection and East Asian Width lookup internally, so a
 * multi-codepoint emoji sequence (e.g. an emoji + variation selector, or a
 * ZWJ family emoji) is measured and placed as a single width-2 grid cell,
 * never split.
 */
import stringWidth from 'string-width';

const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

/** Split a line of text into logical "characters" (grapheme clusters). */
export function graphemeClusters(line: string): string[] {
  if (line === '') return [];
  return Array.from(segmenter.segment(line), (s) => s.segment);
}

/**
 * Display-column width of a single grapheme cluster: 0 (non-printing, e.g. a
 * lone combining mark or control character), 1 (halfwidth/narrow), or 2
 * (fullwidth/wide East Asian Width, or an emoji sequence). Callers that place
 * the cluster into a grid column clamp this to at least 1 so a non-printing
 * cluster still occupies a real cell instead of disappearing.
 */
export function clusterWidth(cluster: string): number {
  return stringWidth(cluster, { ambiguousIsNarrow: true });
}
