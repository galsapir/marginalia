// ABOUTME: Right sidebar displaying annotation cards ordered by document position.
// ABOUTME: Supports editing, deleting, and bidirectional navigation with document highlights.

import { useState, useRef, useEffect, useCallback } from 'react';
import type { Annotation } from '../lib/types';

interface SidebarProps {
  annotations: Annotation[];
  activeAnnotationId: string | null;
  onActivate: (id: string) => void;
  onUpdate: (id: string, note: string) => void;
  onDelete: (id: string) => void;
}

export function Sidebar({
  annotations,
  activeAnnotationId,
  onActivate,
  onUpdate,
  onDelete,
}: SidebarProps) {
  return (
    <aside className="w-80 shrink-0 border-l border-cream-300 dark:border-ink-700 bg-cream-50/50 dark:bg-ink-900/50 flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-cream-200 dark:border-ink-700">
        <h2 className="font-sans text-xs font-semibold uppercase tracking-widest text-ink-300 dark:text-ink-400">
          Notes
          {annotations.length > 0 && (
            <span className="ml-2 text-ink-200 dark:text-ink-500 font-normal">
              {annotations.length}
            </span>
          )}
        </h2>
      </div>

      {/* Annotation cards */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {annotations.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-ink-200 dark:text-ink-500 font-sans">
              Select text or double-click to annotate
            </p>
          </div>
        ) : (
          annotations.map((annotation, index) => (
            <AnnotationCard
              key={annotation.id}
              annotation={annotation}
              index={index}
              isActive={annotation.id === activeAnnotationId}
              onActivate={onActivate}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </aside>
  );
}

interface AnnotationCardProps {
  annotation: Annotation;
  index: number;
  isActive: boolean;
  onActivate: (id: string) => void;
  onUpdate: (id: string, note: string) => void;
  onDelete: (id: string) => void;
}

function AnnotationCard({
  annotation,
  index,
  isActive,
  onActivate,
  onUpdate,
  onDelete,
}: AnnotationCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(annotation.note);
  const cardRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll into view when activated externally (from document click)
  useEffect(() => {
    if (isActive && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isActive]);

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
      ref={cardRef}
      data-sidebar-annotation={annotation.id}
      onClick={() => onActivate(annotation.id)}
      className={`group rounded-lg border p-3 cursor-pointer transition-all ${
        isActive
          ? 'border-sienna-400 bg-amber-highlight dark:bg-amber-highlight-dark shadow-sm'
          : 'border-cream-200 dark:border-ink-700 hover:border-cream-300 dark:hover:border-ink-600 bg-cream-50 dark:bg-ink-800'
      }`}
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
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Selected text */}
      <p className="font-serif text-xs text-ink-400 dark:text-ink-300 italic leading-relaxed mb-2">
        "{truncatedSelection}"
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
}
