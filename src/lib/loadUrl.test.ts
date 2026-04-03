// ABOUTME: Tests for the unified URL-to-markdown routing function.
// ABOUTME: Verifies GitHub URLs route to github.ts, webpage URLs route to webpage.ts.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadMarkdownFromUrl } from './loadUrl';

describe('loadMarkdownFromUrl', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('routes GitHub blob URLs through the GitHub fetcher', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('# From GitHub'),
    } as Response);

    const result = await loadMarkdownFromUrl(
      'https://github.com/owner/repo/blob/main/README.md',
    );

    expect(result.markdown).toBe('# From GitHub');
    expect(result.baseUrl).toBeDefined();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('raw.githubusercontent.com'),
    );
  });

  it('routes non-GitHub HTTP URLs through the webpage fetcher', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('# From Webpage'),
    } as Response);

    const result = await loadMarkdownFromUrl('https://example.com/article');

    expect(result.markdown).toBe('# From Webpage');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('marginalia-reader.galsapir.workers.dev'),
    );
  });

  it('prefers GitHub route for GitHub blob URLs over webpage route', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('# Content'),
    } as Response);

    await loadMarkdownFromUrl('https://github.com/owner/repo/blob/main/file.md');

    // Should go to raw.githubusercontent.com, NOT to the webpage proxy
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('raw.githubusercontent.com'),
    );
  });

  it('throws for non-HTTP URLs', async () => {
    await expect(loadMarkdownFromUrl('ftp://example.com/file')).rejects.toThrow(
      'Enter a valid URL',
    );
  });

  it('throws for invalid strings', async () => {
    await expect(loadMarkdownFromUrl('not-a-url')).rejects.toThrow(
      'Enter a valid URL',
    );
  });
});
