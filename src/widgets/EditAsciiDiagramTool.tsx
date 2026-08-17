/**
 * EditAsciiDiagramTool — the tool's canvas editor island (issue #115).
 *
 * D8: import is paste-only (a textarea, or a direct clipboard paste into it)
 * — no file drop/upload path, unlike most sibling tools.
 *
 * `code` is always the single source of truth (mirrors sibling
 * tools/edit-flowchart's D15): every operation in lib/ops.ts takes the
 * currently-parsed grid, returns a new full text string (D13 — the grid is
 * always fully regenerated, not patched line-by-line), and that string is
 * re-parsed. The GUI never carries independent state that could drift from
 * the code.
 *
 * D12: undo/redo is a capped (100) stack of code-string snapshots, the same
 * pattern as #113 edit-flowchart's D13.
 *
 * Selection is tracked by a box's top-left corner (`{x, y}`) rather than an
 * id — plain box-drawing text has no identifiers to key off of. After any
 * edit the box list is re-detected from scratch and the anchor is looked up
 * again; a box that no longer exists (e.g. just deleted) simply clears the
 * selection.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { AppCard } from './AppCard';
import { AppModal } from './AppModal';
import { FullscreenShell } from './FullscreenShell';
import { DiagramCanvas } from './DiagramCanvas';
import { DiagramInspector, type BoxListItem } from './DiagramInspector';
import { ui, type UiStrings } from '@/i18n/ui';
import { loadSettings, saveSettings } from '@/utils/settingsStorage';
import { parseDiagram } from '@/lib/parse';
import { bounds, cloneDoc, setCell, type GridDoc } from '@/lib/grid';
import { boxHeight, boxWidth, detectBoxesWithHealing, smallestBoxAt, type Box } from '@/lib/detect';
import { addBox, boxText, defaultAddPosition, moveBox, MIN_BOX_HEIGHT, MIN_BOX_WIDTH, removeBox, resizeBox, setBoxText } from '@/lib/ops';
import { buildAiInstructionCopy } from '@/lib/aiCopy';

const DEBOUNCE_MS = 300;
const HISTORY_LIMIT = 100;
const MARGIN_COLS = 6;
const MARGIN_ROWS = 3;
const MIN_GRID_WIDTH = 30;
const MIN_GRID_HEIGHT = 10;

// Validated with tests/unit/width-correctness.test.ts's approach: every row
// below is exactly 24 display columns wide, generated programmatically (see
// the repo's engineering notes) rather than hand-typed, so mixed Japanese/
// emoji content can't silently desync the columns the way it would in the
// audited prior-art tools (issue #115).
const SAMPLE_DIAGRAM = `┌──────────────────────┐
│📋 Todo リスト        │
├──────────────────────┤
│☐ 牛乳を買う          │
│☑ ジムに行く 💪       │
└──────────────────────┘`;

type Selection = { x: number; y: number } | null;

interface HistoryState {
  stack: string[];
  index: number;
}

type DragPreview = { box: Box; kind: 'move' | 'resize'; dCols: number; dRows: number };

interface EditAsciiDiagramToolProps {
  locale?: string;
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function downloadTxt(code: string) {
  const picker = (window as unknown as { showSaveFilePicker?: (opts: unknown) => Promise<FileSystemFileHandle> })
    .showSaveFilePicker;
  if (picker) {
    try {
      const handle = await picker({
        suggestedName: 'diagram.txt',
        types: [{ description: 'Text diagram', accept: { 'text/plain': ['.txt'] } }],
      });
      const writable = await (handle as unknown as { createWritable: () => Promise<FileSystemWritableFileStream> }).createWritable();
      await writable.write(code);
      await writable.close();
      return;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return; // user cancelled
    }
  }
  triggerBlobDownload(new Blob([code], { type: 'text/plain;charset=utf-8' }), 'diagram.txt');
}

function boxLabel(doc: GridDoc, box: Box, t: UiStrings): string {
  const text = boxText(doc, box).replace(/\s+/g, ' ').trim();
  return text || t.untitledBox;
}

export function EditAsciiDiagramTool({ locale = 'en' }: EditAsciiDiagramToolProps) {
  const t: UiStrings = (ui as any)[locale] ?? ui.en;

  const [code, setCode] = useState('');
  const [importedCode, setImportedCode] = useState('');
  const [history, setHistory] = useState<HistoryState>({ stack: [''], index: 0 });
  const [selection, setSelection] = useState<Selection>(null);
  const [pasteText, setPasteText] = useState('');
  const [confirmAction, setConfirmAction] = useState<'reset' | 'startOver' | null>(null);
  const [copiedButton, setCopiedButton] = useState<string | null>(null);
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);
  // Narrow-viewport bottom-bar menu (stats + secondary tools + code pane) toggle.
  const [menuOpen, setMenuOpen] = useState(false);

  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // ---------------------------------------------------------------------
  // Derived grid state — always a synchronous re-parse of `code` (D16: no
  // worker; a diagram-sized grid is cheap to parse/detect/print).
  //
  // Tolerant detection: detectBoxesWithHealing treats an isolated single
  // blank cell on a border edge as a healed pass-through (never two or more
  // consecutive blanks — see detect.ts's module doc). `code` itself is left
  // untouched by this (D13/"not silent rewriting" — see the informational
  // notice below); healing is baked into the actual text only once the user
  // edits a healed box (lib/ops.ts's healBorder).
  // ---------------------------------------------------------------------
  const doc = useMemo(() => parseDiagram(code), [code]);
  const detailedBoxes = useMemo(() => detectBoxesWithHealing(doc), [doc]);
  const boxes = useMemo(() => detailedBoxes.map((d) => d.box), [detailedBoxes]);
  const healedCount = useMemo(() => {
    const seen = new Set<string>();
    for (const d of detailedBoxes) for (const h of d.healed) seen.add(`${h.x},${h.y}`);
    return seen.size;
  }, [detailedBoxes]);
  const selectedBox = useMemo(
    () => (selection ? (boxes.find((b) => b.x1 === selection.x && b.y1 === selection.y) ?? null) : null),
    [boxes, selection]
  );

  // ---------------------------------------------------------------------
  // Code commit / undo-redo (mirrors tools/edit-flowchart's D15/D13 pattern)
  // ---------------------------------------------------------------------

  const applyCode = useCallback((source: string) => setCode(source), []);

  const commitCode = useCallback((source: string) => {
    setCode(source);
    setHistory((prev) => {
      if (prev.stack[prev.index] === source) return prev;
      const truncated = [...prev.stack.slice(0, prev.index + 1), source];
      const overflow = truncated.length - HISTORY_LIMIT;
      const stack = overflow > 0 ? truncated.slice(overflow) : truncated;
      return { stack, index: stack.length - 1 };
    });
  }, []);

  const commitCodeDebounced = useCallback(
    (source: string) => {
      setCode(source);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => commitCode(source), DEBOUNCE_MS);
    },
    [commitCode]
  );

  const importCode = useCallback((source: string) => {
    setImportedCode(source);
    setSelection(null);
    setCode(source);
    setHistory({ stack: [source], index: 0 });
  }, []);

  const undo = () => {
    setHistory((prev) => {
      if (prev.index <= 0) return prev;
      const index = prev.index - 1;
      applyCode(prev.stack[index]);
      return { ...prev, index };
    });
  };
  const redo = () => {
    setHistory((prev) => {
      if (prev.index >= prev.stack.length - 1) return prev;
      const index = prev.index + 1;
      applyCode(prev.stack[index]);
      return { ...prev, index };
    });
  };

  // ---------------------------------------------------------------------
  // Load persisted draft on mount; persist on change.
  // ---------------------------------------------------------------------

  useEffect(() => {
    const saved = loadSettings();
    if (saved.code) {
      setImportedCode(saved.importedCode);
      setCode(saved.code);
      setHistory({ stack: [saved.code], index: 0 });
    }
    (globalThis as Record<string, unknown>).__toolReady = true;
  }, []);

  useEffect(() => {
    saveSettings({ code, importedCode });
  }, [code, importedCode]);

  // ---------------------------------------------------------------------
  // Import: paste only (D8) — a textarea, or Ctrl/Cmd+V directly into it.
  // ---------------------------------------------------------------------

  const loadFromPaste = () => {
    importCode(pasteText);
    setPasteText('');
  };
  const loadSample = () => importCode(SAMPLE_DIAGRAM);

  // ---------------------------------------------------------------------
  // Edit operations (D10) — every one here is reachable from
  // DiagramInspector's keyboard-operable form; DiagramCanvas's mouse drag is
  // an enhancement that calls the same lib/ops.ts functions.
  // ---------------------------------------------------------------------

  const runOp = useCallback(
    (fn: (workingDoc: GridDoc) => string, nextSelection: Selection | undefined) => {
      const working = parseDiagram(code);
      const out = fn(working);
      commitCode(out);
      if (nextSelection !== undefined) setSelection(nextSelection);
    },
    [code, commitCode]
  );

  const handleAddBox = () => {
    const pos = defaultAddPosition(parseDiagram(code));
    runOp((workingDoc) => addBox(workingDoc, pos.x, pos.y), pos);
  };

  const handleMove = (x: number, y: number) => {
    if (!selectedBox) return;
    const clamped = { x: Math.max(0, Math.round(x)), y: Math.max(0, Math.round(y)) };
    runOp((workingDoc) => moveBox(workingDoc, selectedBox, clamped.x, clamped.y), clamped);
  };

  const handleResize = (width: number, height: number) => {
    if (!selectedBox) return;
    runOp((workingDoc) => resizeBox(workingDoc, selectedBox, width, height), { x: selectedBox.x1, y: selectedBox.y1 });
  };

  const handleTextChange = (text: string) => {
    if (!selectedBox) return;
    runOp((workingDoc) => setBoxText(workingDoc, selectedBox, text), { x: selectedBox.x1, y: selectedBox.y1 });
  };

  const handleDelete = () => {
    if (!selectedBox) return;
    runOp((workingDoc) => removeBox(workingDoc, selectedBox), null);
  };

  // ---------------------------------------------------------------------
  // Canvas mouse drag: a live preview (via the same ops the keyboard path
  // uses) rendered without committing to history until pointer-up.
  // ---------------------------------------------------------------------

  const handleSelectAt = (x: number, y: number) => {
    const hit = smallestBoxAt(boxes, x, y);
    setSelection(hit ? { x: hit.x1, y: hit.y1 } : null);
  };

  const handleDragMove = (box: Box, dCols: number, dRows: number) => setDragPreview({ box, kind: 'move', dCols, dRows });
  const handleDragResize = (box: Box, dCols: number, dRows: number) => setDragPreview({ box, kind: 'resize', dCols, dRows });

  const handleDragEnd = () => {
    const preview = dragPreview;
    setDragPreview(null);
    if (!preview || (preview.dCols === 0 && preview.dRows === 0)) return; // plain click, no actual drag
    if (preview.kind === 'move') {
      const x = Math.max(0, preview.box.x1 + preview.dCols);
      const y = Math.max(0, preview.box.y1 + preview.dRows);
      runOp((workingDoc) => moveBox(workingDoc, preview.box, x, y), { x, y });
    } else {
      const width = Math.max(MIN_BOX_WIDTH, boxWidth(preview.box) + preview.dCols);
      const height = Math.max(MIN_BOX_HEIGHT, boxHeight(preview.box) + preview.dRows);
      runOp((workingDoc) => resizeBox(workingDoc, preview.box, width, height), { x: preview.box.x1, y: preview.box.y1 });
    }
  };

  const previewCode = useMemo(() => {
    if (!dragPreview) return null;
    const working = parseDiagram(code);
    if (dragPreview.kind === 'move') {
      const x = Math.max(0, dragPreview.box.x1 + dragPreview.dCols);
      const y = Math.max(0, dragPreview.box.y1 + dragPreview.dRows);
      return moveBox(working, dragPreview.box, x, y);
    }
    const width = Math.max(MIN_BOX_WIDTH, boxWidth(dragPreview.box) + dragPreview.dCols);
    const height = Math.max(MIN_BOX_HEIGHT, boxHeight(dragPreview.box) + dragPreview.dRows);
    return resizeBox(working, dragPreview.box, width, height);
  }, [code, dragPreview]);

  const renderCode = previewCode ?? code;
  const renderDoc = useMemo(() => parseDiagram(renderCode), [renderCode]);

  // The canvas shows the healed version — intact borders, not literal gaps —
  // as a purely visual/display concern, computed fresh from whatever's being
  // rendered (the committed doc, or a live drag preview) so a box dragged
  // partway through a healed border still looks whole while it moves. This
  // clone is never fed back into `code`; see the derived-state comment above.
  const displayDoc = useMemo(() => {
    const detailed = detectBoxesWithHealing(renderDoc);
    if (!detailed.some((d) => d.healed.length > 0)) return renderDoc;
    const clone = cloneDoc(renderDoc);
    for (const d of detailed) {
      for (const h of d.healed) setCell(clone, h.x, h.y, { ch: h.ch, continuation: false });
    }
    return clone;
  }, [renderDoc]);

  const renderSelectedBox = useMemo((): Box | null => {
    if (!dragPreview) return selectedBox;
    if (dragPreview.kind === 'move') {
      const x = Math.max(0, dragPreview.box.x1 + dragPreview.dCols);
      const y = Math.max(0, dragPreview.box.y1 + dragPreview.dRows);
      const w = boxWidth(dragPreview.box);
      const h = boxHeight(dragPreview.box);
      return { x1: x, y1: y, x2: x + w - 1, y2: y + h - 1 };
    }
    const w = Math.max(MIN_BOX_WIDTH, boxWidth(dragPreview.box) + dragPreview.dCols);
    const h = Math.max(MIN_BOX_HEIGHT, boxHeight(dragPreview.box) + dragPreview.dRows);
    return { x1: dragPreview.box.x1, y1: dragPreview.box.y1, x2: dragPreview.box.x1 + w - 1, y2: dragPreview.box.y1 + h - 1 };
  }, [dragPreview, selectedBox]);

  const { maxX: renderMaxX } = bounds(renderDoc);
  const gridWidth = Math.max(renderMaxX + 1, (renderSelectedBox?.x2 ?? -1) + 1, MIN_GRID_WIDTH - MARGIN_COLS) + MARGIN_COLS;
  const gridHeight =
    Math.max(renderDoc.rowCount, (renderSelectedBox?.y2 ?? -1) + 1, MIN_GRID_HEIGHT - MARGIN_ROWS) + MARGIN_ROWS;

  // ---------------------------------------------------------------------
  // Output actions
  // ---------------------------------------------------------------------

  const copyText = async (text: string, buttonId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedButton(buttonId);
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = setTimeout(() => setCopiedButton(null), 2000);
    } catch {
      // Clipboard API unavailable/denied — silently no-op; the code pane and
      // download remain available as fallbacks.
    }
  };

  const performReset = () => {
    setConfirmAction(null);
    setSelection(null);
    setCode(importedCode);
    setHistory({ stack: [importedCode], index: 0 });
  };

  const performStartOver = () => {
    setConfirmAction(null);
    setSelection(null);
    setImportedCode('');
    setCode('');
    setHistory({ stack: [''], index: 0 });
    setMenuOpen(false);
  };

  const items: BoxListItem[] = boxes.map((box) => ({ box, label: boxLabel(doc, box, t) }));
  const inspectorSelected = selectedBox ? { box: selectedBox, text: boxText(doc, selectedBox) } : null;
  const hasContent = code.trim() !== '';

  // ---------------------------------------------------------------------
  // Fullscreen editor overlay lifecycle. FullscreenShell (frozen, #116) owns
  // the takeover chrome itself: position:fixed, dialog semantics, focus,
  // body-scroll lock, and the capture-phase Escape listener (needed so this
  // fires before AppModal's own bubble-phase Escape handler on the same
  // keypress — see FullscreenShell's doc comment). It only calls
  // `onRequestClose`; this tool decides what "close" means right now.
  //
  // Closing = discarding the loaded diagram and returning to the paste
  // screen. Unlike a read-only viewer (Escape can discard outright), this
  // tool holds user *edits* — so closing routes through the existing
  // start-over confirm dialog whenever the current code differs from the
  // imported original, and only closes silently when nothing was edited.
  // ---------------------------------------------------------------------

  const requestClose = () => {
    if (code !== importedCode) setConfirmAction('startOver');
    else performStartOver();
  };

  // A confirm dialog (reset OR start-over) already open means this instead
  // dismisses the DIALOG (idempotent with AppModal's own Escape handler —
  // both paths just set confirmAction to null); no dialog open means it asks
  // to close the editor. Recomputed fresh every render (FullscreenShell
  // reads it through a ref internally, so this doesn't need its own
  // useCallback to stay current).
  const handleRequestClose = () => {
    if (confirmAction !== null) setConfirmAction(null);
    else requestClose();
  };

  return (
    <div>
      {!hasContent && (
        <AppCard>
          <div style="margin-bottom: var(--space-4);">
            <h2 style="margin: 0 0 var(--space-1) 0; font-size: var(--fs-4); font-weight: 600;">{t.inputHeading}</h2>
            <p style="margin: 0; font-size: var(--fs-2); color: var(--color-subtle);">{t.inputSubtitle}</p>
          </div>

          <label class="visually-hidden" for="paste-textarea">
            {t.pasteLabel}
          </label>
          <textarea
            id="paste-textarea"
            data-testid="paste-textarea"
            class="app-field__textarea"
            style="width: 100%; min-height: 200px; font-family: var(--font-mono, monospace); font-size: var(--fs-2);"
            value={pasteText}
            placeholder={t.pastePlaceholder}
            spellcheck={false}
            onInput={(e) => setPasteText((e.currentTarget as HTMLTextAreaElement).value)}
          />

          <div style="display: flex; justify-content: space-between; align-items: center; gap: var(--space-3); flex-wrap: wrap; margin-top: var(--space-3);">
            <span style="display: flex; gap: var(--space-2); flex-wrap: wrap;">
              <button
                id="load-from-text-action"
                type="button"
                class="app-button app-button--primary"
                disabled={pasteText.trim() === ''}
                onClick={loadFromPaste}
              >
                {t.loadFromText}
              </button>
              <button id="load-sample-action" type="button" class="app-button app-button--secondary" onClick={loadSample}>
                {t.loadSample}
              </button>
            </span>
          </div>
        </AppCard>
      )}

      {hasContent && (
        <FullscreenShell
          open={hasContent}
          onRequestClose={handleRequestClose}
          label={t.editorAria}
          closeLabel={t.closeEditor}
          testId="editor"
          closeTestId="close-editor"
          bottomBar={
            <div class="ascii-fs__bottombar">
              <div
                class={menuOpen ? 'ascii-fs__bottombar-details is-open' : 'ascii-fs__bottombar-details'}
                id="ascii-fs-bottombar-details"
              >
                <p class="ascii-fs__stats" role="status">
                  <span data-testid="stats-boxes">{t.statsBoxes.replace('{count}', String(boxes.length))}</span>
                  {healedCount > 0 && (
                    <>
                      {' · '}
                      <span data-testid="stats-healed">{t.statsHealed.replace('{count}', String(healedCount))}</span>
                    </>
                  )}
                  {' · '}
                  <span data-testid="stats-size">
                    {t.statsSize.replace('{cols}', String(bounds(doc).maxX + 1)).replace('{rows}', String(doc.rowCount))}
                  </span>
                </p>

                <div class="ascii-fs__bottombar-tools">
                  <button id="add-box-action" type="button" class="app-button app-button--secondary" onClick={handleAddBox}>
                    {t.addBoxAction}
                  </button>
                  <button
                    id="redo-action"
                    type="button"
                    class="app-button app-button--ghost"
                    disabled={history.index >= history.stack.length - 1}
                    onClick={redo}
                  >
                    {t.redo}
                  </button>
                  <button id="reset-action" type="button" class="app-button app-button--ghost" onClick={() => setConfirmAction('reset')}>
                    {t.reset}
                  </button>
                  <button id="copy-text-action" type="button" class="app-button app-button--secondary" onClick={() => void copyText(code, 'copy-text-action')}>
                    {copiedButton === 'copy-text-action' ? t.copied : t.copyText}
                  </button>
                  <button
                    id="copy-for-ai-action"
                    type="button"
                    class="app-button app-button--secondary"
                    onClick={() => void copyText(buildAiInstructionCopy(t.aiCopyIntro, importedCode, code), 'copy-for-ai-action')}
                  >
                    {copiedButton === 'copy-for-ai-action' ? t.copied : t.copyForAI}
                  </button>
                </div>

                <div class="ascii-fs__code">
                  <label class="ascii-fs__strip-heading" for="code-pane">
                    {t.codeHeading}
                  </label>
                  <textarea
                    id="code-pane"
                    data-testid="code-pane"
                    class="app-field__textarea ascii-fs__code-pane"
                    value={code}
                    spellcheck={false}
                    onInput={(e) => commitCodeDebounced((e.currentTarget as HTMLTextAreaElement).value)}
                  />
                </div>
              </div>

              <div class="ascii-fs__bottombar-row">
                <button
                  type="button"
                  class="ascii-fs__bottombar-toggle"
                  data-testid="bottombar-toggle"
                  aria-expanded={menuOpen}
                  aria-controls="ascii-fs-bottombar-details"
                  onClick={() => setMenuOpen((o) => !o)}
                >
                  <span aria-hidden="true">☰</span>
                  <span class="visually-hidden">{t.moreOptions}</span>
                </button>

                <button id="undo-action" type="button" class="app-button app-button--ghost" disabled={history.index <= 0} onClick={undo}>
                  {t.undo}
                </button>
                <button id="download-txt-action" type="button" class="app-button app-button--primary" onClick={() => void downloadTxt(code)}>
                  {t.downloadTxt}
                </button>
              </div>
            </div>
          }
        >
          <div class="ascii-fs__main">
            <div
              class="ascii-fs__canvas"
              data-testid="diagram-canvas"
              role="region"
              aria-label={t.canvasScrollAria}
              tabIndex={0}
            >
              <DiagramCanvas
                doc={displayDoc}
                gridWidth={gridWidth}
                gridHeight={gridHeight}
                boxes={boxes}
                selectedBox={renderSelectedBox}
                ariaLabel={t.canvasAria}
                onSelectAt={handleSelectAt}
                onDragMove={handleDragMove}
                onDragResize={handleDragResize}
                onDragEnd={handleDragEnd}
              />
            </div>

            <div class="ascii-fs__side">
              <h3 style="font-size: var(--fs-3); margin: 0 0 var(--space-2) 0;">{t.inspectorHeading}</h3>
              <p style="font-size: var(--fs-1); color: var(--color-subtle); margin: 0 0 var(--space-2) 0;">{t.canvasHint}</p>
              <DiagramInspector
                items={items}
                selected={inspectorSelected}
                onSelect={(box) => setSelection(box ? { x: box.x1, y: box.y1 } : null)}
                onMove={handleMove}
                onResize={handleResize}
                onTextChange={handleTextChange}
                onDelete={handleDelete}
                t={t}
              />
            </div>
          </div>
        </FullscreenShell>
      )}

      <AppModal isOpen={confirmAction === 'reset'} onClose={() => setConfirmAction(null)} title={t.resetConfirmTitle} locale={locale}>
        <p>{t.resetConfirmBody}</p>
        <div style="display: flex; gap: var(--space-2); justify-content: flex-end; margin-top: var(--space-4);">
          <button type="button" class="app-button app-button--ghost" onClick={() => setConfirmAction(null)}>
            {t.resetConfirmCancel}
          </button>
          <button id="confirm-reset-action" type="button" class="app-button app-button--primary" onClick={performReset}>
            {t.resetConfirmConfirm}
          </button>
        </div>
      </AppModal>

      <AppModal isOpen={confirmAction === 'startOver'} onClose={() => setConfirmAction(null)} title={t.startOverConfirmTitle} locale={locale}>
        <p>{t.startOverConfirmBody}</p>
        <div style="display: flex; gap: var(--space-2); justify-content: flex-end; margin-top: var(--space-4);">
          <button type="button" class="app-button app-button--ghost" onClick={() => setConfirmAction(null)}>
            {t.startOverConfirmCancel}
          </button>
          <button id="confirm-start-over-action" type="button" class="app-button app-button--primary" onClick={performStartOver}>
            {t.startOverConfirmConfirm}
          </button>
        </div>
      </AppModal>

      <style>{`
        /* The fullscreen takeover itself (position:fixed overlay, dialog
           semantics, focus/scroll-lock/Escape, the ESC/× close control) is
           the frozen FullscreenShell primitive — see
           src/widgets/FullscreenShell.tsx and src/styles/components.css.
           These rules only lay out what this tool passes as FullscreenShell's
           children (the canvas + inspector) and bottomBar (stats, secondary
           tools, the code pane, and the always-visible undo/download row). */
        /* The canvas + inspector row fills all height left over by the
           bottom bar; min-height:0 lets the inner scrollbars (not the page)
           handle overflow. */
        .ascii-fs__main {
          display: flex;
          gap: var(--space-3);
          flex: 1 1 auto;
          min-height: 0;
        }
        .ascii-fs__canvas {
          flex: 1 1 auto;
          min-width: 0;
          overflow: auto;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          padding: var(--space-2);
        }
        .ascii-fs__side {
          flex: 0 0 300px;
          min-height: 0;
          overflow-y: auto;
          padding-right: var(--space-1);
        }
        /* Mobile: stack canvas over inspector; each keeps its own scrollbar. */
        @media (max-width: 720px) {
          .ascii-fs__main {
            flex-direction: column;
          }
          .ascii-fs__side {
            flex: 0 0 auto;
            max-height: 40%;
          }
        }

        /* Bottom bar (rendered inside FullscreenShell's bottomBar slot,
           alongside its close button — see src/widgets/FullscreenShell.tsx).
           Stats, secondary editing tools (add box / redo / reset / copy) and
           the raw code pane sit inline on wide viewports; below 640px they
           collapse behind a hamburger toggle so the always-visible row stays
           down to the toggle, undo, and download (#189). */
        .ascii-fs__bottombar {
          display: flex;
          flex: 1 1 auto;
          min-width: 0;
          align-items: center;
          flex-wrap: wrap;
          gap: var(--space-3);
        }
        .ascii-fs__bottombar-row {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          flex: 0 0 auto;
        }
        .ascii-fs__bottombar-toggle {
          display: none;
          flex: 0 0 auto;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          background-color: var(--color-surface);
          color: var(--color-text);
          font-size: var(--fs-3);
          cursor: pointer;
        }
        .ascii-fs__bottombar-toggle:hover {
          border-color: var(--color-primary);
        }
        .ascii-fs__bottombar-toggle:focus-visible {
          outline: 2px solid var(--color-primary);
          outline-offset: 2px;
        }
        .ascii-fs__bottombar-details {
          display: flex;
          flex-wrap: wrap;
          align-items: flex-end;
          gap: var(--space-2) var(--space-4);
          flex: 1 1 auto;
          min-width: 0;
        }
        .ascii-fs__bottombar-tools {
          display: flex;
          gap: var(--space-2);
          flex-wrap: wrap;
          align-items: center;
        }
        @media (max-width: 640px) {
          .ascii-fs__bottombar {
            flex-direction: column;
            align-items: stretch;
            width: 100%;
          }
          .ascii-fs__bottombar-toggle {
            display: inline-flex;
          }
          .ascii-fs__bottombar-details {
            display: none;
          }
          .ascii-fs__bottombar-details.is-open {
            display: flex;
            flex-direction: column;
            align-items: stretch;
            order: -1;
            border-top: 1px solid var(--color-border);
            padding-top: var(--space-3);
          }
          .ascii-fs__bottombar-row {
            justify-content: space-between;
            width: 100%;
          }
        }
        .ascii-fs__code {
          flex: 1 1 380px;
          min-width: 240px;
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
        }
        .ascii-fs__code-pane {
          width: 100%;
          height: 110px;
          resize: vertical;
          font-family: var(--font-mono, monospace);
          font-size: var(--fs-2);
        }
        .ascii-fs__strip-heading {
          font-size: var(--fs-1);
          font-weight: 600;
          color: var(--color-subtle);
          margin: 0;
        }
        .ascii-fs__stats {
          margin: 0;
          font-size: var(--fs-1);
          color: var(--color-subtle);
        }
        .ascii-canvas {
          position: relative;
          display: inline-block;
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-size: var(--fs-2);
          line-height: 1.4;
          white-space: pre;
          user-select: none;
          touch-action: none;
        }
        .ascii-row {
          display: flex;
          height: 1.4em;
        }
        .ascii-cell {
          display: inline-block;
          overflow: visible;
          white-space: pre;
        }
        .ascii-cell--selected {
          background: var(--color-primary-alpha);
        }
        .ascii-cell--border {
          background: color-mix(in srgb, var(--color-primary) 35%, transparent);
        }
        .ascii-cell--handle {
          background: var(--color-primary);
          color: var(--color-bg);
          cursor: nwse-resize;
        }
        .ascii-calib {
          position: absolute;
          visibility: hidden;
          pointer-events: none;
        }
        .inspector-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
        }
        .inspector-list__item {
          width: 100%;
          justify-content: flex-start;
          text-align: left;
        }
        .visually-hidden {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
      `}</style>
    </div>
  );
}
