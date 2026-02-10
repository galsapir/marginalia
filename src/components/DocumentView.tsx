// ABOUTME: Renders markdown with annotation highlights, text selection for annotations, and inline editing.
// ABOUTME: Uses react-markdown with rehype source positions; post-processes DOM to apply highlight marks.

import { useRef, useEffect, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSourcePositions from '../lib/remarkSourcePositions';
import { selectionToMarkdownRange } from '../lib/selection';
import { AnnotationPopover } from './AnnotationPopover';
import type { Annotation } from '../lib/types';

interface DocumentViewProps {
  markdown: string;
  annotations: Annotation[];
  activeAnnotationId: string | null;
  onAddAnnotation: (selectedText: string, note: string, startOffset: number, endOffset: number) => string;
  onActivateAnnotation: (id: string) => void;
  onEditMarkdown: (startOffset: number, endOffset: number, newText: string) => void;
}

interface PendingAnnotation {
  selectedText: string;
  startOffset: number;
  endOffset: number;
  popoverPosition: { x: number; y: number; selectionTop: number };
}

interface InlineEdit {
  startOffset: number;
  endOffset: number;
  originalMarkdown: string;
}

export function DocumentView({
  markdown,
  annotations,
  activeAnnotationId,
  onAddAnnotation,
  onActivateAnnotation,
  onEditMarkdown,
}: DocumentViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState<PendingAnnotation | null>(null);
  const [editing, setEditing] = useState<InlineEdit | null>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  const mouseUpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Handle text selection (mouseup)
  // Delayed slightly so double-click can cancel it and take priority
  const handleMouseUp = useCallback(() => {
    if (editing) return;

    if (mouseUpTimerRef.current) clearTimeout(mouseUpTimerRef.current);
    mouseUpTimerRef.current = setTimeout(() => {
      mouseUpTimerRef.current = null;

      const selection = window.getSelection();
      if (!selection || !containerRef.current) return;

      const result = selectionToMarkdownRange(selection, containerRef.current);
      if (!result) return;

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      setPending({
        selectedText: result.selectedText,
        startOffset: result.startOffset,
        endOffset: result.endOffset,
        popoverPosition: {
          x: rect.left,
          y: rect.bottom,
          selectionTop: rect.top,
        },
      });
    }, 250);
  }, [editing]);

  // Handle double-click for inline editing
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    // Cancel any pending mouseup annotation popover
    if (mouseUpTimerRef.current) {
      clearTimeout(mouseUpTimerRef.current);
      mouseUpTimerRef.current = null;
    }
    setPending(null);

    // Don't edit if clicking on an existing highlight — that's for activating annotations
    if ((e.target as HTMLElement).closest('mark[data-annotation-id]')) return;

    e.preventDefault();
    window.getSelection()?.removeAllRanges();

    // Find the nearest element with source position data
    let el = e.target as HTMLElement;
    while (el && el !== containerRef.current) {
      const sourceStart = el.getAttribute('data-source-start');
      const sourceEnd = el.getAttribute('data-source-end');
      if (sourceStart !== null && sourceEnd !== null) {
        const start = parseInt(sourceStart, 10);
        const end = parseInt(sourceEnd, 10);
        const blockMarkdown = markdown.slice(start, end);

        setEditing({
          startOffset: start,
          endOffset: end,
          originalMarkdown: blockMarkdown,
        });
        return;
      }
      el = el.parentElement!;
    }
  }, [pending, markdown]);

  // Global Esc listener to cancel editing even if textarea loses focus
  useEffect(() => {
    if (!editing) return;
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEditing(null);
      }
    };
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [editing]);

  const handleEditSave = useCallback(() => {
    if (!editing || !editTextareaRef.current) return;
    const newText = editTextareaRef.current.value;
    if (newText !== editing.originalMarkdown) {
      onEditMarkdown(editing.startOffset, editing.endOffset, newText);
    }
    setEditing(null);
  }, [editing, onEditMarkdown]);

  const handleEditCancel = useCallback(() => {
    setEditing(null);
  }, []);

  const handleEditKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleEditSave();
      }
      if (e.key === 'Escape') {
        handleEditCancel();
      }
    },
    [handleEditSave, handleEditCancel],
  );

  const handlePopoverSubmit = useCallback(
    (note: string) => {
      if (pending) {
        onAddAnnotation(pending.selectedText, note, pending.startOffset, pending.endOffset);
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
    if (!containerRef.current || editing) return;
    applyHighlights(containerRef.current, annotations, activeAnnotationId, onActivateAnnotation);
  }, [annotations, activeAnnotationId, markdown, onActivateAnnotation, editing]);

  // Scroll to active annotation highlight in document
  useEffect(() => {
    if (!activeAnnotationId || !containerRef.current) return;
    const mark = containerRef.current.querySelector(`mark[data-annotation-id="${activeAnnotationId}"]`);
    if (mark) {
      mark.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeAnnotationId]);

  // Auto-resize textarea to fit content
  const handleTextareaInput = useCallback((e: React.FormEvent<HTMLTextAreaElement>) => {
    const ta = e.currentTarget;
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
  }, []);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="markdown-body"
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSourcePositions]}>
          {markdown}
        </ReactMarkdown>
      </div>

      {/* Inline edit overlay */}
      {editing && (
        <InlineEditOverlay
          editing={editing}
          containerRef={containerRef}
          textareaRef={editTextareaRef}
          onSave={handleEditSave}
          onCancel={handleEditCancel}
          onKeyDown={handleEditKeyDown}
          onInput={handleTextareaInput}
        />
      )}

      {pending && (
        <AnnotationPopover
          position={pending.popoverPosition}
          selectedText={pending.selectedText}
          onSubmit={handlePopoverSubmit}
          onDismiss={handlePopoverDismiss}
        />
      )}
    </div>
  );
}

