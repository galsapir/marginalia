// ABOUTME: Utilities for fetching markdown content from GitHub repository URLs.
// ABOUTME: Parses blob URLs and resolves relative image paths to raw.githubusercontent.com.

interface GitHubParsed {
  owner: string;
  repo: string;
  ref: string;
  path: string;
}

/**
 * Parses a GitHub blob URL into its components.
 * Accepts: https://github.com/{owner}/{repo}/blob/{ref}/{path}
 */
export function parseGitHubUrl(url: string): GitHubParsed | null {
  try {
    const u = new URL(url);
    if (u.hostname !== 'github.com') return null;

    // /owner/repo/blob/ref/path...
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts.length < 4 || parts[2] !== 'blob') return null;

    return {
      owner: parts[0],
      repo: parts[1],
      ref: parts[3],
      path: parts.slice(4).join('/'),
    };
  } catch {
    return null;
  }
}

/**
 * Returns the raw.githubusercontent.com URL for a parsed GitHub file.
 */
function getRawUrl(parsed: GitHubParsed): string {
  return `https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/${parsed.ref}/${parsed.path}`;
}

/**
 * Returns the base URL for resolving relative paths (directory of the file).
 */
function getBaseUrl(parsed: GitHubParsed): string {
  const pathParts = parsed.path.split('/');
  const dir = pathParts.slice(0, -1).join('/');
  const dirSegment = dir ? `${dir}/` : '';
  return `https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/${parsed.ref}/${dirSegment}`;
}

/**
 * Fetches markdown content from a GitHub blob URL.
 * Returns the markdown text and a base URL for resolving relative image paths.
 */
export async function fetchGitHubMarkdown(url: string): Promise<{ markdown: string; baseUrl: string }> {
  const parsed = parseGitHubUrl(url);
  if (!parsed) {
    throw new Error('Not a valid GitHub file URL. Expected: https://github.com/{owner}/{repo}/blob/{branch}/{path}');
  }

  const rawUrl = getRawUrl(parsed);
  const response = await fetch(rawUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
  }

  const markdown = await response.text();
  return { markdown, baseUrl: getBaseUrl(parsed) };
}

/**
 * Resolves an image src against a base URL.
 * Absolute URLs and data URIs pass through unchanged.
 */
export function resolveImageSrc(src: string, baseUrl: string | null): string {
  if (!baseUrl || !src) return src;
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('//') || src.startsWith('data:')) {
    return src;
  }
  return baseUrl + src;
}
