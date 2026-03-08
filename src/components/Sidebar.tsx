// ABOUTME: Right sidebar displaying annotation cards positioned alongside their document highlights.
// ABOUTME: Cards float at the Y position of their corresponding marks, with collision avoidance.

import { useState, useRef, useEffect, useCallback, forwardRef } from 'react';
import type { Annotation } from '../lib/types';
import { useDragResize } from '../hooks/useDragResize';

const COLLAPSED_WIDTH = 40;
const CARD_GAP = 8;

interface SidebarProps {
  annotations: Annotation[];
  activeAnnotationId: string | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onActivate: (id: string) => void;
  onUpdate: (id: string, note: string) => void;
  onDelete: (id: string) => void;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}

export function Sidebar({
  annotations,
  activeAnnotationId,
  collapsed,
  onToggleCollapse,
  onActivate,
  onUpdate,
  onDelete,
  scrollContainerRef,
}: SidebarProps) {
  const { width, handleMouseDown } = useDragResize();
  const cardElements = useRef<Map<string, HTMLDivElement>>(new Map());
  const cardAreaRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [cardPositions, setCardPositions] = useState<Map<string, number>>(new Map());
  const [cardAreaMinHeight, setCardAreaMinHeight] = useState(0);
  const annotationsRef = useRef(annotations);
  annotationsRef.current = annotations;
  const measureFrameRef = useRef(0);

  const measure = useCallback(() => {
    const scrollContainer = scrollContainerRef.current;
    const cardArea = cardAreaRef.current;
    const currentAnnotations = annotationsRef.current;
    if (!scrollContainer || !cardArea || currentAnnotations.length === 0) {
      setCardPositions(new Map());
      setCardAreaMinHeight(0);
      return;
    }

    const cardAreaRect = cardArea.getBoundingClientRect();
    const headerHeight = headerRef.current?.offsetHeight ?? 52;

    // Single DOM traversal instead of N querySelector calls
    const marks = scrollContainer.querySelectorAll('mark[data-annotation-id]');
    const marksByAnnotationId = new Map<string, Element>();
    for (const mark of marks) {
      const id = mark.getAttribute('data-annotation-id');
      if (id) marksByAnnotationId.set(id, mark);
    }

    const items: { id: string; idealY: number; height: number }[] = [];
    for (const annotation of currentAnnotations) {
      const mark = marksByAnnotationId.get(annotation.id);
      if (mark) {
        const markRect = mark.getBoundingClientRect();
        const idealY = markRect.top - cardAreaRect.top;
        const card = cardElements.current.get(annotation.id);
        items.push({
          id: annotation.id,
          idealY,
          height: card?.offsetHeight ?? 100,
        });
      }
    }

    items.sort((a, b) => a.idealY - b.idealY);

    // Resolve collisions: each card starts at max(idealY, previous card bottom)
    const resolved = new Map<string, number>();
    let nextY = headerHeight;
    let maxBottom = 0;
    for (const { id, idealY, height } of items) {
      const y = Math.max(idealY, nextY);
      resolved.set(id, y);
      nextY = y + height + CARD_GAP;
      maxBottom = y + height;
    }

    setCardPositions(resolved);
    setCardAreaMinHeight(maxBottom);
  }, [scrollContainerRef]);

  // Throttled measure via rAF to avoid excessive calls during drag resize
  const scheduleMeasure = useCallback(() => {
    cancelAnimationFrame(measureFrameRef.current);
    measureFrameRef.current = requestAnimationFrame(measure);
  }, [measure]);

  // Measure after annotations change (deferred to let marks render)
  useEffect(() => {
    if (collapsed || annotations.length === 0) {
      setCardPositions(new Map());
      setCardAreaMinHeight(0);
      return;
    }
    scheduleMeasure();
    return () => cancelAnimationFrame(measureFrameRef.current);
  }, [collapsed, annotations, scheduleMeasure]);

  // Stable ResizeObserver — only observes the card area container
  useEffect(() => {
    if (collapsed) return;
    const cardArea = cardAreaRef.current;
    const scrollContainer = scrollContainerRef.current;
    if (!cardArea || !scrollContainer) return;

    const observer = new ResizeObserver(scheduleMeasure);
    observer.observe(scrollContainer);
    observer.observe(cardArea);
    return () => observer.disconnect();
  }, [collapsed, scheduleMeasure, scrollContainerRef]);

  const setCardRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) {
      cardElements.current.set(id, el);
      scheduleMeasure();
    } else {
      cardElements.current.delete(id);
    }
  }, [scheduleMeasure]);

  return (
    <aside
      className="shrink-0 border-l border-cream-300 dark:border-ink-700 bg-cream-50/50 dark:bg-ink-900/50 relative"
      style={{ width: collapsed ? COLLAPSED_WIDTH : width }}
    >
      {/* Drag handle (only when expanded) */}
      {!collapsed && (
        <div
          onMouseDown={handleMouseDown}
          className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize z-10 hover:bg-sienna-400/30 active:bg-sienna-400/40 transition-colors"
        />
      )}

      {/* Header — sticky so it stays visible while scrolling */}
      <div
        ref={headerRef}
        className={`sticky top-0 z-20 bg-cream-50/95 dark:bg-ink-900/95 backdrop-blur-sm flex items-center border-b border-cream-200 dark:border-ink-700 ${
          collapsed ? 'justify-center py-3' : 'px-5 py-4 justify-between'
        }`}
      >
        {!collapsed && (
          <h2 className="font-sans text-xs font-semibold uppercase tracking-widest text-ink-300 dark:text-ink-400">
            Notes
            {annotations.length > 0 && (
              <span className="ml-2 text-ink-200 dark:text-ink-500 font-normal">
                {annotations.length}
              </span>
            )}
          </h2>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-1 rounded text-ink-300 hover:text-ink-500 dark:text-ink-400 dark:hover:text-ink-200 transition-colors"
          aria-label={collapsed ? 'Expand notes panel' : 'Collapse notes panel'}
          title={collapsed ? 'Expand notes panel' : 'Collapse notes panel'}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Annotation cards — positioned at mark Y coordinates */}
      {!collapsed && (
        <div
          ref={cardAreaRef}
          className="relative"
          style={{ minHeight: cardAreaMinHeight }}
        >
          {annotations.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-ink-200 dark:text-ink-500 font-sans">
                Select text or double-click to annotate
              </p>
            </div>
          ) : (
            annotations.map((annotation, index) => {
              const top = cardPositions.get(annotation.id);
              return (
                <AnnotationCard
                  key={annotation.id}
                  ref={(el: HTMLDivElement | null) => setCardRef(annotation.id, el)}
                  annotation={annotation}
                  index={index}
                  isActive={annotation.id === activeAnnotationId}
                  top={top}
                  onActivate={onActivate}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                />
              );
            })
          )}
        </div>
      )}

      {/* Collapsed badge showing count */}
      {collapsed && annotations.length > 0 && (
        <div className="flex justify-center pt-3">
          <span className="text-[10px] font-mono font-medium text-sienna-500 dark:text-sienna-400">
            {annotations.length}
          </span>
        </div>
      )}
    </aside>
  );
}

