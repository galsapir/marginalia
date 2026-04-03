// ABOUTME: Tests for webpage URL detection and markdown fetching via Jina Reader proxy.
// ABOUTME: Covers isWebpageUrl classification and fetchWebpageMarkdown proxy behaviour.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isWebpageUrl, fetchWebpageMarkdown } from './webpage';

describe('isWebpageUrl', () => {
  it('accepts a standard https URL', () => {
    expect(isWebpageUrl('https://example.com/article')).toBe(true);
  });

  it('accepts an http URL', () => {
    expect(isWebpageUrl('http://blog.example.com/post')).toBe(true);
  });

  it('accepts a URL with query params', () => {
    expect(isWebpageUrl('https://example.com/page?id=42&lang=en')).toBe(true);
  });

  it('accepts a URL with a fragment', () => {
    expect(isWebpageUrl('https://example.com/docs#section-2')).toBe(true);
  });

  it('accepts a GitHub blob URL (routing handled by caller)', () => {
    expect(isWebpageUrl('https://github.com/owner/repo/blob/main/README.md')).toBe(true);
  });

  it('accepts a GitHub repo URL', () => {
    expect(isWebpageUrl('https://github.com/owner/repo')).toBe(true);
  });

  it('rejects non-http protocols', () => {
    expect(isWebpageUrl('ftp://files.example.com/doc.md')).toBe(false);
  });

  it('rejects an invalid URL', () => {
    expect(isWebpageUrl('not-a-url')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isWebpageUrl('')).toBe(false);
  });

  it('rejects a bare domain without protocol', () => {
    expect(isWebpageUrl('example.com')).toBe(false);
  });
});

describe('fetchWebpageMarkdown', () => {
  const originalFetch = globalThis.fetch;
  const proxyBase = 'https://my-worker.workers.dev';

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('calls the proxy with the encoded target URL', async () => {
    const mockResponse = { ok: true, text: () => Promise.resolve('# Hello World') };
    vi.mocked(globalThis.fetch).mockResolvedValue(mockResponse as Response);

    const result = await fetchWebpageMarkdown('https://example.com/page', proxyBase);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://my-worker.workers.dev?url=https%3A%2F%2Fexample.com%2Fpage',
    );
    expect(result.markdown).toBe('# Hello World');
  });

  it('encodes special characters in the URL', async () => {
    const mockResponse = { ok: true, text: () => Promise.resolve('content') };
    vi.mocked(globalThis.fetch).mockResolvedValue(mockResponse as Response);

    await fetchWebpageMarkdown('https://example.com/search?q=hello world&lang=en', proxyBase);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://my-worker.workers.dev?url=https%3A%2F%2Fexample.com%2Fsearch%3Fq%3Dhello%20world%26lang%3Den',
    );
  });

  it('uses error body from proxy as message', async () => {
    const mockResponse = {
      ok: false,
      status: 502,
      text: () => Promise.resolve('Too many requests \u2014 try again in a moment'),
    };
    vi.mocked(globalThis.fetch).mockResolvedValue(mockResponse as Response);

    await expect(
      fetchWebpageMarkdown('https://example.com', proxyBase),
    ).rejects.toThrow('Too many requests');
  });

  it('falls back to generic message when error body is empty', async () => {
    const mockResponse = {
      ok: false,
      status: 502,
      text: () => Promise.resolve(''),
    };
    vi.mocked(globalThis.fetch).mockResolvedValue(mockResponse as Response);

    await expect(
      fetchWebpageMarkdown('https://example.com', proxyBase),
    ).rejects.toThrow('Could not load this page');
  });

  it('throws friendly message on network failure', async () => {
    vi.mocked(globalThis.fetch).mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(
      fetchWebpageMarkdown('https://example.com', proxyBase),
    ).rejects.toThrow('Could not reach the conversion service');
  });

  it('throws when response body is empty', async () => {
    const mockResponse = { ok: true, text: () => Promise.resolve('   ') };
    vi.mocked(globalThis.fetch).mockResolvedValue(mockResponse as Response);

    await expect(
      fetchWebpageMarkdown('https://example.com', proxyBase),
    ).rejects.toThrow('No readable content found on this page');
  });

  it('uses default proxy URL when none is provided', async () => {
    const mockResponse = { ok: true, text: () => Promise.resolve('# Content') };
    vi.mocked(globalThis.fetch).mockResolvedValue(mockResponse as Response);

    await fetchWebpageMarkdown('https://example.com');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('marginalia-reader.galsapir.workers.dev'),
    );
  });
});
