// ABOUTME: Renders markdown with annotation highlights and handles text selection for new annotations.
// ABOUTME: Uses react-markdown with rehype source positions; post-processes DOM to apply highlight marks.

import { useRef, useEffect, useCallback, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeSourcePositions from '../lib/remarkSourcePositions';
import { selectionToMarkdownRange, clickToMarkdownOffset } from '../lib/selection';
import { AnnotationPopover } from './AnnotationPopover';
import type { Annotation, AnnotationKind } from '../lib/types';

interface DocumentViewProps {
  markdown: string;
  annotations: Annotation[];
  activeAnnotationId: string | null;
  onAddAnnotation: (selectedText: string, note: string, startOffset: number, endOffset: number, kind?: AnnotationKind) => string;
  onActivateAnnotation: (id: string) => void;
}

interface PendingAnnotation {
  kind: AnnotationKind;
  selectedText: string;
  startOffset: number;
  endOffset: number;
  popoverPosition: { x: number; y: number };
}

export function DocumentView({
  markdown,
  annotations,
  activeAnnotationId,
  onAddAnnotation,
  onActivateAnnotation,
}: DocumentViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState<PendingAnnotation | null>(null);

  // Handle text selection (mouseup)
  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || !containerRef.current) return;

    const result = selectionToMarkdownRange(selection, containerRef.current);
    if (!result) return;

    // Get position for the popover
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    setPending({
      kind: 'range',
      selectedText: result.selectedText,
      startOffset: result.startOffset,
      endOffset: result.endOffset,
      popoverPosition: {
        x: rect.left + window.scrollX,
        y: rect.bottom + window.scrollY,
      },
    });
  }, []);

  // Handle double-click for point annotations
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    // Don't create point annotation if clicking on an existing highlight
    if ((e.target as HTMLElement).closest('mark[data-annotation-id]')) return;

    e.preventDefault();
    window.getSelection()?.removeAllRanges();

    if (!containerRef.current) return;

    // Get the caret position from the double-click
    const caretPos = document.caretPositionFromPoint?.(e.clientX, e.clientY);
    const caretRange = document.caretRangeFromPoint?.(e.clientX, e.clientY);

    const node = caretPos?.offsetNode ?? caretRange?.startContainer;
    const offset = caretPos?.offset ?? caretRange?.startOffset ?? 0;

    if (!node) return;

    const mdOffset = clickToMarkdownOffset(node, offset, containerRef.current);
    if (mdOffset === null) return;

    setPending({
      kind: 'point',
      selectedText: '',
      startOffset: mdOffset,
      endOffset: mdOffset,
      popoverPosition: {
        x: e.clientX + window.scrollX,
        y: e.clientY + window.scrollY,
      },
    });
  }, []);

  const handlePopoverSubmit = useCallback(
    (note: string) => {
      if (pending) {
        onAddAnnotation(pending.selectedText, note, pending.startOffset, pending.endOffset, pending.kind);
        setPending(null);
        window.getSelection()?.removeAllRanges();
      }
    },
    [pending, onAddAnnotation],
  );

  const handlePopoverDismiss = useCallback(() => {
    setPending(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  // Apply annotation highlights to the rendered DOM
  useEffect(() => {
    if (!containerRef.current) return;
    applyHighlights(containerRef.current, annotations, activeAnnotationId, onActivateAnnotation);
  }, [annotations, activeAnnotationId, markdown, onActivateAnnotation]);

  // Scroll to active annotation highlight in document
  useEffect(() => {
    if (!activeAnnotationId || !containerRef.current) return;
    const el =
      containerRef.current.querySelector(`mark[data-annotation-id="${activeAnnotationId}"]`) ??
      containerRef.current.querySelector(`span[data-point-annotation-id="${activeAnnotationId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeAnnotationId]);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="markdown-body"
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      >
        <ReactMarkdown rehypePlugins={[rehypeSourcePositions]}>
          {markdown}
        </ReactMarkdown>
      </div>

      {pending && (
        <AnnotationPopover
          position={pending.popoverPosition}
          selectedText={pending.selectedText}
          isPoint={pending.kind === 'point'}
          onSubmit={handlePopoverSubmit}
          onDismiss={handlePopoverDismiss}
        />
      )}
    </div>
  );
}

/**
 * Post-processes the rendered markdown DOM to wrap annotated text ranges
 * with <mark> elements. This runs after every render/annotation change.
 */
function applyHighlights(
  container: HTMLElement,
  annotations: Annotation[],
  activeId: string | null,
  onActivate: (id: string) => void,
) {
  // Remove existing marks and point markers first
  container.querySelectorAll('mark[data-annotation-id]').forEach((mark) => {
    const parent = mark.parentNode;
    if (parent) {
      while (mark.firstChild) {
        parent.insertBefore(mark.firstChild, mark);
      }
      parent.removeChild(mark);
      parent.normalize();
    }
  });
  container.querySelectorAll('span[data-point-annotation-id]').forEach((span) => {
    span.parentNode?.removeChild(span);
  });

  // Sort annotations by start offset (descending) to process from end to start
  // so earlier insertions don't shift later offsets
  const sorted = [...annotations].sort(
    (a, b) => b.markdownStartOffset - a.markdownStartOffset,
  );

  for (const annotation of sorted) {
    if (annotation.kind === 'point') {
      insertPointMarker(container, annotation, activeId === annotation.id, onActivate);
    } else {
      wrapAnnotationRange(container, annotation, activeId === annotation.id, onActivate);
    }
  }
}

/**
 * Wraps the text corresponding to an annotation's markdown range with a <mark> element.
 * Finds elements with matching source positions and wraps the appropriate text nodes.
 */
function wrapAnnotationRange(
  container: HTMLElement,
  annotation: Annotation,
  isActive: boolean,
  onActivate: (id: string) => void,
) {
  // Find all elements whose source range overlaps with this annotation
  const elements = container.querySelectorAll('[data-source-start][data-source-end]');

  for (const el of elements) {
    const elStart = parseInt(el.getAttribute('data-source-start')!, 10);
    const elEnd = parseInt(el.getAttribute('data-source-end')!, 10);

    // Check if this element's range overlaps with the annotation
    if (elStart >= annotation.markdownEndOffset || elEnd <= annotation.markdownStartOffset) {
      continue;
    }

    // Walk text nodes within this element and wrap matching ranges
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    let node: Node | null;
    while ((node = walker.nextNode())) {
      textNodes.push(node as Text);
    }

    // Calculate the offset within this element where the annotation starts/ends
    const annotationStartInEl = Math.max(0, annotation.markdownStartOffset - elStart);
    const annotationEndInEl = Math.min(elEnd - elStart, annotation.markdownEndOffset - elStart);

    let charCount = 0;
    for (const textNode of textNodes) {
      const textLength = textNode.textContent?.length ?? 0;
      const nodeStart = charCount;
      const nodeEnd = charCount + textLength;

      // Check if this text node overlaps with the annotation range within the element
      if (nodeStart < annotationEndInEl && nodeEnd > annotationStartInEl) {
        const wrapStart = Math.max(0, annotationStartInEl - nodeStart);
        const wrapEnd = Math.min(textLength, annotationEndInEl - nodeStart);

        if (wrapStart < wrapEnd && textNode.parentElement?.tagName !== 'MARK') {
          const range = document.createRange();
          range.setStart(textNode, wrapStart);
          range.setEnd(textNode, wrapEnd);

          const mark = document.createElement('mark');
          mark.setAttribute('data-annotation-id', annotation.id);
          if (isActive) mark.classList.add('active');
          mark.addEventListener('click', (e) => {
            e.stopPropagation();
            onActivate(annotation.id);
          });

          try {
            range.surroundContents(mark);
          } catch {
            // surroundContents can fail if the range crosses element boundaries
            // In that case, we skip this text node
          }
          break; // After wrapping, the text nodes have changed, so exit loop
        }
      }

      charCount += textLength;
    }
  }
}

/**
 * Inserts a small visual marker at the point annotation's location in the document.
 */
function insertPointMarker(
  container: HTMLElement,
  annotation: Annotation,
  isActive: boolean,
  onActivate: (id: string) => void,
) {
  const elements = container.querySelectorAll('[data-source-start][data-source-end]');

  for (const el of elements) {
    const elStart = parseInt(el.getAttribute('data-source-start')!, 10);
    const elEnd = parseInt(el.getAttribute('data-source-end')!, 10);

    if (annotation.markdownStartOffset < elStart || annotation.markdownStartOffset > elEnd) {
      continue;
    }

    const targetOffset = annotation.markdownStartOffset - elStart;

    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let charCount = 0;
    let textNode: Text | null = null;

    let current: Node | null;
    while ((current = walker.nextNode())) {
      const len = current.textContent?.length ?? 0;
      if (charCount + len >= targetOffset) {
        textNode = current as Text;
        break;
      }
      charCount += len;
    }

    if (textNode) {
      const offsetInNode = targetOffset - charCount;

      const marker = document.createElement('span');
      marker.setAttribute('data-point-annotation-id', annotation.id);
      marker.setAttribute('data-annotation-id', annotation.id);
      marker.className = `inline-block w-2 h-2 rounded-full mx-0.5 align-middle cursor-pointer ${
        isActive
          ? 'bg-sienna-500'
          : 'bg-sienna-400/60 hover:bg-sienna-500'
      }`;
      marker.style.transition = 'background-color 0.15s ease';
      marker.addEventListener('click', (e) => {
        e.stopPropagation();
        onActivate(annotation.id);
      });

      // Split text node and insert marker
      if (offsetInNode > 0 && offsetInNode < (textNode.textContent?.length ?? 0)) {
        textNode.splitText(offsetInNode);
      }
      textNode.parentNode?.insertBefore(marker, textNode.nextSibling);
      return;
    }
  }
}
