// ABOUTME: Maps DOM text selections to markdown source positions.
// ABOUTME: Uses position utilities to correctly handle inline formatting syntax offsets.

import { getTextNodeMarkdownRange } from './positions';

interface MarkdownRange {
  startOffset: number;
  endOffset: number;
  selectedText: string;
}

/**
 * Given a DOM Selection within the rendered markdown container,
 * maps it back to character offsets in the original markdown source.
 */
export function selectionToMarkdownRange(
  selection: Selection,
  containerEl: HTMLElement,
): MarkdownRange | null {
  if (!selection.rangeCount) return null;

  const range = selection.getRangeAt(0);
  if (range.collapsed) return null;

  // Make sure selection is within our container
  if (!containerEl.contains(range.startContainer) || !containerEl.contains(range.endContainer)) {
    return null;
  }

  const selectedText = selection.toString().trim();
  if (!selectedText) return null;

  const startPos = getMarkdownOffset(range.startContainer, range.startOffset, containerEl);
  const endPos = getMarkdownOffset(range.endContainer, range.endOffset, containerEl);

  if (startPos === null || endPos === null) return null;

  return {
    startOffset: startPos,
    endOffset: endPos,
    selectedText,
  };
}

/**
 * Converts a DOM position (node + character offset) to a markdown source offset.
 * For text nodes, uses the position mapping utility.
 * For element nodes, finds the boundary text position.
 */
function getMarkdownOffset(
  node: Node,
  charOffset: number,
  container: HTMLElement,
): number | null {
  if (node.nodeType === Node.TEXT_NODE) {
    const mdRange = getTextNodeMarkdownRange(node as Text, container);
    if (!mdRange) return null;
    return mdRange.start + charOffset;
  }

  // Element node: offset is a child index (DOM Selection spec).
  // Find the text boundary at that child index.
  const el = node as Element;
  if (charOffset === 0) {
    // Start of element — find first text node
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const firstText = walker.nextNode() as Text | null;
    if (firstText) {
      const mdRange = getTextNodeMarkdownRange(firstText, container);
      return mdRange?.start ?? null;
    }
  } else {
    // End of element or mid-child — find the last text node up to this child index
    const targetChild = el.childNodes[Math.min(charOffset, el.childNodes.length) - 1];
    if (targetChild) {
      const walker = document.createTreeWalker(
        targetChild.nodeType === Node.ELEMENT_NODE ? targetChild as Element : el,
        NodeFilter.SHOW_TEXT,
      );
      let lastText: Text | null = null;
      let n: Node | null;
      while ((n = walker.nextNode())) lastText = n as Text;
      if (lastText) {
        const mdRange = getTextNodeMarkdownRange(lastText, container);
        if (!mdRange) return null;
        return mdRange.end;
      }
    }
  }

  return null;
}
