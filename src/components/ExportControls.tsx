// ABOUTME: Copy-to-clipboard and download controls with multiple export format options.
// ABOUTME: Dropdown menu lets users choose: annotated markdown, notes only, or raw markdown.

import { useState, useCallback, useRef, useEffect } from 'react';
import type { Annotation } from '../lib/types';
import { generateExport, type ExportMode } from '../lib/export';

interface ExportControlsProps {
  markdown: string;
  annotations: Annotation[];
}

const COPY_MODES: { mode: ExportMode; label: string; description: string }[] = [
  { mode: 'annotated', label: 'Annotated', description: 'Markdown with inline notes' },
  { mode: 'notes', label: 'Notes only', description: 'Just quotes + your notes' },
  { mode: 'raw', label: 'Raw markdown', description: 'Original without annotations' },
];

export function ExportControls({ markdown, annotations }: ExportControlsProps) {
  const [copied, setCopied] = useState<ExportMode | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  // Close menu on Escape
  useEffect(() => {
    if (!menuOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [menuOpen]);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  }, []);

  const handleCopy = useCallback(
    async (mode: ExportMode) => {
      const content = generateExport(markdown, annotations, mode);
      await copyToClipboard(content);
      setCopied(mode);
      setMenuOpen(false);
      setTimeout(() => setCopied(null), 2000);
    },
    [markdown, annotations, copyToClipboard],
  );

  const handleDownload = useCallback(() => {
    const content = generateExport(markdown, annotations, 'annotated');
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'annotated-document.md';
    a.click();
    URL.revokeObjectURL(url);
  }, [markdown, annotations]);

  const hasAnnotations = annotations.length > 0;

  const btnClass =
    'flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans font-medium rounded-lg border border-cream-300 dark:border-ink-600 text-ink-500 dark:text-ink-300 hover:bg-cream-200 dark:hover:bg-ink-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed';

  return (
    <div className="flex items-center gap-2">
      {/* Copy dropdown */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((o) => !o)}
          disabled={!hasAnnotations}
          className={btnClass}
        >
          {copied ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Copied
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Copy
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-0.5 opacity-50">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </>
          )}
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-1.5 w-56 rounded-lg border border-cream-300 dark:border-ink-600 bg-cream-50 dark:bg-ink-800 shadow-lg z-50 py-1 font-sans">
            {COPY_MODES.map(({ mode, label, description }) => (
              <button
                key={mode}
                onClick={() => handleCopy(mode)}
                className="w-full text-left px-3 py-2 hover:bg-cream-200 dark:hover:bg-ink-700 transition-colors"
              >
                <div className="text-xs font-medium text-ink-700 dark:text-cream-100">
                  {label}
                </div>
                <div className="text-[10px] text-ink-400 dark:text-ink-300 mt-0.5">
                  {description}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={handleDownload}
        disabled={!hasAnnotations}
        className={btnClass}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Download
      </button>
    </div>
  );
}
