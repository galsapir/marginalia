// ABOUTME: Floating popover that displays an annotation's note when a highlight is clicked.
// ABOUTME: Supports inline editing; positioned near the mark with viewport-aware flip logic.

import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import type { Annotation } from '../lib/types';

interface NotePopoverProps {
  annotation: Annotation;
  index: number;
  position: { x: number; y: number; markTop: number };
  onDismiss: () => void;
  onUpdate: (id: string, note: string) => void;
  onDelete: (id: string) => void;
}

export function NotePopover({
  annotation,
  index,
  position,
  onDismiss,
  onUpdate,
  onDelete,
}: NotePopoverProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(annotation.note);
  const popoverRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [flipped, setFlipped] = useState(false);
  const [visible, setVisible] = useState(false);

  // Entrance animation trigger
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  // Escape: cancel edit or dismiss popover
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isEditing) {
          setIsEditing(false);
          setEditText(annotation.note);
        } else {
          onDismiss();
        }
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onDismiss, isEditing, annotation.note]);

  // Click outside to dismiss (delay to avoid the triggering click)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        // Don't dismiss if clicking another mark — handleMarkClick replaces the popover
        if ((e.target as HTMLElement).closest?.('mark[data-annotation-id]')) return;
        onDismiss();
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onDismiss]);

  // Flip above mark if insufficient room below
  useLayoutEffect(() => {
    if (!popoverRef.current) return;
    const frame = requestAnimationFrame(() => {
      if (!popoverRef.current) return;
      const popoverHeight = popoverRef.current.offsetHeight;
      const spaceBelow = window.innerHeight - position.y - 8;
      setFlipped(spaceBelow < popoverHeight && position.markTop - 8 - popoverHeight > 0);
    });
    return () => cancelAnimationFrame(frame);
  }, [position, isEditing]);

  // Focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing) {
      textareaRef.current?.focus();
      textareaRef.current?.select();
    }
  }, [isEditing]);

  const handleSave = useCallback(() => {
    if (!editText.trim()) {
      // Empty note — treat as delete
      onDelete(annotation.id);
      onDismiss();
      return;
    }
    onUpdate(annotation.id, editText.trim());
    setIsEditing(false);
  }, [editText, annotation.id, onUpdate, onDelete, onDismiss]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSave();
      }
    },
    [handleSave],
  );

  const handleDelete = useCallback(() => {
    onDelete(annotation.id);
    onDismiss();
  }, [annotation.id, onDelete, onDismiss]);

  const truncatedText =
    annotation.selectedText.length > 80
      ? annotation.selectedText.slice(0, 80) + '…'
      : annotation.selectedText;

  const style: React.CSSProperties = {
    left: Math.min(Math.max(8, position.x), window.innerWidth - 304),
    top: flipped ? undefined : position.y + 8,
    bottom: flipped ? window.innerHeight - position.markTop + 8 : undefined,
  };

  return (
    <div
      ref={popoverRef}
      className={`note-popover fixed z-50 w-72 bg-cream-50 dark:bg-ink-800 border border-cream-200 dark:border-ink-700 border-l-[3px] border-l-sienna-400 dark:border-l-sienna-500 rounded-lg shadow-lg shadow-ink-900/10 dark:shadow-ink-900/50 ${
        visible ? 'note-popover-visible' : ''
      } ${flipped ? 'note-popover-flipped' : ''}`}
      style={style}
    >
      {/* Header: tag + actions */}
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
        <span className="text-[10px] font-mono font-medium text-sienna-500 dark:text-sienna-400 uppercase tracking-wider">
          A{index + 1}
        </span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => {
              setEditText(annotation.note);
              setIsEditing(true);
            }}
            className="p-1 rounded text-ink-200 hover:text-ink-500 dark:text-ink-500 dark:hover:text-ink-200 transition-colors"
            aria-label="Edit note"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            onClick={handleDelete}
            className="p-1 rounded text-ink-200 hover:text-red-500 dark:text-ink-500 dark:hover:text-red-400 transition-colors"
            aria-label="Delete annotation"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Selected text quote */}
      <div className="px-3 pb-2">
        <p className="font-serif text-xs text-ink-400 dark:text-ink-300 italic leading-relaxed">
          &ldquo;{truncatedText}&rdquo;
        </p>
      </div>

      {/* Divider + note content */}
      <div className="px-3 pb-3 border-t border-cream-200 dark:border-ink-700 pt-2">
        {isEditing ? (
          <div>
            <textarea
              ref={textareaRef}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full h-16 px-2 py-1.5 bg-cream-100 dark:bg-ink-700 border border-cream-300 dark:border-ink-600 rounded text-xs font-sans text-ink-700 dark:text-ink-100 resize-none focus:outline-none focus:border-sienna-400"
            />
            <div className="flex justify-between items-center mt-1.5">
              <span className="text-[9px] text-ink-200 dark:text-ink-500 font-sans">
                ⌘↵ save
              </span>
              <div className="flex gap-1">
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
          </div>
        ) : (
          <p className="font-sans text-xs text-ink-600 dark:text-ink-200 leading-relaxed">
            {annotation.note}
          </p>
        )}
      </div>
    </div>
  );
}
