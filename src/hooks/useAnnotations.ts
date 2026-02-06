// ABOUTME: State management hook for annotations.
// ABOUTME: Provides CRUD operations for annotations and tracks the active/focused annotation.

import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Annotation } from '../lib/types';

export function useAnnotations() {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);

  const addAnnotation = useCallback(
    (selectedText: string, note: string, startOffset: number, endOffset: number) => {
      const annotation: Annotation = {
        id: uuidv4(),
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

  /**
   * Shifts annotation offsets after an inline edit changes the markdown source.
   * Annotations fully inside the edited range are removed.
   * Annotations after the edit are shifted by the length delta.
   */
  const shiftAnnotations = useCallback(
    (editStart: number, editEnd: number, newLength: number) => {
      const delta = newLength - (editEnd - editStart);
      setAnnotations((prev) =>
        prev
          .filter((a) => {
            // Remove annotations fully inside the edited range
            if (a.markdownStartOffset >= editStart && a.markdownEndOffset <= editEnd) {
              return false;
            }
            return true;
          })
          .map((a) => {
            // Annotations entirely before the edit: unchanged
            if (a.markdownEndOffset <= editStart) return a;

            // Annotations entirely after the edit: shift by delta
            if (a.markdownStartOffset >= editEnd) {
              return {
                ...a,
                markdownStartOffset: a.markdownStartOffset + delta,
                markdownEndOffset: a.markdownEndOffset + delta,
              };
            }

            // Annotations that partially overlap the edit: remove them
            // (too ambiguous to keep)
            return null;
          })
          .filter((a): a is Annotation => a !== null),
      );
    },
    [],
  );

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
    shiftAnnotations,
  };
}
