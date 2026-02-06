// ABOUTME: Generates the LLM-consumable export format.
// ABOUTME: Inserts annotations inline next to their target text using curly braces.

import type { Annotation } from './types';

export function generateExport(markdown: string, annotations: Annotation[]): string {
  if (annotations.length === 0) return markdown;

  // Sort by start offset descending so insertions don't shift earlier offsets
  const sorted = [...annotations].sort((a, b) => b.markdownStartOffset - a.markdownStartOffset);

  let result = markdown;

  for (const ann of sorted) {
    const note = `{${ann.note}}`;

    if (ann.kind === 'point') {
      // Insert note at the point location
      result =
        result.slice(0, ann.markdownStartOffset) +
        note +
        result.slice(ann.markdownStartOffset);
    } else {
      // Insert note right after the selected text
      result =
        result.slice(0, ann.markdownEndOffset) +
        ' ' + note +
        result.slice(ann.markdownEndOffset);
    }
  }

  return result;
}
