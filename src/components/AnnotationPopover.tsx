// ABOUTME: Floating popover for creating annotations on text selections.
// ABOUTME: Appears near the selected text with a textarea and submit button; dismisses on Escape.

import { useState, useEffect, useRef, useCallback } from 'react';

interface AnnotationPopoverProps {
  position: { x: number; y: number };
  selectedText: string;
  onSubmit: (note: string) => void;
  onDismiss: () => void;
}

export function AnnotationPopover({
  position,
  selectedText,
  onSubmit,
  onDismiss,
}: AnnotationPopoverProps) {
  const [note, setNote] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Focus the textarea after mount
    const timer = setTimeout(() => textareaRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onDismiss]);

  // Close popover when clicking outside it
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onDismiss();
      }
    };
    // Delay to avoid the click that created the selection
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onDismiss]);

  const handleSubmit = useCallback(() => {
    if (note.trim()) {
      onSubmit(note.trim());
    }
  }, [note, onSubmit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  // Clamp position so the popover stays on screen
  const style: React.CSSProperties = {
    left: Math.min(position.x, window.innerWidth - 360),
    top: position.y + 8,
  };

  const truncatedText =
    selectedText.length > 80
      ? selectedText.slice(0, 80) + '…'
      : selectedText;

  return (
    <div
      ref={popoverRef}
      className="fixed z-50 w-80 bg-cream-50 dark:bg-ink-800 border border-cream-300 dark:border-ink-600 rounded-lg shadow-lg shadow-ink-900/8 dark:shadow-ink-900/40"
      style={style}
    >
      {/* Selected text preview */}
      <div className="px-4 pt-3 pb-2 border-b border-cream-200 dark:border-ink-700">
        <p className="text-xs font-sans text-ink-300 dark:text-ink-400 mb-1">Selection</p>
        <p className="font-serif text-sm text-ink-500 dark:text-ink-200 italic leading-snug">
          "{truncatedText}"
        </p>
      </div>

      {/* Note input */}
      <div className="p-4">
        <textarea
          ref={textareaRef}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add your note..."
          className="w-full h-20 px-3 py-2 bg-cream-100 dark:bg-ink-700 border border-cream-300 dark:border-ink-600 rounded text-sm font-sans text-ink-700 dark:text-ink-100 placeholder-ink-200 dark:placeholder-ink-500 resize-none focus:outline-none focus:border-sienna-400 dark:focus:border-sienna-500"
        />
        <div className="flex justify-between items-center mt-3">
          <span className="text-xs text-ink-200 dark:text-ink-500 font-sans">
            ⌘↵ to save · Esc to cancel
          </span>
          <button
            onClick={handleSubmit}
            disabled={!note.trim()}
            className="px-3 py-1.5 bg-ink-700 dark:bg-cream-100 text-cream-50 dark:text-ink-800 text-xs font-sans font-medium rounded hover:bg-ink-800 dark:hover:bg-cream-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Add note
          </button>
        </div>
      </div>
    </div>
  );
}
