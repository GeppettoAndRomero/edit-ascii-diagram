# edit-ascii-diagram

Paste a Unicode box-drawing diagram (┌┐└┘│─├┤┬┴┼), edit boxes with clicks and
drags — or a fully keyboard-operable form — and write it back as clean text,
entirely in your browser. Open source, works offline (PWA).

Part of [runlocally](https://runlocally.app) — small tools that run locally on your device.

## How it works

The core of this tool is a **display-column-aware grid parser**
(`src/lib/parse.ts` / `src/lib/print.ts`): every pasted line is split into
Unicode grapheme clusters (`Intl.Segmenter`), and each cluster's real display
width — 1 or 2 grid columns — is computed via the
[`string-width`](https://github.com/sindresorhus/string-width) package (MIT).
A double-width glyph (a fullwidth Japanese/Chinese character, or an emoji,
including multi-codepoint ZWJ sequences) occupies two consecutive grid
columns: the glyph in the first, a continuation marker in the second. This is
the fix for a real, audited bug in prior-art box-diagram tools, which walk
pasted text one UTF-16 code unit at a time and so miscount the width of any
double-width character, desyncing the box borders after it.

Box detection (`src/lib/detect.ts`) scans the grid for closed rectangles
using each structural character's connectivity (which of up/down/left/right
it visually joins to) rather than matching a fixed set of corner glyphs — so
a T-junction or cross where a divider or a neighboring box touches another
box's border is still recognized correctly. This is an independent
implementation of a well-known technique, not derived from any existing
diagram tool's source.

Editing (`src/lib/ops.ts`) always fully regenerates the grid as text — there
is no line-preserving patch model, unlike sibling tool edit-flowchart. What's
guaranteed instead: importing a diagram and exporting it again without any
edits, then re-parsing that export, recovers the same box structure (count,
position, contained text) detected right after the original import (see
`tests/unit/roundtrip.test.ts`).

## Features

- Paste-only import (a textarea, or a direct clipboard paste) of Unicode
  box-drawing diagrams — correctly handles mixed ASCII/CJK/emoji width
- Click-to-select, drag-to-move, drag-to-resize on an interactive canvas
- A fully keyboard-operable inspector (numeric X/Y/Width/Height fields and a
  text area) for every operation the canvas offers — not a mouse-only editor
- Add/delete boxes
- Undo/redo (code-string snapshots, capped at 100)
- Output: copy as plain text, download `.txt`, or **"Copy for AI"** — a fixed
  before/after template (the diagram as pasted and as it is now, as two
  labeled fenced text blocks) sized for pasting into an AI chat as a change
  instruction
- Works offline (PWA), installable

## Develop

```bash
npm install
npm run dev      # dev server
npm run build    # type-check + production build to dist/
npm test         # unit tests, including the width-correctness and round-trip property tests
npm run test:e2e # Playwright
```

Stack: Astro + Preact + TypeScript. No Web Worker — grid parsing/detection/
editing is lightweight synchronous work.

## Browser support

Works in current Chrome, Edge, Firefox and Safari. `Intl.Segmenter` (grapheme
segmentation) is required; it has been supported in every major browser since
2023. Mouse drag-to-move/resize is a pointer-event enhancement on the canvas —
every operation it offers is also reachable from the keyboard via the
inspector's form fields. `.txt` download uses the File System Access API's
`showSaveFilePicker` where available and falls back to a plain `<a download>`
everywhere else (including Firefox and Safari).

## License

[MIT](./LICENSE). Built and maintained by Geppetto. Some code is written with AI
assistance; all review and decisions are the maintainer's.
