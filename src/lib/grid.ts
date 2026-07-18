/**
 * D3: the data model is a 2D sparse grid — `Map<"x,y", glyph>` — addressed by
 * *display column*, not by UTF-16 code unit. D4: a full-width character or
 * emoji sequence occupies two consecutive grid columns: the glyph itself in
 * the first column, a "continuation" marker cell in the second. This is what
 * lets hit-testing and box detection treat a wide glyph's second column as a
 * real (if empty) cell rather than a "ghost" gap that desyncs later columns —
 * exactly the bug this tool exists to fix in the tools it was audited against
 * (see issue #115).
 */

export interface GridCell {
  /** The glyph text for this cell (a full grapheme cluster); '' for a continuation cell. */
  ch: string;
  /** True when this cell is the second display column of a double-width glyph. */
  continuation: boolean;
}

export interface GridDoc {
  cells: Map<string, GridCell>;
  /**
   * Total number of rows (including trailing/interior blank lines that have
   * no cells of their own). Tracked explicitly because a blank line
   * contributes no map entries, so it can't be recovered by scanning cell
   * coordinates alone.
   */
  rowCount: number;
}

function key(x: number, y: number): string {
  return `${x},${y}`;
}

export function emptyDoc(): GridDoc {
  return { cells: new Map(), rowCount: 0 };
}

export function cloneDoc(doc: GridDoc): GridDoc {
  return { cells: new Map(doc.cells), rowCount: doc.rowCount };
}

export function getCell(doc: GridDoc, x: number, y: number): GridCell | undefined {
  if (x < 0 || y < 0) return undefined;
  return doc.cells.get(key(x, y));
}

/** Set (or, with `null`, clear) a cell. Setting a cell grows `rowCount` if needed. */
export function setCell(doc: GridDoc, x: number, y: number, cell: GridCell | null): void {
  const k = key(x, y);
  if (cell === null) {
    doc.cells.delete(k);
    return;
  }
  doc.cells.set(k, cell);
  if (y + 1 > doc.rowCount) doc.rowCount = y + 1;
}

/** The bounding box of actually-placed cells: `{ maxX: -1, maxY: -1 }` for an empty grid. */
export function bounds(doc: GridDoc): { maxX: number; maxY: number } {
  let maxX = -1;
  let maxY = -1;
  for (const k of doc.cells.keys()) {
    const comma = k.indexOf(',');
    const x = Number(k.slice(0, comma));
    const y = Number(k.slice(comma + 1));
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { maxX, maxY };
}
