// ABOUTME: Custom hook for handling drag-and-drop of markdown files.
// ABOUTME: Provides drag state and handlers for use on any drop target.

import { useState, useCallback } from 'react';

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

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

interface UseFileDropOptions {
  onFileLoad: (content: string) => void;
}

export function useFileDrop({ onFileLoad }: UseFileDropOptions) {
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
      if (!isMarkdownFile(file)) return;

      try {
        const content = await readFileAsText(file);
        if (content.trim()) {
          onFileLoad(content);
        }
      } catch {
        // silently fail — InputView has its own error handling
      }
    },
    [onFileLoad],
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
