// ABOUTME: Tests for the rehype annotation marks plugin.
// ABOUTME: Verifies AST-based <mark> injection for annotation highlights.

import { describe, it, expect } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { createRehypeAnnotationMarks } from './rehypeAnnotationMarks';
import type { Annotation } from './types';

function makeAnnotation(
  overrides: Partial<Annotation> & Pick<Annotation, 'selectedText' | 'note' | 'markdownStartOffset' | 'markdownEndOffset'>,
): Annotation {
  return {
    id: 'test-id',
    createdAt: Date.now(),
    ...overrides,
  };
}

/**
 * Runs markdown through the full remark → rehype pipeline with the annotation
 * marks plugin, returning the rendered HTML string.
 */
async function processMarkdown(
  markdown: string,
  annotations: Annotation[],
  activeId: string | null = null,
): Promise<string> {
  const result = await unified()
    .use(remarkParse)
    .use(remarkRehype)
    .use(createRehypeAnnotationMarks(annotations, activeId))
    .use(rehypeStringify)
    .process(markdown);
  return String(result);
}

describe('createRehypeAnnotationMarks', () => {
  it('passes through unchanged when no annotations', async () => {
    const html = await processMarkdown('Hello world', []);
    expect(html).toBe('<p>Hello world</p>');
  });

  it('wraps a single word with a mark element', async () => {
    const ann = makeAnnotation({
      selectedText: 'world',
      note: 'note',
      markdownStartOffset: 6,
      markdownEndOffset: 11,
    });
    const html = await processMarkdown('Hello world', [ann]);
    expect(html).toBe('<p>Hello <mark data-annotation-id="test-id">world</mark></p>');
  });

  it('wraps text at the start of a paragraph', async () => {
    const ann = makeAnnotation({
      selectedText: 'Hello',
      note: 'note',
      markdownStartOffset: 0,
      markdownEndOffset: 5,
    });
    const html = await processMarkdown('Hello world', [ann]);
    expect(html).toBe('<p><mark data-annotation-id="test-id">Hello</mark> world</p>');
  });

  it('wraps text at the end of a paragraph', async () => {
    const ann = makeAnnotation({
      selectedText: 'world',
      note: 'note',
      markdownStartOffset: 6,
      markdownEndOffset: 11,
    });
    const html = await processMarkdown('Hello world', [ann]);
    expect(html).toBe('<p>Hello <mark data-annotation-id="test-id">world</mark></p>');
  });

  it('wraps an entire paragraph', async () => {
    const ann = makeAnnotation({
      selectedText: 'Hello world',
      note: 'note',
      markdownStartOffset: 0,
      markdownEndOffset: 11,
    });
    const html = await processMarkdown('Hello world', [ann]);
    expect(html).toBe('<p><mark data-annotation-id="test-id">Hello world</mark></p>');
  });

  it('wraps a substring in the middle of text', async () => {
    const ann = makeAnnotation({
      selectedText: 'is a',
      note: 'note',
      markdownStartOffset: 5,
      markdownEndOffset: 9,
    });
    const html = await processMarkdown('This is a test', [ann]);
    expect(html).toBe('<p>This <mark data-annotation-id="test-id">is a</mark> test</p>');
  });

  it('handles multiple non-overlapping annotations', async () => {
    const anns = [
      makeAnnotation({
        id: 'a1',
        selectedText: 'Hello',
        note: 'first',
        markdownStartOffset: 0,
        markdownEndOffset: 5,
      }),
      makeAnnotation({
        id: 'a2',
        selectedText: 'world',
        note: 'second',
        markdownStartOffset: 6,
        markdownEndOffset: 11,
      }),
    ];
    const html = await processMarkdown('Hello world', anns);
    expect(html).toBe(
      '<p><mark data-annotation-id="a1">Hello</mark> <mark data-annotation-id="a2">world</mark></p>',
    );
  });

  it('adds active class to the active annotation', async () => {
    const ann = makeAnnotation({
      id: 'active-ann',
      selectedText: 'world',
      note: 'note',
      markdownStartOffset: 6,
      markdownEndOffset: 11,
    });
    const html = await processMarkdown('Hello world', [ann], 'active-ann');
    expect(html).toBe(
      '<p>Hello <mark data-annotation-id="active-ann" class="active">world</mark></p>',
    );
  });

  it('only adds active class to the matching annotation', async () => {
    const anns = [
      makeAnnotation({
        id: 'a1',
        selectedText: 'Hello',
        note: 'first',
        markdownStartOffset: 0,
        markdownEndOffset: 5,
      }),
      makeAnnotation({
        id: 'a2',
        selectedText: 'world',
        note: 'second',
        markdownStartOffset: 6,
        markdownEndOffset: 11,
      }),
    ];
    const html = await processMarkdown('Hello world', anns, 'a2');
    expect(html).toBe(
      '<p><mark data-annotation-id="a1">Hello</mark> <mark data-annotation-id="a2" class="active">world</mark></p>',
    );
  });

  it('handles annotations spanning across multiple paragraphs (partial wrap per paragraph)', async () => {
    // "First\n\nSecond" — annotation covers "First" only
    const ann = makeAnnotation({
      selectedText: 'First',
      note: 'note',
      markdownStartOffset: 0,
      markdownEndOffset: 5,
    });
    const html = await processMarkdown('First\n\nSecond', [ann]);
    expect(html).toContain('<mark data-annotation-id="test-id">First</mark>');
    expect(html).toContain('Second');
    expect(html).not.toContain('<mark data-annotation-id="test-id">Second</mark>');
  });

  it('handles annotation in a heading', async () => {
    const ann = makeAnnotation({
      selectedText: 'Title',
      note: 'note',
      // "# Title" — "Title" starts at offset 2
      markdownStartOffset: 2,
      markdownEndOffset: 7,
    });
    const html = await processMarkdown('# Title', [ann]);
    expect(html).toBe('<h1><mark data-annotation-id="test-id">Title</mark></h1>');
  });

  it('handles annotation in a list item', async () => {
    const ann = makeAnnotation({
      selectedText: 'item',
      note: 'note',
      // "- First item" — "item" starts at offset 8
      markdownStartOffset: 8,
      markdownEndOffset: 12,
    });
    const html = await processMarkdown('- First item', [ann]);
    expect(html).toContain('<mark data-annotation-id="test-id">item</mark>');
  });

  it('handles annotation in bold text', async () => {
    // "Hello **bold** world" — "bold" content starts at offset 8 (after "Hello **")
    const ann = makeAnnotation({
      selectedText: 'bold',
      note: 'note',
      markdownStartOffset: 8,
      markdownEndOffset: 12,
    });
    const html = await processMarkdown('Hello **bold** world', [ann]);
    expect(html).toContain('<mark data-annotation-id="test-id">bold</mark>');
  });

  it('processes annotations in any input order', async () => {
    // Provide annotations in reverse document order — plugin should still work
    const anns = [
      makeAnnotation({
        id: 'a2',
        selectedText: 'world',
        note: 'second',
        markdownStartOffset: 6,
        markdownEndOffset: 11,
      }),
      makeAnnotation({
        id: 'a1',
        selectedText: 'Hello',
        note: 'first',
        markdownStartOffset: 0,
        markdownEndOffset: 5,
      }),
    ];
    const html = await processMarkdown('Hello world', anns);
    expect(html).toBe(
      '<p><mark data-annotation-id="a1">Hello</mark> <mark data-annotation-id="a2">world</mark></p>',
    );
  });
});
