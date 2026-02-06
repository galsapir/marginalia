// ABOUTME: Landing view where users paste markdown content to begin annotating.
// ABOUTME: Shows a centered textarea with editorial styling and a subtle prompt.

import { useState, useCallback } from 'react';

interface InputViewProps {
  onSubmit: (markdown: string) => void;
}

export function InputView({ onSubmit }: InputViewProps) {
  const [text, setText] = useState('');

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

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
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

        <p className="mt-6 text-center text-xs text-ink-200 dark:text-ink-500 font-sans">
          Paste markdown content, then highlight text to add annotations
        </p>
      </div>
    </div>
  );
}
