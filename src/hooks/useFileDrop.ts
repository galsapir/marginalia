// ABOUTME: Custom hook for handling drag-and-drop of markdown and PDF files.
// ABOUTME: Provides drag state and handlers for use on any drop target.

import { useState, useCallback } from 'react';
import { getFileType, readFileAsText } from '../lib/file';
import type { ConversionProgress } from '../lib/pdfConverter';

interface UseFileDropOptions {
  onFileLoad: (content: string) => void;
  onError?: (message: string) => void;
  onPdfConversionStart?: () => void;
  onPdfConversionProgress?: (progress: ConversionProgress) => void;
  onPdfConversionEnd?: () => void;
}

export function useFileDrop({
  onFileLoad,
  onError,
  onPdfConversionStart,
  onPdfConversionProgress,
  onPdfConversionEnd,
}: UseFileDropOptions) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
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
      const fileType = getFileType(file);

      if (fileType === 'unsupported') {
        onError?.('Unsupported file type. Drop a .md, .txt, or .pdf file.');
        return;
      }

      try {
        if (fileType === 'pdf') {
          onPdfConversionStart?.();
          try {
            const { pdfToMarkdown } = await import('../lib/pdfConverter');
            const markdown = await pdfToMarkdown(file, onPdfConversionProgress);
            if (markdown.trim()) {
              onFileLoad(markdown);
            } else {
              onError?.(
                'No text could be extracted from this PDF. It may be image-based.',
              );
            }
          } finally {
            onPdfConversionEnd?.();
          }
        } else {
          const content = await readFileAsText(file);
          if (content.trim()) {
            onFileLoad(content);
          }
        }
      } catch {
        onError?.('Could not read file');
      }
    },
    [
      onFileLoad,
      onError,
      onPdfConversionStart,
      onPdfConversionProgress,
      onPdfConversionEnd,
    ],
  );

  return {
    isDragging,
    dragHandlers: {
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    },
  };
}
