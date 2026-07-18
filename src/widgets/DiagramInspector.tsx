/**
 * The primary, fully keyboard-operable editing surface (covenant #6 — a
 * click/drag canvas alone is not accessible). Unselected: a list of detected
 * boxes. Selected: a form with numeric X/Y/Width/Height fields (move/resize)
 * and a text area (inline text edit), plus delete — every D10 operation the
 * mouse-drag DiagramCanvas offers has an exact keyboard equivalent here.
 * Mirrors sibling tools/edit-flowchart's FlowchartInspector list/form shape.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Box } from '@/lib/detect';
import type { UiStrings } from '@/i18n/ui';

const FIELD_DEBOUNCE_MS = 300;

function DebouncedNumberField({
  id,
  label,
  value,
  min,
  onCommit,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  onCommit: (v: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <div class="app-field">
      <label class="app-field__label" for={id}>
        {label}
      </label>
      <input
        id={id}
        class="app-field__input"
        type="number"
        min={min}
        value={draft}
        onInput={(e) => {
          const v = (e.currentTarget as HTMLInputElement).value;
          setDraft(v);
          clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => {
            const n = Number(v);
            if (Number.isFinite(n)) onCommit(n);
          }, FIELD_DEBOUNCE_MS);
        }}
      />
    </div>
  );
}

function DebouncedTextField({
  id,
  label,
  value,
  onCommit,
}: {
  id: string;
  label: string;
  value: string;
  onCommit: (v: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <div class="app-field">
      <label class="app-field__label" for={id}>
        {label}
      </label>
      <textarea
        id={id}
        class="app-field__textarea"
        style="width: 100%; min-height: 90px; font-family: var(--font-mono, monospace);"
        value={draft}
        spellcheck={false}
        onInput={(e) => {
          const v = (e.currentTarget as HTMLTextAreaElement).value;
          setDraft(v);
          clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => onCommit(v), FIELD_DEBOUNCE_MS);
        }}
      />
    </div>
  );
}

export interface BoxListItem {
  box: Box;
  label: string;
}

interface DiagramInspectorProps {
  items: BoxListItem[];
  selected: { box: Box; text: string } | null;
  onSelect: (box: Box | null) => void;
  onMove: (x: number, y: number) => void;
  onResize: (width: number, height: number) => void;
  onTextChange: (text: string) => void;
  onDelete: () => void;
  t: UiStrings;
}

export function DiagramInspector({ items, selected, onSelect, onMove, onResize, onTextChange, onDelete, t }: DiagramInspectorProps) {
  if (selected) {
    const { box, text } = selected;
    const width = box.x2 - box.x1 + 1;
    const height = box.y2 - box.y1 + 1;
    const key = `${box.x1},${box.y1},${box.x2},${box.y2}`;
    return (
      <div data-testid="inspector-box">
        <button type="button" class="app-button app-button--ghost" onClick={() => onSelect(null)}>
          {t.backToList}
        </button>

        <h4 style="font-size: var(--fs-2); margin: var(--space-3) 0 var(--space-1) 0;">{t.geometryHeading}</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-2);">
          <DebouncedNumberField key={`x-${key}`} id="box-x-field" label={t.xField} value={box.x1} min={0} onCommit={(x) => onMove(x, box.y1)} />
          <DebouncedNumberField key={`y-${key}`} id="box-y-field" label={t.yField} value={box.y1} min={0} onCommit={(y) => onMove(box.x1, y)} />
          <DebouncedNumberField
            key={`w-${key}`}
            id="box-width-field"
            label={t.widthField}
            value={width}
            min={3}
            onCommit={(w) => onResize(w, height)}
          />
          <DebouncedNumberField
            key={`h-${key}`}
            id="box-height-field"
            label={t.heightField}
            value={height}
            min={3}
            onCommit={(h) => onResize(width, h)}
          />
        </div>

        <div style="margin-top: var(--space-3);">
          <DebouncedTextField key={`text-${key}`} id="box-text-field" label={t.textField} value={text} onCommit={onTextChange} />
        </div>

        <button
          id="delete-box-action"
          type="button"
          class="app-button app-button--secondary"
          style="margin-top: var(--space-3);"
          onClick={onDelete}
        >
          {t.deleteBoxAction}
        </button>
      </div>
    );
  }

  return (
    <div data-testid="inspector-list">
      <h3 style="font-size: var(--fs-3); margin: 0 0 var(--space-2) 0;">{t.boxesHeading}</h3>
      {items.length === 0 ? (
        <p style="color: var(--color-subtle); font-size: var(--fs-2);">{t.emptyBoxes}</p>
      ) : (
        <ul role="list" aria-label={t.boxesHeading} class="inspector-list">
          {items.map(({ box, label }) => (
            <li role="listitem" key={`${box.x1},${box.y1}`}>
              <button
                type="button"
                class="app-button app-button--ghost inspector-list__item"
                aria-label={t.editBox.replace('{label}', label)}
                onClick={() => onSelect(box)}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
