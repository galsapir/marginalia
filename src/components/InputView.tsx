// ABOUTME: Landing view where users paste markdown content to begin annotating.
// ABOUTME: Shows a centered textarea with editorial styling, drag-and-drop zone, and a subtle prompt.

import { useState, useCallback } from 'react';
import { useFileDrop } from '../hooks/useFileDrop';
import { DropOverlay } from './DropOverlay';
import { changelog } from '../lib/changelog';

interface InputViewProps {
  onSubmit: (markdown: string) => void;
}

const buildDate = new Date(__BUILD_TIMESTAMP__).toLocaleDateString('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

export function InputView({ onSubmit }: InputViewProps) {
  const [text, setText] = useState('');
  const [dragError, setDragError] = useState<string | null>(null);
  const [changelogOpen, setChangelogOpen] = useState(false);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const pasted = e.clipboardData.getData('text');
      if (pasted.trim()) {
        e.preventDefault();
        onSubmit(pasted);
      }
    },
    [onSubmit],
  );

  const handleSubmit = useCallback(() => {
    if (text.trim()) {
      onSubmit(text);
    }
  }, [text, onSubmit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  const { isDragging, dragHandlers } = useFileDrop({
    onFileLoad: onSubmit,
    onError: setDragError,
  });

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      {...dragHandlers}
    >
      {isDragging && <DropOverlay message="Drop your markdown file" />}

      <div className="w-full max-w-2xl">
        {/* Title */}
        <div className="mb-12 text-center">
          <h1 className="font-serif text-4xl font-light tracking-tight text-ink-800 dark:text-cream-100 mb-3">
            Marginalia
          </h1>
          <p className="font-serif text-lg text-ink-300 dark:text-ink-300 italic">
            Annotate your documents
          </p>
        </div>

        {/* Paste area */}
        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onPaste={handlePaste}
            onKeyDown={handleKeyDown}
            placeholder="Paste your markdown here..."
            className="w-full h-64 px-6 py-5 bg-cream-100 dark:bg-ink-800 border border-cream-300 dark:border-ink-600 rounded-lg font-mono text-sm text-ink-700 dark:text-ink-100 placeholder-ink-200 dark:placeholder-ink-500 resize-none focus:outline-none focus:border-sienna-400 dark:focus:border-sienna-500 focus:ring-1 focus:ring-sienna-400/30"
            autoFocus
          />

          {text.trim() && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleSubmit}
                className="px-5 py-2 bg-ink-700 dark:bg-cream-100 text-cream-50 dark:text-ink-800 font-sans text-sm font-medium rounded-lg hover:bg-ink-800 dark:hover:bg-cream-200 transition-colors"
              >
                Begin annotating
                <span className="ml-2 text-ink-300 dark:text-ink-400 text-xs">⌘↵</span>
              </button>
            </div>
          )}
        </div>

        {dragError && (
          <p className="mt-4 text-center text-xs text-red-500 font-sans">
            {dragError}
          </p>
        )}

        <p className="mt-6 text-center text-xs text-ink-200 dark:text-ink-500 font-sans">
          Paste markdown, drag &amp; drop a .md file, then highlight text to add annotations
        </p>

        {/* Version footer */}
        <div className="mt-16 border-t border-cream-200 dark:border-ink-700 pt-4">
          <div className="flex items-center justify-center gap-2">
            <span className="text-[10px] font-mono text-ink-200 dark:text-ink-500">
              {buildDate}
            </span>
            <button
              onClick={() => setChangelogOpen((prev) => !prev)}
              className="text-[10px] font-sans text-ink-300 dark:text-ink-400 hover:text-sienna-500 dark:hover:text-sienna-400 transition-colors"
            >
              {changelogOpen ? 'Hide' : "What's new"}
            </button>
          </div>

          {changelogOpen && (
            <div className="mt-4 max-h-64 overflow-y-auto">
              {changelog.slice(0, 5).map((entry) => (
                <div key={entry.date} className="mb-3">
                  <p className="text-[10px] font-mono text-ink-300 dark:text-ink-400 mb-1">
                    {entry.date}
                  </p>
                  <ul className="space-y-0.5">
                    {entry.changes.map((change) => (
                      <li
                        key={change}
                        className="text-xs font-sans text-ink-400 dark:text-ink-300 pl-3 relative before:content-['·'] before:absolute before:left-0 before:text-sienna-400"
                      >
                        {change}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
