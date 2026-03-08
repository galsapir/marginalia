// ABOUTME: Custom hook for handling drag-and-drop of markdown files.
// ABOUTME: Provides drag state and handlers for use on any drop target.

import { useState, useCallback } from 'react';
import { isMarkdownFile, readFileAsText } from '../lib/file';

interface UseFileDropOptions {
  onFileLoad: (content: string) => void;
  onError?: (message: string) => void;
}

export function useFileDrop({ onFileLoad, onError }: UseFileDropOptions) {
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
      if (!isMarkdownFile(file)) {
        onError?.('Please drop a markdown (.md) or text (.txt) file');
        return;
      }

      try {
        const content = await readFileAsText(file);
        if (content.trim()) {
          onFileLoad(content);
        }
      } catch {
        onError?.('Could not read file');
      }
    },
    [onFileLoad, onError],
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
