/**
 * Persisted editor state.
 *
 * `code` (the current diagram text) is the single source of truth for the
 * document — everything else (grid, detected boxes, preview) is derived from
 * it by re-parsing (see src/lib/parse.ts). `importedCode` is the snapshot
 * captured the moment content was last loaded (paste/sample) — it is the
 * "before" half of the D14 "copy for AI" export, so it is persisted alongside
 * `code` rather than reset on every reload. Same shape/rationale as sibling
 * tools/edit-flowchart's settings.ts (issue #113 D15 / this tool's D12).
 *
 * Plain localStorage — per-device, never sent anywhere, and distinct from the
 * URL (this tool never puts document text in the URL or a shared link).
 */

export interface EditorSettings {
  code: string;
  importedCode: string;
}

export const DEFAULT_SETTINGS: EditorSettings = {
  code: '',
  importedCode: '',
};

/**
 * Coerce arbitrary input (e.g. parsed localStorage JSON) into valid
 * EditorSettings, falling back to defaults for a missing/invalid field.
 */
export function normalizeSettings(input: unknown): EditorSettings {
  const raw = (input ?? {}) as Partial<Record<keyof EditorSettings, unknown>>;
  return {
    code: typeof raw.code === 'string' ? raw.code : DEFAULT_SETTINGS.code,
    importedCode: typeof raw.importedCode === 'string' ? raw.importedCode : DEFAULT_SETTINGS.importedCode,
  };
}
