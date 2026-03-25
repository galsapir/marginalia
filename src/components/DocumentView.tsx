// ABOUTME: Renders markdown with annotation highlights, text selection for annotations, and inline editing.
// ABOUTME: Uses react-markdown with rehype source positions; post-processes DOM to apply highlight marks.

import { useRef, useEffect, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSourcePositions from '../lib/remarkSourcePositions';
import { selectionToMarkdownRange } from '../lib/selection';
import { getTextNodeMarkdownRange } from '../lib/positions';
import { AnnotationPopover } from './AnnotationPopover';
import { NotePopover } from './NotePopover';
import type { Annotation } from '../lib/types';

interface DocumentViewProps {
  markdown: string;
  annotations: Annotation[];
  activeAnnotationId: string | null;
  onAddAnnotation: (selectedText: string, note: string, startOffset: number, endOffset: number) => string;
  onActivateAnnotation: (id: string) => void;
  onUpdateAnnotation: (id: string, note: string) => void;
  onDeleteAnnotation: (id: string) => void;
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
  onUpdateAnnotation,
  onDeleteAnnotation,
  onEditMarkdown,
}: DocumentViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState<PendingAnnotation | null>(null);
  const [editing, setEditing] = useState<InlineEdit | null>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  const mouseUpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [notePopover, setNotePopover] = useState<{
    annotationId: string;
    position: { x: number; y: number; markTop: number };
  } | null>(null);
  const notePopoverIdRef = useRef<string | null>(null);

  // Keep ref in sync for stable handleMarkClick
  useEffect(() => {
    notePopoverIdRef.current = notePopover?.annotationId ?? null;
  }, [notePopover]);

  // Dismiss popover if its annotation was deleted
  useEffect(() => {
    if (notePopover && !annotations.find(a => a.id === notePopover.annotationId)) {
      setNotePopover(null);
    }
  }, [annotations, notePopover]);

  // Handle mark click — show/toggle note popover
  const handleMarkClick = useCallback((id: string) => {
    if (notePopoverIdRef.current === id) {
      setNotePopover(null);
      return;
    }

    onActivateAnnotation(id);

    const mark = containerRef.current?.querySelector(`mark[data-annotation-id="${id}"]`);
    if (mark) {
      const rect = mark.getBoundingClientRect();
      setNotePopover({
        annotationId: id,
        position: { x: rect.left, y: rect.bottom, markTop: rect.top },
      });
    }
  }, [onActivateAnnotation]);

  // Handle text selection (mouseup)
  // Delayed slightly so double-click can cancel it and take priority
  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (editing) return;
    // Don't dismiss popover when clicking a mark — handleMarkClick manages that
    if (!(e.target as HTMLElement).closest('mark[data-annotation-id]')) {
      setNotePopover(null);
    }

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
    setNotePopover(null);

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
    applyHighlights(containerRef.current, annotations, activeAnnotationId, handleMarkClick);
  }, [annotations, activeAnnotationId, markdown, handleMarkClick, editing]);

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
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeSourcePositions]}
          components={{
            table: ({ children, ...props }) => (
              <div className="table-scroll-container">
                <table {...props}>{children}</table>
              </div>
            ),
          }}
        >
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

      {notePopover && (() => {
        const annotation = annotations.find(a => a.id === notePopover.annotationId);
        const annotationIndex = annotations.findIndex(a => a.id === notePopover.annotationId);
        if (!annotation) return null;
        return (
          <NotePopover
            key={notePopover.annotationId}
            annotation={annotation}
            index={annotationIndex}
            position={notePopover.position}
            onDismiss={() => setNotePopover(null)}
            onUpdate={onUpdateAnnotation}
            onDelete={onDeleteAnnotation}
          />
        );
      })()}
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

  // Collect text nodes once — must snapshot before DOM mutation (surroundContents splits nodes)
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  let n: Node | null;
  while ((n = walker.nextNode())) {
    textNodes.push(n as Text);
  }

  for (const annotation of sorted) {
    wrapAnnotationRange(container, textNodes, annotation, activeId === annotation.id, onActivate);
  }
}

/**
 * Wraps the text corresponding to an annotation's markdown range with <mark> elements.
 * Handles cross-element annotations correctly.
 */
function wrapAnnotationRange(
  container: HTMLElement,
  textNodes: Text[],
  annotation: Annotation,
  isActive: boolean,
  onActivate: (id: string) => void,
) {

  for (const textNode of textNodes) {
    if (textNode.parentElement?.tagName === 'MARK') continue;

    const mdRange = getTextNodeMarkdownRange(textNode, container);
    if (!mdRange) continue;

    // Check overlap with annotation
    if (mdRange.start >= annotation.markdownEndOffset || mdRange.end <= annotation.markdownStartOffset) {
      continue;
    }

    const textLength = textNode.textContent?.length ?? 0;
    const wrapStart = Math.max(0, annotation.markdownStartOffset - mdRange.start);
    const wrapEnd = Math.min(textLength, annotation.markdownEndOffset - mdRange.start);

    if (wrapStart >= wrapEnd) continue;

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
  }
}
