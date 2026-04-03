// ABOUTME: Curated changelog entries for user-facing features.
// ABOUTME: Displayed on the landing page — update manually when shipping notable changes.

export interface ChangelogEntry {
  date: string;
  changes: string[];
}

export const changelog: ChangelogEntry[] = [
  {
    date: '2026-04-03',
    changes: [
      'Load any webpage as markdown — paste a URL and annotate articles, docs, blog posts',
    ],
  },
  {
    date: '2026-03-31',
    changes: [
      'Share links — copy a URL that pre-loads a GitHub markdown file for annotation',
      'Load markdown directly from GitHub URLs with images rendered inline',
      'Smoother annotation highlights — rendered in a single pass instead of post-render DOM mutation',
    ],
  },
  {
    date: '2026-03-25',
    changes: [
      'Click a highlight to see its note in a floating popover',
      'Smooth animation when toggling focus mode',
      'Clearing a note now deletes the annotation',
      'Fix highlights not wrapping across bold/italic/code boundaries',
    ],
  },
  {
    date: '2026-03-24',
    changes: [
      'Focus mode — hide sidebar for distraction-free reading',
      'Fix highlights landing on wrong text in tables',
      'Fix tables overflowing into the sidebar',
    ],
  },
  {
    date: '2026-03-16',
    changes: [
      'Export annotations: annotated markdown, notes only, or raw',
    ],
  },
  {
    date: '2026-03-08',
    changes: [
      'Sidebar cards float alongside their highlights',
      'Resizable sidebar with drag handle',
    ],
  },
  {
    date: '2026-02-17',
    changes: [
      'Collapsible notes sidebar',
      'Drag-and-drop markdown file loading',
    ],
  },
  {
    date: '2026-02-10',
    changes: [
      'Inline editing — double-click to edit markdown blocks',
      'GFM table support',
    ],
  },
  {
    date: '2026-02-06',
    changes: [
      'Marginalia MVP — paste markdown, select text, annotate',
    ],
  },
];
