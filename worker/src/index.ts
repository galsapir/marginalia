// ABOUTME: Cloudflare Worker that proxies webpage URLs through Jina Reader for markdown conversion.
// ABOUTME: Adds CORS headers, validates URLs, and enforces security constraints.

const MAX_RESPONSE_BYTES = 5 * 1024 * 1024; // 5 MB

const ALLOWED_ORIGINS = [
  'https://galsapir.github.io',
  'http://localhost:5173',
  'http://localhost:4173',
];

const PRIVATE_HOSTNAME_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^\[::1\]$/,
];

interface Env {
  JINA_API_KEY?: string;
}

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return true; // Allow no-origin requests (curl, direct)
  return ALLOWED_ORIGINS.some((allowed) => origin === allowed);
}

function corsHeaders(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function isPrivateHostname(hostname: string): boolean {
  return PRIVATE_HOSTNAME_PATTERNS.some((pattern) => pattern.test(hostname));
}

function errorResponse(status: number, message: string, origin: string | null): Response {
  return new Response(message, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', ...corsHeaders(origin) },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin');

    if (!isAllowedOrigin(origin)) {
      return new Response('Forbidden', { status: 403 });
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
      return errorResponse(400, 'Missing url param', origin);
    }

    let parsed: URL;
    try {
      parsed = new URL(targetUrl);
    } catch {
      return errorResponse(400, 'Invalid URL', origin);
    }

    if (parsed.protocol !== 'https:') {
      return errorResponse(400, 'Only HTTPS URLs are supported', origin);
    }

    if (isPrivateHostname(parsed.hostname)) {
      return errorResponse(400, 'URLs pointing to private/reserved addresses are not allowed', origin);
    }

    const jinaUrl = `https://r.jina.ai/${targetUrl}`;

    const jinaHeaders = new Headers({ Accept: 'text/plain' });
    if (env.JINA_API_KEY) {
      jinaHeaders.set('Authorization', `Bearer ${env.JINA_API_KEY}`);
    }

    const jinaResponse = await fetch(jinaUrl, { headers: jinaHeaders });

    if (!jinaResponse.ok) {
      const message = jinaResponse.status === 429
        ? 'Too many requests \u2014 try again in a moment'
        : 'Could not convert this page to markdown';
      return errorResponse(502, message, origin);
    }

    const contentLength = jinaResponse.headers.get('Content-Length');
    if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_BYTES) {
      return errorResponse(502, 'This page is too large to convert', origin);
    }

    const body = await jinaResponse.text();

    if (body.length > MAX_RESPONSE_BYTES) {
      return errorResponse(502, 'This page is too large to convert', origin);
    }

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        ...corsHeaders(origin),
      },
    });
  },
};
