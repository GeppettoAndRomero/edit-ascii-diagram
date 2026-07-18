/**
 * The visual grid canvas — click-to-select and drag-to-move/resize (D10),
 * rendered as monospace spans so double-width glyphs (D3/D4) visually span
 * two grid columns via an explicit `2ch`-wide origin cell, with its
 * continuation cell rendered empty rather than desyncing later columns.
 *
 * This is a mouse *enhancement*, not the accessible interaction surface:
 * `role="img"` marks it decorative to assistive tech, exactly like sibling
 * tools/edit-flowchart's SVG preview (`role="img" aria-label=...`, click
 * handlers layered on top as a pointer-only convenience). The full
 * keyboard-operable path — select from a list, move/resize via numeric
 * fields, edit text in a textarea — lives in DiagramInspector.tsx.
 */
import { useRef } from 'preact/hooks';
import type { JSX } from 'preact';
import { getCell, type GridDoc } from '@/lib/grid';
import { smallestBoxAt, type Box } from '@/lib/detect';

interface DiagramCanvasProps {
  doc: GridDoc;
  gridWidth: number;
  gridHeight: number;
  boxes: Box[];
  selectedBox: Box | null;
  ariaLabel: string;
  onSelectAt: (x: number, y: number) => void;
  onDragMove: (box: Box, dCols: number, dRows: number) => void;
  onDragResize: (box: Box, dCols: number, dRows: number) => void;
  onDragEnd: () => void;
}

interface DragState {
  mode: 'move' | 'resize';
  box: Box;
  startClientX: number;
  startClientY: number;
  cellW: number;
  cellH: number;
}

export function DiagramCanvas({
  doc,
  gridWidth,
  gridHeight,
  boxes,
  selectedBox,
  ariaLabel,
  onSelectAt,
  onDragMove,
  onDragResize,
  onDragEnd,
}: DiagramCanvasProps) {
  const calibRef = useRef<HTMLSpanElement | null>(null);
  const dragRef = useRef<DragState | null>(null);

  const cellCoordsFromEvent = (e: PointerEvent): { x: number; y: number } | null => {
    const target = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-x]');
    if (!target) return null;
    const x = Number(target.dataset.x);
    const y = Number(target.dataset.y);
    if (Number.isNaN(x) || Number.isNaN(y)) return null;
    return { x, y };
  };

  const handlePointerDown = (e: PointerEvent) => {
    const coords = cellCoordsFromEvent(e);
    if (!coords) return;
    const { x, y } = coords;
    const hit = smallestBoxAt(boxes, x, y);
    onSelectAt(x, y);
    if (!hit) return;
    const isResizeHandle =
      !!selectedBox && hit.x1 === selectedBox.x1 && hit.y1 === selectedBox.y1 && x === hit.x2 && y === hit.y2;
    const rect = calibRef.current?.getBoundingClientRect();
    dragRef.current = {
      mode: isResizeHandle ? 'resize' : 'move',
      box: hit,
      startClientX: e.clientX,
      startClientY: e.clientY,
      cellW: rect?.width || 8,
      cellH: rect?.height || 16,
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dCols = Math.round((e.clientX - drag.startClientX) / drag.cellW);
    const dRows = Math.round((e.clientY - drag.startClientY) / drag.cellH);
    if (drag.mode === 'move') onDragMove(drag.box, dCols, dRows);
    else onDragResize(drag.box, dCols, dRows);
  };

  const handlePointerUp = () => {
    if (dragRef.current) {
      dragRef.current = null;
      onDragEnd();
    }
  };

  const rows: JSX.Element[] = [];
  for (let y = 0; y < gridHeight; y++) {
    const spans: JSX.Element[] = [];
    for (let x = 0; x < gridWidth; ) {
      const cell = getCell(doc, x, y);
      const wide = !cell?.continuation && !!getCell(doc, x + 1, y)?.continuation;
      const span = wide ? 2 : 1;
      const inSelected = !!selectedBox && x >= selectedBox.x1 && x <= selectedBox.x2 && y >= selectedBox.y1 && y <= selectedBox.y2;
      const isHandle = !!selectedBox && x === selectedBox.x2 && y === selectedBox.y2;
      const isBorder =
        !!selectedBox &&
        inSelected &&
        (x === selectedBox.x1 || x === selectedBox.x2 || y === selectedBox.y1 || y === selectedBox.y2);
      const cls = [
        'ascii-cell',
        inSelected && 'ascii-cell--selected',
        isBorder && 'ascii-cell--border',
        isHandle && 'ascii-cell--handle',
      ]
        .filter(Boolean)
        .join(' ');
      spans.push(
        <span key={x} class={cls} style={{ width: `${span}ch` }} data-x={x} data-y={y}>
          {cell && !cell.continuation ? cell.ch : ''}
        </span>
      );
      x += span;
    }
    rows.push(
      <div class="ascii-row" key={y}>
        {spans}
      </div>
    );
  }

  return (
    <div
      class="ascii-canvas"
      role="img"
      aria-label={ariaLabel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <span ref={calibRef} class="ascii-calib" aria-hidden="true">
        M
      </span>
      {rows}
    </div>
  );
}
