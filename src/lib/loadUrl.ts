// ABOUTME: Routes a URL to the appropriate markdown fetcher (GitHub file or webpage).
// ABOUTME: Single entry point for both App.tsx auto-load and InputView manual load.

import { fetchGitHubMarkdown, parseGitHubUrl } from './github';
import { fetchWebpageMarkdown, isWebpageUrl } from './webpage';

export async function loadMarkdownFromUrl(url: string): Promise<{ markdown: string; baseUrl?: string }> {
  if (parseGitHubUrl(url)) {
    return fetchGitHubMarkdown(url);
  }
  if (isWebpageUrl(url)) {
    return fetchWebpageMarkdown(url);
  }
  throw new Error('Enter a valid URL (any webpage, or a GitHub file URL)');
}
