// ABOUTME: Maps DOM text selections to markdown source positions.
// ABOUTME: Walks the DOM selection range to find elements with remark source position data attributes.

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

  // Find nearest elements with source position data attributes
  const startPos = findSourcePosition(range.startContainer, range.startOffset, 'start');
  const endPos = findSourcePosition(range.endContainer, range.endOffset, 'end');

  if (startPos === null || endPos === null) return null;

  return {
    startOffset: startPos,
    endOffset: endPos,
    selectedText,
  };
}

/**
 * Walks up from a text node to find the nearest ancestor with data-source-start/end attributes,
 * then computes the character offset within the markdown source.
 */
function findSourcePosition(
  node: Node,
  offset: number,
  which: 'start' | 'end',
): number | null {
  let el: HTMLElement | null =
    node.nodeType === Node.ELEMENT_NODE
      ? (node as HTMLElement)
      : node.parentElement;

  while (el) {
    const sourceStart = el.getAttribute('data-source-start');
    const sourceEnd = el.getAttribute('data-source-end');

    if (sourceStart !== null && sourceEnd !== null) {
      const start = parseInt(sourceStart, 10);
      const end = parseInt(sourceEnd, 10);

      if (which === 'start') {
        // Calculate text offset within this element up to the selection start
        const textBefore = getTextOffsetInElement(el, node, offset);
        return Math.min(start + textBefore, end);
      } else {
        const textBefore = getTextOffsetInElement(el, node, offset);
        return Math.min(start + textBefore, end);
      }
    }

    el = el.parentElement;
  }

  return null;
}

/**
 * Given a click event target within the rendered markdown container,
 * maps the click position to a character offset in the original markdown source.
 * Used for point annotations (double-click to annotate at a location).
 */
export function clickToMarkdownOffset(
  node: Node,
  offset: number,
  containerEl: HTMLElement,
): number | null {
  if (!containerEl.contains(node)) return null;
  return findSourcePosition(node, offset, 'start');
}

/**
 * Counts the text content length from the start of `root` up to the point
 * defined by (targetNode, targetOffset) using a TreeWalker.
 */
function getTextOffsetInElement(
  root: HTMLElement,
  targetNode: Node,
  targetOffset: number,
): number {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let count = 0;

  let currentNode = walker.nextNode();
  while (currentNode) {
    if (currentNode === targetNode) {
      return count + targetOffset;
    }
    count += (currentNode.textContent?.length ?? 0);
    currentNode = walker.nextNode();
  }

  // If targetNode is the element itself (not a text node within it)
  return count;
}
