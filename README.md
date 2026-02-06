# Marginalia

Annotate markdown documents with notes for LLM consumption.

**[Try it live](https://galsapir.github.io/marginalia/)**

## What it does

Paste markdown content, read through the rendered document, and attach notes to text selections. When you're done, export the annotated document — annotations are inserted inline as `{note}` right next to their target text, optimized for pasting into LLM conversations.

## Features

- **Select text → annotate** — highlight a range, type a note
- **Double-click → edit** — modify the markdown inline in the rendered view
- **Inline export format** — annotations placed next to their target text in curly braces
- **Copy or download** — one-click export
- **Dark mode** — respects system preference with manual toggle
- **Rendered / raw toggle** — switch between formatted and source views

## Development

```bash
npm install
npm run dev
```

## Stack

React, TypeScript, Vite, Tailwind CSS v4. Deployed as a static site on GitHub Pages.
