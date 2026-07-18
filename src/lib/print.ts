/**
 * D13: output is always the full grid regenerated as text (trailing
 * whitespace stripped per line). This design does not attempt edit-flowchart's
 * byte-identical-round-trip-for-untouched-lines guarantee — a free-form grid
 * canvas has no notion of "a line nobody touched" once any cell anywhere can
 * move. The goal instead (verified by tests/unit/roundtrip.test.ts) is that
 * re-parsing this output recovers the same box structure (count, position,
 * contained text) that was detected right after import.
 */
import { bounds, getCell, type GridDoc } from './grid';

export function printGrid(doc: GridDoc): string {
  const { maxX } = bounds(doc);
  const rows: string[] = [];
  for (let y = 0; y < doc.rowCount; y++) {
    let row = '';
    for (let x = 0; x <= maxX; x++) {
      const cell = getCell(doc, x, y);
      if (!cell) {
        row += ' ';
        continue;
      }
      if (cell.continuation) continue; // no output — the glyph one column back already renders wide
      row += cell.ch;
    }
    rows.push(row.replace(/[ \t]+$/u, ''));
  }
  // Trim a fully-blank tail so deletions near the bottom don't leave the
  // canvas growing an ever-longer blank tail; interior blank lines are kept.
  while (rows.length > 0 && rows[rows.length - 1] === '') rows.pop();
  return rows.join('\n');
}
