// ABOUTME: Landing view where users paste markdown content to begin annotating.
// ABOUTME: Shows a centered textarea with editorial styling, drag-and-drop zone, and a subtle prompt.

import { useState, useCallback } from 'react';

interface InputViewProps {
  onSubmit: (markdown: string) => void;
}

function readMarkdownFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function isMarkdownFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    name.endsWith('.md') ||
    name.endsWith('.markdown') ||
    name.endsWith('.mdown') ||
    name.endsWith('.mkd') ||
    name.endsWith('.txt') ||
    file.type === 'text/markdown' ||
    file.type === 'text/plain'
  );
}

export function InputView({ onSubmit }: InputViewProps) {
  const [text, setText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [dragError, setDragError] = useState<string | null>(null);

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

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragError(null);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only leave if we're exiting the drop zone entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;

      const file = files[0];
      if (!isMarkdownFile(file)) {
        setDragError('Please drop a markdown (.md) or text (.txt) file');
        return;
      }

      try {
        const content = await readMarkdownFile(file);
        if (content.trim()) {
          onSubmit(content);
        }
      } catch {
        setDragError('Could not read file');
      }
    },
    [onSubmit],
  );

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Full-screen drag overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-cream-50/80 dark:bg-ink-900/80 backdrop-blur-sm">
          <div className="border-2 border-dashed border-sienna-400 rounded-2xl px-16 py-12 text-center">
            <svg className="mx-auto mb-4 text-sienna-500 dark:text-sienna-400" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="12" y2="12" />
              <line x1="15" y1="15" x2="12" y2="12" />
            </svg>
            <p className="font-serif text-lg text-ink-600 dark:text-cream-200">
              Drop your markdown file
            </p>
          </div>
        </div>
      )}

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
      </div>
    </div>
  );
}
