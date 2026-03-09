// ABOUTME: Generates export formats for annotations.
// ABOUTME: Supports annotated markdown, notes-only, and raw markdown modes.

import type { Annotation } from './types';

export type ExportMode = 'annotated' | 'notes' | 'raw';

/** Full markdown with inline {notes} inserted after highlighted text. */
export function generateAnnotatedExport(markdown: string, annotations: Annotation[]): string {
  if (annotations.length === 0) return markdown;

  // Sort by start offset descending so insertions don't shift earlier offsets
  const sorted = [...annotations].sort((a, b) => b.markdownStartOffset - a.markdownStartOffset);

  let result = markdown;

  for (const ann of sorted) {
    // Insert note right after the selected text
    result =
      result.slice(0, ann.markdownEndOffset) +
      ' {' + ann.note + '}' +
      result.slice(ann.markdownEndOffset);
  }

  return result;
}

/** Notes only — each note paired with the quote it references. */
export function generateNotesExport(annotations: Annotation[]): string {
  if (annotations.length === 0) return '';

  const sorted = [...annotations].sort((a, b) => a.markdownStartOffset - b.markdownStartOffset);

  return sorted
    .map((ann) => `> ${ann.selectedText}\n\n${ann.note}`)
    .join('\n\n---\n\n');
}

/** Dispatch to the right export function by mode. */
export function generateExport(markdown: string, annotations: Annotation[], mode: ExportMode = 'annotated'): string {
  switch (mode) {
    case 'annotated':
      return generateAnnotatedExport(markdown, annotations);
    case 'notes':
      return generateNotesExport(annotations);
    case 'raw':
      return markdown;
  }
}
