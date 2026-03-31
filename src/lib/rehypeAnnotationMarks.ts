// ABOUTME: Rehype plugin that injects <mark> elements into the HTML AST for annotations.
// ABOUTME: Replaces post-render DOM mutation with single-pass React rendering for smoother highlights.

import type { Plugin } from 'unified';
import type { Root, Element, Text, ElementContent } from 'hast';
import { SKIP, visit } from 'unist-util-visit';
import type { Annotation } from './types';

/**
 * Creates a rehype plugin that wraps annotated text ranges with <mark> elements
 * directly in the AST, so React renders them in a single pass — no post-render
 * DOM mutation needed.
 *
 * Mark elements are intentionally created without data-source-start/end attributes
 * so the position mapping in positions.ts treats them as transparent wrappers.
 */
export function createRehypeAnnotationMarks(
  annotations: Annotation[],
  activeId: string | null,
): Plugin<[], Root> {
  return () => {
    return (tree: Root) => {
      if (annotations.length === 0) return;

      // Process from end to start so earlier splits don't shift later offsets
      const sorted = [...annotations].sort(
        (a, b) => b.markdownStartOffset - a.markdownStartOffset,
      );

      for (const annotation of sorted) {
        visit(tree, 'text', (node: Text, index, parent) => {
          if (index === undefined || !parent) return;

          // Skip text nodes without position info (e.g., whitespace inserted by remark-rehype)
          const nodeStart = node.position?.start.offset;
          const nodeEnd = node.position?.end.offset;
          if (nodeStart === undefined || nodeEnd === undefined) return;

          // Skip if no overlap with this annotation
          if (nodeStart >= annotation.markdownEndOffset || nodeEnd <= annotation.markdownStartOffset) {
            return;
          }

          // Calculate character offsets within this text node
          const charStart = Math.max(0, annotation.markdownStartOffset - nodeStart);
          const charEnd = Math.min(node.value.length, annotation.markdownEndOffset - nodeStart);
          if (charStart >= charEnd) return;

          // Build replacement nodes: [before text, <mark>highlighted</mark>, after text]
          // Split fragments retain synthetic position data so subsequent annotation
          // passes can still match them by markdown offset.
          const parts: ElementContent[] = [];

          if (charStart > 0) {
            parts.push(textWithPosition(node.value.slice(0, charStart), nodeStart, nodeStart + charStart));
          }

          const markNode: Element = {
            type: 'element',
            tagName: 'mark',
            properties: {
              dataAnnotationId: annotation.id,
              ...(activeId === annotation.id ? { className: ['active'] } : {}),
            },
            children: [{ type: 'text', value: node.value.slice(charStart, charEnd) }],
          };
          parts.push(markNode);

          if (charEnd < node.value.length) {
            parts.push(textWithPosition(node.value.slice(charEnd), nodeStart + charEnd, nodeEnd));
          }

          // Replace the text node with the split parts
          (parent.children as ElementContent[]).splice(index, 1, ...parts);

          // Tell visitor to skip past the nodes we just inserted
          return [SKIP, index + parts.length] as const;
        });
      }
    };
  };
}

/** Creates a text node with synthetic position offsets. */
function textWithPosition(value: string, startOffset: number, endOffset: number): Text {
  return {
    type: 'text',
    value,
    position: {
      start: { line: 0, column: 0, offset: startOffset },
      end: { line: 0, column: 0, offset: endOffset },
    },
  };
}
