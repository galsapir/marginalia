# Markdown Notes — Spec

## Overview

A single-page application for annotating markdown documents with notes intended for LLM consumption. The user pastes markdown content, reads through it in a rendered view, selects text spans to attach free-form annotations (Google Docs comment style), and exports the original content + annotations as a single blob optimized for LLM processing.

Hosted as a static site on GitHub Pages. No backend, no persistence — session-only workflow.

## Goals & Non-Goals

### Goals
- Render pasted markdown with a clean reading experience
- Allow text-selection-based annotations on the rendered view
- Display annotations in an ordered sidebar with bidirectional navigation (click sidebar → scroll to highlight, click highlight → highlight in sidebar)
- Export original markdown + annotations in a format optimized for LLM consumption (single copy or download)
- Toggle between rendered and raw markdown views
- Dark mode support
- Deploy as a static site (GitHub Pages compatible)

### Non-Goals
- No persistence / saved sessions — this is a "load, annotate, export, close" tool
- No user accounts or authentication
- No real-time collaboration
- No server-side processing
- No direct LLM integration (the user manually pastes output into their LLM of choice)
- No file upload (MVP is paste-only; file upload and GitHub URL fetching are potential future additions)

## User Stories / Key Flows

### Primary Flow
1. User navigates to the app (GitHub Pages URL)
2. User sees an input area and pastes markdown content
3. App renders the markdown in a clean, readable format
4. User reads through the document, selecting text spans to annotate
5. On text selection, a note input appears — user writes a free-form note and saves it
6. Annotations appear as highlights in the document and as cards in the sidebar
7. User can edit or delete any annotation
8. When done, user clicks "Copy" (clipboard) or "Download" to export
9. User pastes the export into an LLM for processing
10. User closes the page

### Secondary Flows
- **Toggle view**: User switches between rendered and raw markdown views while annotating
- **Navigate via sidebar**: User clicks a note in the sidebar; document scrolls to the highlighted text
- **Navigate via highlight**: User clicks a highlight in the document; sidebar scrolls to and highlights the corresponding note
- **Edit annotation**: User clicks an existing annotation card in the sidebar, edits the text, saves
- **Delete annotation**: User removes an annotation from the sidebar; highlight disappears from document
- **Start over**: User clears current content and pastes new markdown

## Technical Design

### Architecture
- **Framework**: React + TypeScript
- **Build tool**: Vite
- **Markdown rendering**: `react-markdown` (or `marked` + `DOMPurify`)
- **Styling**: CSS Modules or Tailwind CSS (lean toward Tailwind for rapid development)
- **State management**: React state (useReducer or Zustand if complexity warrants it) — no Redux needed for this scope
- **Deployment**: Static build → GitHub Pages

### Core Components
```
App
├── InputView          — Paste area (shown when no content loaded)
├── DocumentView       — Main content area
│   ├── RenderedView   — Rendered markdown with annotation highlights
│   └── RawView        — Raw markdown text (read-only display)
├── Sidebar            — Ordered list of annotation cards
│   └── AnnotationCard — Individual note with edit/delete controls
├── AnnotationPopover  — Appears on text selection for creating new notes
├── ExportControls     — Copy to clipboard + download buttons
└── ThemeToggle        — Dark/light mode switch
```

### Data Model

```typescript
interface Annotation {
  id: string;                    // UUID
  selectedText: string;          // The exact text that was highlighted
  note: string;                  // User's free-form note
  // Position anchoring (for mapping selection back to source markdown):
  markdownStartOffset: number;   // Character offset in the original markdown
  markdownEndOffset: number;     // Character offset in the original markdown
  createdAt: number;             // Timestamp for ordering tiebreaks
}

interface AppState {
  markdownContent: string;       // The original pasted markdown
  annotations: Annotation[];     // All annotations
  viewMode: 'rendered' | 'raw';  // Current display mode
  theme: 'light' | 'dark';      // Current theme
}
```

### Text Selection → Markdown Position Mapping

This is the hardest technical challenge. The user selects text in the rendered HTML, but annotations must map back to positions in the original markdown source. Approach:

1. Parse markdown into an AST (using `unified`/`remark`) which provides source position info
2. When rendering, embed data attributes on elements with their source positions
3. On text selection, walk the DOM selection range to find the enclosing elements with position data
4. Map the selection back to markdown character offsets using the position metadata

This ensures annotations are anchored to the markdown source regardless of which view mode is active.

### Export Format

Optimized for LLM consumption. Uses a consolidated format that gives the LLM clear context:

```markdown
# Document with Annotations

Below is a markdown document with inline annotations. Each annotation is marked
with a numbered tag [A1], [A2], etc. at the relevant position in the text.
After the document, you'll find the full list of annotations.

---

## [Original document content here]

The API uses [A1]REST endpoints[/A1] for all operations.
This section covers [A2]the deployment pipeline[/A2] in detail.

---

## Annotations

- **[A1]** "REST endpoints" — Consider GraphQL instead, justify the choice
- **[A2]** "the deployment pipeline" — Expand this section with concrete steps
```

This format:
- Preserves the full original document for context
- Marks annotation positions inline so the LLM knows exactly where each note applies
- Lists all annotations with the selected text quoted for clarity
- No added prompts or instructions — the user provides their own context when pasting into an LLM

### Dependencies
- `react`, `react-dom` — UI framework
- `typescript` — Type safety
- `vite` — Build tooling
- `remark` / `unified` / `rehype` — Markdown parsing with AST + source positions
- `react-markdown` or `rehype-react` — Rendering markdown to React components
- Tailwind CSS — Styling (tentative)
- `uuid` — Annotation IDs

## Edge Cases & Error Handling

- **Empty paste**: Show validation message, don't enter annotation mode
- **Invalid markdown**: Still render it — markdown is forgiving, even plain text renders fine
- **Selection spans multiple blocks**: Allow it — the annotation captures the full selected text and maps to the widest source range
- **Overlapping annotations**: Allow overlapping highlights with visual stacking (e.g., darker highlight where overlaps occur). Export lists both annotations separately
- **Very long documents**: Virtualization is a non-goal for MVP. If performance becomes an issue, address later
- **Annotation on raw view**: MVP supports annotation on rendered view only. Raw view is read-only display. Can revisit later
- **Browser compatibility**: Target modern evergreen browsers (Chrome, Firefox, Safari, Edge). No IE support
- **Copy to clipboard fails**: Fall back to showing a text area with the export content that the user can manually select and copy

## Open Questions

- **Tailwind vs CSS Modules**: Tailwind is faster to develop with but adds a build dependency. CSS Modules are simpler but more verbose. Will decide during implementation.
- ~~**Custom export prompt**~~: Decided — no prompts added to the export. The user provides their own instructions when pasting into an LLM.
- **Keyboard shortcuts**: Useful for power users (e.g., Ctrl+Enter to save annotation, Escape to cancel). Worth adding in MVP or defer?

## Implementation Notes

- Annotation in rendered view is the primary interaction mode. The raw view toggle is for reference/inspection, not for annotating
- Text selection → markdown position mapping is the core technical risk. Prototype this first
- The export format should be tested with actual LLMs to verify it produces good results. May need iteration
- Dark mode should respect system preference (`prefers-color-scheme`) with manual override
- No build-time markdown processing — everything happens client-side at runtime
- Keep the app fast: no unnecessary re-renders when adding/editing annotations
