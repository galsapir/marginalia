// ABOUTME: Core data types for annotations and application state.
// ABOUTME: Defines the Annotation model and AppState shape.

export interface Annotation {
  id: string;
  selectedText: string;
  note: string;
  markdownStartOffset: number;
  markdownEndOffset: number;
  createdAt: number;
}

export type ViewMode = 'rendered' | 'raw';
export type Theme = 'light' | 'dark';
