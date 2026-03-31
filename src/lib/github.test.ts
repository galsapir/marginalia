// ABOUTME: Tests for GitHub URL parsing, image resolution, and markdown fetching.
// ABOUTME: Covers parseGitHubUrl, resolveImageSrc, and fetchGitHubMarkdown.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseGitHubUrl, resolveImageSrc, fetchGitHubMarkdown } from './github';

describe('parseGitHubUrl', () => {
  it('parses a standard blob URL', () => {
    const result = parseGitHubUrl('https://github.com/owner/repo/blob/main/README.md');
    expect(result).toEqual({
      owner: 'owner',
      repo: 'repo',
      ref: 'main',
      path: 'README.md',
    });
  });

  it('parses a nested file path', () => {
    const result = parseGitHubUrl('https://github.com/owner/repo/blob/main/docs/guide/intro.md');
    expect(result).toEqual({
      owner: 'owner',
      repo: 'repo',
      ref: 'main',
      path: 'docs/guide/intro.md',
    });
  });

  it('parses a URL with a non-main branch', () => {
    const result = parseGitHubUrl('https://github.com/owner/repo/blob/develop/file.md');
    expect(result).toEqual({
      owner: 'owner',
      repo: 'repo',
      ref: 'develop',
      path: 'file.md',
    });
  });

  it('parses a URL with a commit SHA as ref', () => {
    const result = parseGitHubUrl('https://github.com/owner/repo/blob/abc123/file.md');
    expect(result).toEqual({
      owner: 'owner',
      repo: 'repo',
      ref: 'abc123',
      path: 'file.md',
    });
  });

  it('returns null for non-GitHub URLs', () => {
    expect(parseGitHubUrl('https://gitlab.com/owner/repo/blob/main/file.md')).toBeNull();
  });

  it('returns null for GitHub URLs without blob segment', () => {
    expect(parseGitHubUrl('https://github.com/owner/repo/tree/main/src')).toBeNull();
  });

  it('returns null for GitHub repo root URLs', () => {
    expect(parseGitHubUrl('https://github.com/owner/repo')).toBeNull();
  });

  it('returns null for invalid URLs', () => {
    expect(parseGitHubUrl('not-a-url')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseGitHubUrl('')).toBeNull();
  });

  it('handles URLs with trailing slash', () => {
    // blob URL with no file path — only 4 parts, no path segment
    const result = parseGitHubUrl('https://github.com/owner/repo/blob/main/');
    expect(result).toEqual({
      owner: 'owner',
      repo: 'repo',
      ref: 'main',
      path: '',
    });
  });
});

describe('resolveImageSrc', () => {
  const baseUrl = 'https://raw.githubusercontent.com/owner/repo/main/docs/';

  it('resolves a relative path against baseUrl', () => {
    expect(resolveImageSrc('images/fig1.png', baseUrl)).toBe(
      'https://raw.githubusercontent.com/owner/repo/main/docs/images/fig1.png',
    );
  });

  it('passes through absolute https URLs', () => {
    expect(resolveImageSrc('https://example.com/img.png', baseUrl)).toBe('https://example.com/img.png');
  });

  it('passes through absolute http URLs', () => {
    expect(resolveImageSrc('http://example.com/img.png', baseUrl)).toBe('http://example.com/img.png');
  });

  it('passes through protocol-relative URLs', () => {
    expect(resolveImageSrc('//cdn.example.com/img.png', baseUrl)).toBe('//cdn.example.com/img.png');
  });

  it('passes through data URIs', () => {
    const dataUri = 'data:image/png;base64,iVBORw0KGgo=';
    expect(resolveImageSrc(dataUri, baseUrl)).toBe(dataUri);
  });

  it('returns src unchanged when baseUrl is null', () => {
    expect(resolveImageSrc('images/fig1.png', null)).toBe('images/fig1.png');
  });

  it('returns empty string unchanged when src is empty', () => {
    expect(resolveImageSrc('', baseUrl)).toBe('');
  });

  it('resolves a bare filename', () => {
    expect(resolveImageSrc('chart.svg', baseUrl)).toBe(
      'https://raw.githubusercontent.com/owner/repo/main/docs/chart.svg',
    );
  });
});

describe('fetchGitHubMarkdown', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('fetches raw content and returns markdown with baseUrl', async () => {
    const mockResponse = { ok: true, text: () => Promise.resolve('# Hello') };
    vi.mocked(globalThis.fetch).mockResolvedValue(mockResponse as Response);

    const result = await fetchGitHubMarkdown('https://github.com/owner/repo/blob/main/docs/guide.md');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://raw.githubusercontent.com/owner/repo/main/docs/guide.md',
    );
    expect(result.markdown).toBe('# Hello');
    expect(result.baseUrl).toBe('https://raw.githubusercontent.com/owner/repo/main/docs/');
  });

  it('returns root baseUrl for a file at repo root', async () => {
    const mockResponse = { ok: true, text: () => Promise.resolve('# Root') };
    vi.mocked(globalThis.fetch).mockResolvedValue(mockResponse as Response);

    const result = await fetchGitHubMarkdown('https://github.com/owner/repo/blob/main/README.md');

    expect(result.baseUrl).toBe('https://raw.githubusercontent.com/owner/repo/main/');
  });

  it('throws on invalid GitHub URL', async () => {
    await expect(fetchGitHubMarkdown('https://example.com/file.md')).rejects.toThrow(
      'Not a valid GitHub file URL',
    );
  });

  it('throws on HTTP error response', async () => {
    const mockResponse = { ok: false, status: 404, statusText: 'Not Found' };
    vi.mocked(globalThis.fetch).mockResolvedValue(mockResponse as Response);

    await expect(
      fetchGitHubMarkdown('https://github.com/owner/repo/blob/main/missing.md'),
    ).rejects.toThrow('Failed to fetch: 404 Not Found');
  });
});
