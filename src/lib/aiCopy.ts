/**
 * D14: the "copy for AI" export — same design as sibling tools/edit-flowchart's
 * D17 (issue #113). Fixed format — two full-text blocks (before/after), not a
 * unified diff — so an AI reading it doesn't depend on line numbers and no
 * diff algorithm is needed on our side. The `before:`/`after:` markers and
 * the plain fences are literal (locale-independent structure); only the
 * intro sentence is localized. Plain (unlabeled) fences are used rather than
 * ```mermaid-style language fences because the content is box-drawing text,
 * not source code in a named language.
 */
export function buildAiInstructionCopy(intro: string, before: string, after: string): string {
  const beforeBlock = before.endsWith('\n') ? before : `${before}\n`;
  const afterBlock = after.endsWith('\n') ? after : `${after}\n`;
  return `${intro}\n\nbefore:\n\`\`\`\n${beforeBlock}\`\`\`\n\nafter:\n\`\`\`\n${afterBlock}\`\`\`\n`;
}