/**
 * Replaces a rendered block in-place with an editable textarea using a portal.
 * Inserted into document flow so it pushes content down naturally.
 */
function InlineEditOverlay({
  editing,
  containerRef,
  textareaRef,
  onSave,
  onCancel,
  onKeyDown,
  onInput,
}: {
  editing: InlineEdit;
  containerRef: React.RefObject<HTMLDivElement | null>;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onSave: () => void;
  onCancel: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onInput: (e: React.FormEvent<HTMLTextAreaElement>) => void;
}) {
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(null);

  // Insert a placeholder div next to the target element in the DOM flow
  useEffect(() => {
    if (!containerRef.current) return;
    const elements = containerRef.current.querySelectorAll('[data-source-start][data-source-end]');
    for (const el of elements) {
      const start = parseInt(el.getAttribute('data-source-start')!, 10);
      const end = parseInt(el.getAttribute('data-source-end')!, 10);
      if (start === editing.startOffset && end === editing.endOffset) {
        const target = el as HTMLElement;
        target.style.display = 'none';

        const container = document.createElement('div');
        target.parentNode!.insertBefore(container, target);
        setPortalContainer(container);

        return () => {
          target.style.display = '';
          container.remove();
          setPortalContainer(null);
        };
      }
    }
  }, [editing, containerRef]);

  // Focus textarea once portal is mounted
  useEffect(() => {
    if (portalContainer && textareaRef.current) {
      const ta = textareaRef.current;
      ta.focus();
      ta.selectionStart = ta.value.length;
      ta.selectionEnd = ta.value.length;
      // Auto-size to content
      ta.style.height = 'auto';
      ta.style.height = ta.scrollHeight + 'px';
    }
  }, [portalContainer, textareaRef]);

  if (!portalContainer) return null;

  return createPortal(
    <div className="my-2">
      <textarea
        ref={textareaRef}
        defaultValue={editing.originalMarkdown}
        onKeyDown={onKeyDown}
        onInput={onInput}
        className="w-full min-h-[3em] px-3 py-2 bg-cream-100 dark:bg-ink-800 border-2 border-sienna-400 dark:border-sienna-500 rounded-lg font-mono text-sm text-ink-700 dark:text-ink-100 resize-none focus:outline-none"
        style={{ overflow: 'hidden' }}
      />
      <div className="flex justify-between items-center mt-1.5">
        <span className="text-[10px] text-ink-200 dark:text-ink-500 font-sans">
          ⌘↵ save · Esc cancel
        </span>
        <div className="flex gap-1">
          <button
            onClick={onCancel}
            className="px-2 py-1 text-[10px] font-sans text-ink-300 hover:text-ink-500 dark:text-ink-400 dark:hover:text-ink-200"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="px-2 py-1 text-[10px] font-sans font-medium bg-ink-700 dark:bg-cream-100 text-cream-50 dark:text-ink-800 rounded"
          >
            Save
          </button>
        </div>
      </div>
    </div>,
    portalContainer,
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
  // Remove existing marks first
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

  // Sort annotations by start offset (descending) to process from end to start
  // so earlier insertions don't shift later offsets
  const sorted = [...annotations].sort(
    (a, b) => b.markdownStartOffset - a.markdownStartOffset,
  );

  for (const annotation of sorted) {
    wrapAnnotationRange(container, annotation, activeId === annotation.id, onActivate);
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
  const elements = container.querySelectorAll('[data-source-start][data-source-end]');

  for (const el of elements) {
    const elStart = parseInt(el.getAttribute('data-source-start')!, 10);
    const elEnd = parseInt(el.getAttribute('data-source-end')!, 10);

    if (elStart >= annotation.markdownEndOffset || elEnd <= annotation.markdownStartOffset) {
      continue;
    }

    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    let node: Node | null;
    while ((node = walker.nextNode())) {
      textNodes.push(node as Text);
    }

    const annotationStartInEl = Math.max(0, annotation.markdownStartOffset - elStart);
    const annotationEndInEl = Math.min(elEnd - elStart, annotation.markdownEndOffset - elStart);

    let charCount = 0;
    for (const textNode of textNodes) {
      const textLength = textNode.textContent?.length ?? 0;
      const nodeStart = charCount;
      const nodeEnd = charCount + textLength;

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
          }
          break;
        }
      }

      charCount += textLength;
    }
  }
}
