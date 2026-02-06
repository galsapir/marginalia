// ABOUTME: Copy-to-clipboard and download buttons for the annotated export.
// ABOUTME: Generates the LLM-consumable format and provides both output methods.

import { useState, useCallback } from 'react';
import type { Annotation } from '../lib/types';
import { generateExport } from '../lib/export';

interface ExportControlsProps {
  markdown: string;
  annotations: Annotation[];
}

export function ExportControls({ markdown, annotations }: ExportControlsProps) {
  const [copied, setCopied] = useState(false);

  const getExportContent = useCallback(
    () => generateExport(markdown, annotations),
    [markdown, annotations],
  );

  const handleCopy = useCallback(async () => {
    const content = getExportContent();
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: open a modal with the text, but for now just try again
      const textarea = document.createElement('textarea');
      textarea.value = content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [getExportContent]);

  const handleDownload = useCallback(() => {
    const content = getExportContent();
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'annotated-document.md';
    a.click();
    URL.revokeObjectURL(url);
  }, [getExportContent]);

  const hasAnnotations = annotations.length > 0;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleCopy}
        disabled={!hasAnnotations}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans font-medium rounded-lg border border-cream-300 dark:border-ink-600 text-ink-500 dark:text-ink-300 hover:bg-cream-200 dark:hover:bg-ink-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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
          </>
        )}
      </button>

      <button
        onClick={handleDownload}
        disabled={!hasAnnotations}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans font-medium rounded-lg border border-cream-300 dark:border-ink-600 text-ink-500 dark:text-ink-300 hover:bg-cream-200 dark:hover:bg-ink-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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
