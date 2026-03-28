// ABOUTME: PDF file upload button with conversion progress indicator.
// ABOUTME: Handles the upload → convert → optional LLM structure flow.

import { useState, useCallback, useRef } from 'react';
import type { ConversionProgress } from '../lib/pdfConverter';
import { hasAnyApiKey } from '../lib/apiKey';

interface PdfUploadProps {
  onConverted: (markdown: string) => void;
  onError?: (message: string) => void;
}

type ConversionState =
  | { phase: 'idle' }
  | { phase: 'extracting'; progress: ConversionProgress }
  | { phase: 'structuring' }
  | { phase: 'done' };

export function PdfUpload({ onConverted, onError }: PdfUploadProps) {
  const [state, setState] = useState<ConversionState>({ phase: 'idle' });
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      const useAI = hasAnyApiKey();

      try {
        setState({
          phase: 'extracting',
          progress: { current: 0, total: 0 },
        });

        // Lazy-load PDF converter and LLM module
        const { pdfToMarkdown, pdfToRawText } = await import('../lib/pdfConverter');

        if (useAI) {
          // Extract raw text, then send to LLM for structuring
          const rawText = await pdfToRawText(file, (progress) => {
            setState({ phase: 'extracting', progress });
          });

          if (!rawText.trim()) {
            onError?.(
              'No text could be extracted from this PDF. It may be image-based.',
            );
            setState({ phase: 'idle' });
            return;
          }

          setState({ phase: 'structuring' });
          const { structureWithLLM } = await import('../lib/llmStructure');
          const structured = await structureWithLLM(rawText);
          setState({ phase: 'done' });
          onConverted(structured);
        } else {
          // Mechanical extraction with font-size heuristics
          const markdown = await pdfToMarkdown(file, (progress) => {
            setState({ phase: 'extracting', progress });
          });

          if (!markdown.trim()) {
            onError?.(
              'No text could be extracted from this PDF. It may be image-based.',
            );
            setState({ phase: 'idle' });
            return;
          }

          setState({ phase: 'done' });
          onConverted(markdown);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'PDF conversion failed';
        onError?.(message);
        setState({ phase: 'idle' });
      }
    },
    [onConverted, onError],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      // Reset input so the same file can be re-selected
      if (inputRef.current) inputRef.current.value = '';
    },
    [handleFile],
  );

  const isProcessing = state.phase !== 'idle' && state.phase !== 'done';

  return (
    <div className="flex flex-col items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        onChange={handleChange}
        className="hidden"
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={isProcessing}
        className="flex items-center gap-2 px-4 py-2 text-sm font-sans font-medium border border-cream-300 dark:border-ink-600 rounded-lg text-ink-500 dark:text-ink-200 hover:border-sienna-400 dark:hover:border-sienna-500 hover:text-sienna-600 dark:hover:text-sienna-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="12" y1="18" x2="12" y2="12" />
          <line x1="9" y1="15" x2="12" y2="12" />
          <line x1="15" y1="15" x2="12" y2="12" />
        </svg>
        Upload PDF
      </button>

      {state.phase === 'extracting' && state.progress.total > 0 && (
        <p className="text-xs font-sans text-ink-300 dark:text-ink-400 animate-pulse">
          Extracting text... page {state.progress.current} of{' '}
          {state.progress.total}
        </p>
      )}
      {state.phase === 'extracting' && state.progress.total === 0 && (
        <p className="text-xs font-sans text-ink-300 dark:text-ink-400 animate-pulse">
          Loading PDF...
        </p>
      )}
      {state.phase === 'structuring' && (
        <p className="text-xs font-sans text-sienna-500 dark:text-sienna-400 animate-pulse">
          AI is structuring markdown...
        </p>
      )}
    </div>
  );
}
