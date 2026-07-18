/**
 * Fixture diagrams for the round-trip structure test (tests/unit/roundtrip.test.ts).
 * Generated programmatically (see the repo's engineering notes in that test file
 * and in detect.ts) so every row's *display width* — not its raw string length —
 * is guaranteed consistent, which is the entire point of this tool.
 */

export const BASIC_NESTED = `
┌───────────────────┐
│Outer              │
│ ┌────────────────┐│
│ │Inner           ││
│ └────────────────┘│
└───────────────────┘
`.trim();

export const ASCII_ONLY = `
┌─────┐
│hi   │
└─────┘
`.trim();

/** A box whose content is a single multi-codepoint ZWJ emoji sequence (D4). */
export const EMOJI_BOX = `
┌────┐
│👨‍👩‍👧‍👦  │
└────┘
`.trim();

/**
 * Representative Japanese UI wireframe with emoji icons, mixing ASCII,
 * full-width Japanese text, plain emoji, and a header divider (T-junctions
 * crossing the outer box's own border) — see the generation comment above
 * this block in write-fixtures.mjs for why it's built, not hand-typed.
 */
export const WIREFRAME = `
┌───────────────────────────────────┐
│📱 マイアプリ                    ⚙️│
├───────────────────────────────────┤
│┌─────────────────────────────────┐│
││検索 🔍                          ││
│└─────────────────────────────────┘│
│                                   │
│┌───────────────┐ ┌───────────────┐│
││👤 プロフィール│ │📊 統計        ││
│└───────────────┘ └───────────────┘│
│                                   │
│通知: 3件の新着があります          │
└───────────────────────────────────┘
`.trim();