interface AnnotationCardProps {
  annotation: Annotation;
  index: number;
  isActive: boolean;
  top: number | undefined;
  onActivate: (id: string) => void;
  onUpdate: (id: string, note: string) => void;
  onDelete: (id: string) => void;
}

const AnnotationCard = forwardRef<HTMLDivElement, AnnotationCardProps>(
  function AnnotationCard(
    { annotation, index, isActive, top, onActivate, onUpdate, onDelete },
    ref,
  ) {
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(annotation.note);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
      if (isEditing) {
        textareaRef.current?.focus();
        textareaRef.current?.select();
      }
    }, [isEditing]);

    const handleSave = useCallback(() => {
      if (editText.trim()) {
        onUpdate(annotation.id, editText.trim());
      }
      setIsEditing(false);
    }, [editText, annotation.id, onUpdate]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          handleSave();
        }
        if (e.key === 'Escape') {
          setEditText(annotation.note);
          setIsEditing(false);
        }
      },
      [handleSave, annotation.note],
    );

    const truncatedSelection =
      annotation.selectedText.length > 60
        ? annotation.selectedText.slice(0, 60) + '…'
        : annotation.selectedText;

    return (
      <div
        ref={ref}
        data-sidebar-annotation={annotation.id}
        onClick={() => onActivate(annotation.id)}
        className={`absolute left-3 right-3 group rounded-lg border p-3 cursor-pointer transition-[top,opacity] duration-200 ${
          isActive
            ? 'border-sienna-400 bg-amber-highlight dark:bg-amber-highlight-dark shadow-sm'
            : 'border-cream-200 dark:border-ink-700 hover:border-cream-300 dark:hover:border-ink-600 bg-cream-50 dark:bg-ink-800'
        }`}
        style={{
          top: top ?? 0,
          opacity: top !== undefined ? 1 : 0,
        }}
      >
        {/* Tag + actions row */}
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-mono font-medium text-sienna-500 dark:text-sienna-400 uppercase tracking-wider">
            A{index + 1}
          </span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditText(annotation.note);
                setIsEditing(true);
              }}
              className="p-1 rounded text-ink-300 hover:text-ink-500 dark:text-ink-400 dark:hover:text-ink-200"
              aria-label="Edit annotation"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(annotation.id);
              }}
              className="p-1 rounded text-ink-300 hover:text-red-500 dark:text-ink-400 dark:hover:text-red-400"
              aria-label="Delete annotation"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </div>
        </div>

        {/* Selected text */}
        <p className="font-serif text-xs text-ink-400 dark:text-ink-300 italic leading-relaxed mb-2">
          &ldquo;{truncatedSelection}&rdquo;
        </p>

        {/* Note */}
        {isEditing ? (
          <div onClick={(e) => e.stopPropagation()}>
            <textarea
              ref={textareaRef}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full h-16 px-2 py-1.5 bg-cream-100 dark:bg-ink-700 border border-cream-300 dark:border-ink-600 rounded text-xs font-sans text-ink-700 dark:text-ink-100 resize-none focus:outline-none focus:border-sienna-400"
            />
            <div className="flex justify-end gap-1 mt-1">
              <button
                onClick={() => {
                  setEditText(annotation.note);
                  setIsEditing(false);
                }}
                className="px-2 py-1 text-[10px] font-sans text-ink-300 hover:text-ink-500 dark:text-ink-400 dark:hover:text-ink-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-2 py-1 text-[10px] font-sans font-medium bg-ink-700 dark:bg-cream-100 text-cream-50 dark:text-ink-800 rounded"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <p className="font-sans text-xs text-ink-600 dark:text-ink-200 leading-relaxed">
            {annotation.note}
          </p>
        )}
      </div>
    );
  },
);
