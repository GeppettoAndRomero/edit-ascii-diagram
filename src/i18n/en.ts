import type { ToolContent } from './types';

export const en: ToolContent = {
  htmlLang: 'en',

  meta: {
    title: 'Edit a Unicode Box-Drawing Diagram in a GUI | runlocally',
    description:
      'Paste a Unicode box-drawing diagram (┌┐└┘│─), edit it with click-to-select, drag, and inline text editing, and write it back as clean text. Handles full-width Japanese/Chinese characters and emoji as correct double-width grid cells, so pasted columns never shift. Entirely client-side.',
    ogTitle: 'Edit a Unicode Box-Drawing Diagram in a GUI',
    ogDescription:
      'A box-drawing diagram editor with a display-column-aware grid — full-width characters and emoji occupy two columns correctly, so imported diagrams keep their alignment. Runs entirely in your browser.',
  },

  hero: {
    h1: 'Edit a Box-Drawing Diagram',
    tagline:
      'Paste a Unicode box-drawing diagram, edit boxes with clicks and drags (or a fully keyboard-operable form), and export clean text back.',
  },

  intro: {
    h2: 'A box-drawing editor that gets full-width characters right',
    paras: [
      'This tool reads a diagram made of Unicode box-drawing characters (┌┐└┘│─├┤┬┴┼) — the kind of nested rectangular boxes used for UI wireframes and simple architecture sketches — lets you select, move, resize, and retext each box in a GUI, and writes the result back as plain text.',
      'Its grid model addresses every cell by display column, not by UTF-16 code unit. A full-width Japanese or Chinese character, or an emoji (including multi-codepoint sequences joined with a zero-width joiner), correctly occupies two grid columns instead of one — so pasting a diagram that mixes ASCII with CJK text or emoji icons keeps its box borders aligned instead of drifting out of place a column or two after the first wide character.',
      'It only understands nested rectangular boxes — not freehand lines, arrows, circles, or other ASCII art. If you need a general-purpose diagram, this isn’t it; if you need to reshape a box-and-label wireframe someone pasted from a design doc or a screenshot transcript, this is built for exactly that.',
    ],
  },

  privacy: {
    h2: 'Why your diagram never leaves your device',
    lead: 'Privacy here is structural, not a promise. There is no upload step because there is no server to upload to:',
    points: [
      'Parsing, editing, and rendering all happen in your browser.',
      'The page is served as static files and makes no request carrying your diagram text.',
      'There is no shareable-link feature that would encode your diagram into a URL.',
      'The source is open and anyone can read it (MIT).',
      'It works offline, which is only possible because nothing leaves the device.',
    ],
    note: "If you want to check for yourself, open your browser's Network panel while editing — no request carries your diagram text.",
    sourceLinkText: 'Read the source.',
  },

  howto: {
    h2: 'How to use it',
    steps: [
      {
        h3: 'Paste your diagram',
        p: 'Paste box-drawing text into the textarea, or click "Load sample" to try it with a small example first.',
      },
      {
        h3: 'Select and edit a box',
        p: 'Click a box on the canvas, or pick it from the list on the right. Drag to move it, drag its bottom-right corner to resize it, or edit its text directly in the form — every one of these also works from the keyboard via the numeric fields and text area.',
      },
      {
        h3: 'Add or remove boxes',
        p: 'Use "Add box" to draw a new empty box, or delete the selected one. Moving and resizing never avoid overlapping other boxes — later edits simply draw over earlier ones, like a plain drawing canvas.',
      },
      {
        h3: 'Export the result',
        p: 'Copy the plain text, download it as a .txt file, or use "Copy for AI" to get a ready-to-paste before/after instruction for an AI chat — see below.',
      },
    ],
  },

  faqHeading: 'FAQ',
  faq: [
    {
      q: 'Is my diagram uploaded anywhere?',
      a: 'No. Parsing, editing, and rendering all happen entirely in your browser. There is no server component and no shareable-link feature, so your diagram text has no path off your device.',
    },
    {
      q: 'Why do full-width characters and emoji matter here?',
      a: 'A Japanese or Chinese character, or most emoji, is visually twice as wide as a Latin letter when rendered in a monospace font — but it is still just one character (or, for some emoji, one multi-codepoint sequence) in the underlying text. A parser that walks the text one code unit at a time miscounts that width, so a box border after the wide character lands one column short. This tool computes each character\'s actual display width and gives a double-width character two grid columns, so the columns stay aligned regardless of what the diagram contains.',
    },
    {
      q: 'What happens to freehand lines, arrows, or circles?',
      a: 'This tool only detects and edits closed rectangular regions made of the standard box-drawing characters (┌┐└┘│─├┤┬┴┼). Anything else — a diagonal line, an arrowhead, a circle, general ASCII art — is treated as ordinary text content and passes through untouched, but it isn’t a selectable, movable box.',
    },
    {
      q: 'Does moving or resizing a box avoid overlapping others?',
      a: 'No, deliberately not. This is a plain grid canvas: whichever box you draw or move last simply overwrites whatever cells it lands on, the same way a basic drawing tool would. If two boxes end up overlapping, redraw or move one of them to fix it.',
    },
    {
      q: 'Is the exported text byte-identical to what I pasted, if I didn’t edit anything?',
      a: 'Not necessarily byte-for-byte (trailing whitespace on each line is always trimmed, for instance) — but re-parsing the exported text finds the same boxes, in the same positions, with the same text, as the version you pasted. The tool is a full-grid canvas, not a line-preserving patch editor.',
    },
    {
      q: 'What is "Copy for AI" for?',
      a: 'It copies the diagram text as it was when you pasted it and the text as it is now, as two labeled, fenced text blocks, ready to paste into an AI chat as a change instruction. This is aimed at a specific workflow: paste a UI wireframe (a real screen\'s layout, sketched as nested boxes), edit it here, and hand the before/after to an AI as the diff.',
    },
    {
      q: 'Can I use this without a mouse?',
      a: 'Yes. Selecting a box from the list, and moving, resizing, retexting, and deleting it through the form fields next to the canvas, are all fully keyboard-operable. Dragging on the canvas is a pointer convenience layered on top of the same operations.',
    },
    {
      q: 'Does it work offline?',
      a: 'Yes. It is a PWA. After the first visit it is cached, so it works without a network connection. You can also install it to your home screen.',
    },
  ],

  footer: {
    openSourceLabel: 'Open source (MIT)',
    partOf: 'part of',
    brandTail: '— small tools that run locally on your device.',
    colophon:
      "Built and maintained by Geppetto. Some code is written with AI assistance; all review and decisions are the maintainer's.",
    securityText: 'Security',
  },

  related: {
    h2: 'Related tools',
    blogLinkText: 'Read the technical notes',
  },
};
