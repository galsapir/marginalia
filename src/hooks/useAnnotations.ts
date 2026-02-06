// ABOUTME: State management hook for annotations.
// ABOUTME: Provides CRUD operations for annotations and tracks the active/focused annotation.

import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Annotation } from '../lib/types';

export function useAnnotations() {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);

  const addAnnotation = useCallback(
    (selectedText: string, note: string, startOffset: number, endOffset: number, kind: 'range' | 'point' = 'range') => {
      const annotation: Annotation = {
        id: uuidv4(),
        kind,
        selectedText,
        note,
        markdownStartOffset: startOffset,
        markdownEndOffset: endOffset,
        createdAt: Date.now(),
      };
      setAnnotations((prev) => [...prev, annotation]);
      return annotation.id;
    },
    [],
  );

  const updateAnnotation = useCallback((id: string, note: string) => {
    setAnnotations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, note } : a)),
    );
  }, []);

  const deleteAnnotation = useCallback((id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
    setActiveAnnotationId((prev) => (prev === id ? null : prev));
  }, []);

  // Sorted by position in document
  const sortedAnnotations = [...annotations].sort(
    (a, b) => a.markdownStartOffset - b.markdownStartOffset,
  );

  return {
    annotations: sortedAnnotations,
    activeAnnotationId,
    setActiveAnnotationId,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
  };
}
