// ABOUTME: Fetches webpage content as markdown via a Jina Reader proxy.
// ABOUTME: Requires a CORS proxy worker deployed separately — see docs/worker-spec.md.

/**
 * Default proxy URL. Replace with your own Cloudflare Worker URL.
 * The worker should accept a `url` query param and proxy it through r.jina.ai.
 */
const DEFAULT_PROXY_URL = 'https://marginalia-reader.galsapir.workers.dev';

/**
 * Returns true if the string is a valid HTTP(S) URL.
 * Does not distinguish GitHub from non-GitHub — the caller handles routing.
 */
export function isWebpageUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Fetches a webpage's content as markdown via the Jina Reader proxy worker.
 * The proxy prepends r.jina.ai/ to the target URL and adds CORS headers.
 */
export async function fetchWebpageMarkdown(
  url: string,
  proxyBaseUrl: string = DEFAULT_PROXY_URL,
): Promise<{ markdown: string }> {
  const proxyUrl = `${proxyBaseUrl}?url=${encodeURIComponent(url)}`;

  let response: Response;
  try {
    response = await fetch(proxyUrl);
  } catch {
    throw new Error('Could not reach the conversion service \u2014 check your connection');
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(body || 'Could not load this page');
  }

  const markdown = await response.text();

  if (!/\S/.test(markdown)) {
    throw new Error('No readable content found on this page');
  }

  return { markdown };
}
