/**
 * D8: import is paste-only (a textarea, or a direct clipboard paste into it)
 * — no file drop/upload path. This is the width-aware parser: the pasted
 * text's heart is placing every grapheme cluster at the correct *display
 * column*, not the correct UTF-16 index, which is exactly what the audited
 * competitors (issue #115) get wrong for CJK/emoji input.
 */
import { emptyDoc, setCell, type GridDoc } from './grid';
import { clusterWidth, graphemeClusters } from './width';

/** Split input into lines, normalizing all EOL styles to plain LF semantics. */
function splitLines(text: string): string[] {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
}

export function parseDiagram(text: string): GridDoc {
  const doc = emptyDoc();
  const lines = splitLines(text);
  for (let y = 0; y < lines.length; y++) {
    let x = 0;
    for (const cluster of graphemeClusters(lines[y])) {
      // A non-printing cluster (rare — e.g. a lone combining mark) still
      // claims one real column so later glyphs on the line don't shift.
      const w = Math.max(1, clusterWidth(cluster));
      setCell(doc, x, y, { ch: cluster, continuation: false });
      for (let i = 1; i < w; i++) setCell(doc, x + i, y, { ch: '', continuation: true });
      x += w;
    }
  }
  // Explicitly record row count so blank lines (which place no cells) are
  // preserved — see grid.ts's GridDoc.rowCount doc comment.
  if (lines.length > doc.rowCount) doc.rowCount = lines.length;
  return doc;
}
