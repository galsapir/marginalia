// ABOUTME: Tests for annotation export logic.
// ABOUTME: Covers annotated, notes-only, and raw export modes.

import { describe, it, expect } from 'vitest';
import type { Annotation } from './types';
import {
  generateAnnotatedExport,
  generateNotesExport,
  generateExport,
} from './export';

function makeAnnotation(overrides: Partial<Annotation> & Pick<Annotation, 'selectedText' | 'note' | 'markdownStartOffset' | 'markdownEndOffset'>): Annotation {
  return {
    id: 'test-id',
    createdAt: Date.now(),
    ...overrides,
  };
}

const sampleMarkdown = 'Hello world, this is a test document.';

describe('generateAnnotatedExport', () => {
  it('returns markdown unchanged when no annotations', () => {
    expect(generateAnnotatedExport(sampleMarkdown, [])).toBe(sampleMarkdown);
  });

  it('inserts a single annotation after the highlighted text', () => {
    const ann = makeAnnotation({
      selectedText: 'world',
      note: 'greeting target',
      markdownStartOffset: 6,
      markdownEndOffset: 11,
    });
    const result = generateAnnotatedExport(sampleMarkdown, [ann]);
    expect(result).toBe('Hello world {greeting target}, this is a test document.');
  });

  it('inserts multiple annotations at correct positions', () => {
    const anns = [
      makeAnnotation({
        id: '1',
        selectedText: 'Hello',
        note: 'salutation',
        markdownStartOffset: 0,
        markdownEndOffset: 5,
      }),
      makeAnnotation({
        id: '2',
        selectedText: 'test',
        note: 'important',
        markdownStartOffset: 23,
        markdownEndOffset: 27,
      }),
    ];
    const result = generateAnnotatedExport(sampleMarkdown, anns);
    expect(result).toBe('Hello {salutation} world, this is a test {important} document.');
  });

  it('handles annotations in any input order (sorts descending)', () => {
    const anns = [
      makeAnnotation({
        id: '2',
        selectedText: 'test',
        note: 'second',
        markdownStartOffset: 23,
        markdownEndOffset: 27,
      }),
      makeAnnotation({
        id: '1',
        selectedText: 'Hello',
        note: 'first',
        markdownStartOffset: 0,
        markdownEndOffset: 5,
      }),
    ];
    const result = generateAnnotatedExport(sampleMarkdown, anns);
    expect(result).toBe('Hello {first} world, this is a test {second} document.');
  });
});

describe('generateNotesExport', () => {
  it('returns empty string when no annotations', () => {
    expect(generateNotesExport([])).toBe('');
  });

  it('formats a single annotation as blockquote + note', () => {
    const ann = makeAnnotation({
      selectedText: 'Hello world',
      note: 'A greeting',
      markdownStartOffset: 0,
      markdownEndOffset: 11,
    });
    expect(generateNotesExport([ann])).toBe('> Hello world\n\nA greeting');
  });

  it('formats multiple annotations sorted by offset with separators', () => {
    const anns = [
      makeAnnotation({
        id: '2',
        selectedText: 'test',
        note: 'Note B',
        markdownStartOffset: 23,
        markdownEndOffset: 27,
      }),
      makeAnnotation({
        id: '1',
        selectedText: 'Hello',
        note: 'Note A',
        markdownStartOffset: 0,
        markdownEndOffset: 5,
      }),
    ];
    const result = generateNotesExport(anns);
    expect(result).toBe('> Hello\n\nNote A\n\n---\n\n> test\n\nNote B');
  });
});

describe('generateExport', () => {
  const ann = makeAnnotation({
    selectedText: 'world',
    note: 'target',
    markdownStartOffset: 6,
    markdownEndOffset: 11,
  });

  it('defaults to annotated mode', () => {
    const result = generateExport(sampleMarkdown, [ann]);
    expect(result).toBe(generateAnnotatedExport(sampleMarkdown, [ann]));
  });

  it('dispatches to annotated mode', () => {
    const result = generateExport(sampleMarkdown, [ann], 'annotated');
    expect(result).toBe(generateAnnotatedExport(sampleMarkdown, [ann]));
  });

  it('dispatches to notes mode', () => {
    const result = generateExport(sampleMarkdown, [ann], 'notes');
    expect(result).toBe(generateNotesExport([ann]));
  });

  it('dispatches to raw mode', () => {
    const result = generateExport(sampleMarkdown, [ann], 'raw');
    expect(result).toBe(sampleMarkdown);
  });
});
