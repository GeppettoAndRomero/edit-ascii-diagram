/**
 * The exact real-world fixture that exposed the box-detection failure on
 * ragged/hand-edited input (see detect.ts's module doc for the tolerant-
 * detection design this motivated: 1-cell-tolerant horizontal scans, and
 * corner-anchored/unlimited-gap vertical scans with an attachment check on
 * each candidate corner). Verbatim — not reformatted, not re-aligned —
 * because the raggedness IS the point: row lengths vary row to row,
 * unrelated to any trailing-whitespace stripping.
 *
 * All 4 of this fixture's intended nested boxes are recovered, plus 3
 * legitimate T-junction-anchored sub-boxes (7 total). The outer box needed
 * one more piece of tolerance beyond plain corner-anchoring: a stray,
 * disconnected '┘' character elsewhere in the fixture sits exactly on the
 * outer box's own right-edge column, in a shape indistinguishable from a
 * real corner by connectivity alone — but every one of its four neighboring
 * cells is blank, unlike a real corner (which always has real content, even
 * if mismatched, on at least one of its two claimed sides). detect.ts's
 * isAttachedCorner tells the two apart. See
 * tests/unit/realWireframeRagged.test.ts's module doc for the full,
 * evidence-backed explanation, and tests/unit/healing.test.ts for the
 * controlled tests proving the general mechanism (including the safety
 * boundary against pairing across unrelated structure) works correctly.
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
