// ABOUTME: Maps DOM text nodes to their markdown source character ranges.
// ABOUTME: Handles inline formatting syntax offsets and cross-element annotation spans.

/**
 * Returns the markdown source character range [start, end) for a DOM text node.
 * Uses data-content-start for leaf elements (correct offset past syntax markers)
 * and a cursor-based walk for ancestor elements with formatted children.
 */
export function getTextNodeMarkdownRange(
  textNode: Text,
  container: HTMLElement,
): { start: number; end: number } | null {
  // Find nearest ancestor with source position attributes
  let owner: HTMLElement | null = textNode.parentElement;
  while (owner && owner !== container && !owner.hasAttribute('data-source-start')) {
    owner = owner.parentElement;
  }
  if (!owner || owner === container) return null;

  // Check if owner has any descendant elements with source positions
  const hasSourceDescendants = owner.querySelector('[data-source-start]') !== null;

  if (!hasSourceDescendants) {
    // Leaf element: rendered text maps 1:1 to content range
    return getLeafTextNodeRange(owner, textNode);
  }

  // Ancestor element: use cursor-based walk to account for syntax gaps
  return getAncestorTextNodeRange(owner, textNode);
}

/**
 * For a text node inside a leaf element (no formatted children),
 * uses content-start + rendered character offset.
 */
function getLeafTextNodeRange(
  owner: HTMLElement,
  textNode: Text,
): { start: number; end: number } | null {
  const contentStart = parseInt(
    owner.getAttribute('data-content-start') ?? owner.getAttribute('data-source-start')!,
    10,
  );

  const offset = getRenderedOffsetBefore(owner, textNode);
  const length = textNode.textContent?.length ?? 0;
  return { start: contentStart + offset, end: contentStart + offset + length };
}

/**
 * Counts rendered text characters from the start of root to the start of targetNode.
 */
function getRenderedOffsetBefore(root: Element, targetNode: Text): number {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let count = 0;
  let node = walker.nextNode();
  while (node) {
    if (node === targetNode) return count;
    count += (node.textContent?.length ?? 0);
    node = walker.nextNode();
  }
  return count;
}

/**
 * For a text node inside an ancestor element (has formatted children),
 * walks the DOM tree tracking the markdown cursor position.
 * When encountering source-positioned child elements, jumps the cursor
 * past their full markdown representation (including syntax markers).
 */
function getAncestorTextNodeRange(
  ancestor: HTMLElement,
  targetNode: Text,
): { start: number; end: number } | null {
  const contentStart = parseInt(
    ancestor.getAttribute('data-content-start') ?? ancestor.getAttribute('data-source-start')!,
    10,
  );

  const result = walkChildren(ancestor, targetNode, contentStart);
  return result.found;
}

interface WalkResult {
  found: { start: number; end: number } | null;
  cursor: number;
}

/**
 * Recursively walks child nodes, advancing a markdown cursor.
 * Text nodes advance cursor by their length (no syntax in bare text).
 * Source-positioned elements jump cursor to their source-end.
 * Non-source-positioned elements are recursed into.
 */
function walkChildren(parent: Node, target: Text, cursor: number): WalkResult {
  for (const child of parent.childNodes) {
    if (child === target) {
      const len = child.textContent?.length ?? 0;
      return { found: { start: cursor, end: cursor + len }, cursor: cursor + len };
    }

    if (child.nodeType === Node.TEXT_NODE) {
      cursor += (child.textContent?.length ?? 0);
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as Element;
      const sourceEnd = el.getAttribute('data-source-end');

      if (sourceEnd) {
        // Source-positioned element: jump cursor past its entire markdown
        cursor = parseInt(sourceEnd, 10);
      } else {
        // No source positions (e.g., wrapper div): recurse into it
        const result = walkChildren(el, target, cursor);
        cursor = result.cursor;
        if (result.found) return { found: result.found, cursor };
      }
    }
  }
  return { found: null, cursor };
}
