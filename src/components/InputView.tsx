// ABOUTME: Landing view where users paste markdown or load from a URL (GitHub files, webpages).
// ABOUTME: Shows a centered textarea with editorial styling, drag-and-drop zone, URL input, and a subtle prompt.

import { useState, useCallback } from 'react';
import { useFileDrop } from '../hooks/useFileDrop';
import { DropOverlay } from './DropOverlay';
import { changelog } from '../lib/changelog';
import { loadMarkdownFromUrl } from '../lib/loadUrl';
import { isWebpageUrl } from '../lib/webpage';

interface InputViewProps {
  onSubmit: (markdown: string, baseUrl?: string, sourceUrl?: string) => void;
}

const buildDate = new Date(__BUILD_TIMESTAMP__).toLocaleDateString('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

export function InputView({ onSubmit }: InputViewProps) {
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [urlLoading, setUrlLoading] = useState<string | false>(false);
  const [urlError, setUrlError] = useState<string | null>(null);
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

  const handleUrlLoad = useCallback(async () => {
    const trimmed = url.trim();
    if (!trimmed) return;

    if (!isWebpageUrl(trimmed)) {
      setUrlError('Enter a valid URL (any webpage, or a GitHub file URL)');
      return;
    }

    const isGitHub = /^https?:\/\/github\.com\/.*\/blob\//.test(trimmed);
    setUrlLoading(isGitHub ? 'Loading\u2026' : 'Converting page\u2026');
    setUrlError(null);
    try {
      const { markdown, baseUrl } = await loadMarkdownFromUrl(trimmed);
      onSubmit(markdown, baseUrl, trimmed);
    } catch (err) {
      setUrlError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setUrlLoading(false);
    }
  }, [url, onSubmit]);

  const handleUrlKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleUrlLoad();
      }
    },
    [handleUrlLoad],
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

        {/* URL input */}
        <div className="mb-6">
          <div className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setUrlError(null); }}
              onKeyDown={handleUrlKeyDown}
              placeholder="https://example.com/article or GitHub file URL"
              className="flex-1 px-4 py-2.5 bg-cream-100 dark:bg-ink-800 border border-cream-300 dark:border-ink-600 rounded-lg font-mono text-sm text-ink-700 dark:text-ink-100 placeholder-ink-200 dark:placeholder-ink-500 focus:outline-none focus:border-sienna-400 dark:focus:border-sienna-500 focus:ring-1 focus:ring-sienna-400/30"
            />
            <button
              onClick={handleUrlLoad}
              disabled={!!urlLoading || !url.trim()}
              className="px-4 py-2.5 bg-ink-700 dark:bg-cream-100 text-cream-50 dark:text-ink-800 font-sans text-sm font-medium rounded-lg hover:bg-ink-800 dark:hover:bg-cream-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {urlLoading || 'Load'}
            </button>
          </div>
          {urlError && (
            <p className="mt-2 text-xs text-red-500 font-sans">{urlError}</p>
          )}
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 border-t border-cream-200 dark:border-ink-700" />
          <span className="text-xs font-sans text-ink-200 dark:text-ink-500">or paste markdown</span>
          <div className="flex-1 border-t border-cream-200 dark:border-ink-700" />
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
          Load a URL, paste markdown, or drop a .md file &mdash; then highlight to annotate
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

          {/* Author links */}
          <div className="mt-4 flex items-center justify-center gap-4">
            <a
              href="https://galsapir.github.io/sparse-thoughts/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink-200 dark:text-ink-500 hover:text-sienna-500 dark:hover:text-sienna-400 transition-colors"
              aria-label="Blog"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                <path d="m15 5 4 4" />
              </svg>
            </a>
            <a
              href="https://github.com/galsapir"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink-200 dark:text-ink-500 hover:text-sienna-500 dark:hover:text-sienna-400 transition-colors"
              aria-label="GitHub"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
              </svg>
            </a>
            <a
              href="https://bsky.app/profile/sapir.bsky.social"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink-200 dark:text-ink-500 hover:text-sienna-500 dark:hover:text-sienna-400 transition-colors"
              aria-label="Bluesky"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.596 6.449.77 2.819 3.524 3.745 6.088 3.485-4.37.44-5.21 2.578-2.93 4.872C6.31 21.252 9.37 22 11.112 22h1.776c1.742 0 4.802-.748 7.357-3.426 2.281-2.294 1.44-4.432-2.93-4.872 2.564.26 5.318-.666 6.088-3.485.218-.8.596-5.76.596-6.449 0-.688-.139-1.86-.902-2.203-.66-.3-1.664-.621-4.3 1.24C16.045 4.747 13.087 8.686 12 10.8Z" />
              </svg>
            </a>
            <a
              href="https://x.com/galsapir_"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink-200 dark:text-ink-500 hover:text-sienna-500 dark:hover:text-sienna-400 transition-colors"
              aria-label="X"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
