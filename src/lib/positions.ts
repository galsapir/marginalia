// ABOUTME: Maps DOM text nodes to their markdown source character ranges.
// ABOUTME: Handles inline formatting syntax offsets and cross-element annotation spans.

// Cache for querySelector('[data-source-start]') results — stable within a render cycle
const sourceDescendantCache = new WeakMap<Element, boolean>();

function hasSourcePositionedDescendants(el: Element): boolean {
  let cached = sourceDescendantCache.get(el);
  if (cached === undefined) {
    cached = el.querySelector('[data-source-start]') !== null;
    sourceDescendantCache.set(el, cached);
  }
  return cached;
}

function getContentStart(el: HTMLElement): number {
  return parseInt(
    el.getAttribute('data-content-start') ?? el.getAttribute('data-source-start')!,
    10,
  );
}

/**
 * Returns the markdown source character range [start, end) for a DOM text node.
 * Uses data-content-start for leaf elements (correct offset past syntax markers)
 * and a cursor-based walk for ancestor elements with formatted children.
 */
export function getTextNodeMarkdownRange(
  textNode: Text,
  container: HTMLElement,
): { start: number; end: number } | null {
  let owner: HTMLElement | null = textNode.parentElement;
  while (owner && owner !== container && !owner.hasAttribute('data-source-start')) {
    owner = owner.parentElement;
  }
  if (!owner || owner === container) return null;

  if (!hasSourcePositionedDescendants(owner)) {
    return getLeafTextNodeRange(owner, textNode);
  }

  return getAncestorTextNodeRange(owner, textNode);
}

function getLeafTextNodeRange(
  owner: HTMLElement,
  textNode: Text,
): { start: number; end: number } | null {
  const start = getContentStart(owner) + getRenderedOffsetBefore(owner, textNode);
  const length = textNode.textContent?.length ?? 0;
  return { start, end: start + length };
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

function getAncestorTextNodeRange(
  ancestor: HTMLElement,
  targetNode: Text,
): { start: number; end: number } | null {
  return walkChildren(ancestor, targetNode, getContentStart(ancestor)).found;
}

interface WalkResult {
  found: { start: number; end: number } | null;
  cursor: number;
}

/** Recursively walks child nodes, advancing a markdown cursor past syntax gaps. */
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
        cursor = parseInt(sourceEnd, 10);
      } else {
        const result = walkChildren(el, target, cursor);
        cursor = result.cursor;
        if (result.found) return { found: result.found, cursor };
      }
    }
  }
  return { found: null, cursor };
}
