/**
 * The exact real-world fixture that exposed the box-detection failure on
 * ragged/hand-edited input (see detect.ts's module doc for the tolerant-
 * detection design this motivated). Verbatim — not reformatted, not
 * re-aligned — because the raggedness IS the point: row lengths vary row to
 * row, unrelated to any trailing-whitespace stripping.
 *
 * IMPORTANT, confirmed by direct inspection (tests/unit/detect.test.ts /
 * tests/unit/realWireframeRagged.test.ts): this specific fixture's
 * raggedness is NOT limited to single-cell gaps. The outer box's right edge
 * alone has gaps of width 1, 2, 3, 4, and 6 cells across different rows, plus
 * one row where a stray '┘' character (not a blank) sits exactly on the scan
 * column. Only single, isolated 1-cell gaps are healable by design (see
 * detect.ts) — bridging wider gaps risks detecting a box the user never
 * drew. So this fixture's outer box (and the inner boxes, which hit the same
 * kind of multi-cell misalignment on their own right edges) are NOT detected
 * even with tolerant detection. This is intentional and covered by a test
 * that documents the real, measured behavior rather than asserting a result
 * that doesn't hold for this input — see that test for the full per-row
 * evidence.
 */
export const REAL_WIREFRAME_RAGGED = `
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ TemplatePage                                                                                │
│ ┌───────────────────┬─────────────────────────────────────────────────────────────────┐ │
│ │ <aside w-72>       │ header: ← テンプレート一覧へ戻る / タイトル                        │ │
│ │ テンプレート名⚙    │ ┌───────────────────────────────────────────────────────────────┐│ │
│ │ WorkspaceList      │ │ WorkspaceDetailView                                            ││ │
│ │ (過去の実行一覧)    │ │  ワークスペース名 🗑                                            ││ │
│ │                    │ │  [生成中ならProgressView]                                       ││ │
│ │                    │ │  ┌───────────┬──────────────────────────┬─────────────┐        ││ │
│ │                    │ │  │元画像パネル│  比較スライダー ⛶全画面   │ リビジョン   │        ││ │
│ │                    │ │  │🟢保存/差替  │  DL 🟢保存 検証OK/NGバッジ  │ (サムネ一覧) │        ││ │
│ │                    │ │  │            │  実行時入力・マーカー指示  │ ステータス   │    ┘   ││ │
│ │                    │ │  │            │  ▶プロンプト表示          │ バッジ       │        ││ │
│ │                    │ │  │            │  項目修正/自由修正フォーム │ 失敗時🔵再試行│         ││ │
│ │                    │ │  └───────────┴──────────────────────────┴─────────────┘        ││ │
│ │                    │ └───────────────────────────────────────────────────────────────┘│ │
│ └───────────────────┴─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────────┘
`.replace(/^\n|\n$/g, '');
