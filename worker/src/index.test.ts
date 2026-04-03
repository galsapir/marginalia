// ABOUTME: Tests for the Jina Reader CORS proxy worker.
// ABOUTME: Covers CORS, URL validation, security hardening, and error handling.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import worker from './index';

const ALLOWED_ORIGIN = 'https://galsapir.github.io';

function makeRequest(url: string, options: RequestInit = {}): Request {
  return new Request(url, {
    headers: new Headers({
      Origin: ALLOWED_ORIGIN,
      ...(options.headers as Record<string, string>),
    }),
    ...options,
  });
}

function makeEnv() {
  return { JINA_API_KEY: '' };
}

describe('CORS', () => {
  it('handles OPTIONS preflight with correct headers', async () => {
    const req = makeRequest('https://marginalia-reader.workers.dev?url=https://example.com', {
      method: 'OPTIONS',
    });
    const res = await worker.fetch(req, makeEnv());

    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(ALLOWED_ORIGIN);
    expect(res.headers.get('Access-Control-Allow-Methods')).toBe('GET, OPTIONS');
    expect(res.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type');
  });

  it('rejects requests from disallowed origins', async () => {
    const req = new Request('https://marginalia-reader.workers.dev?url=https://example.com', {
      headers: new Headers({ Origin: 'https://evil.com' }),
    });
    const res = await worker.fetch(req, makeEnv());

    expect(res.status).toBe(403);
  });

  it('allows requests with no Origin header (direct/non-browser)', async () => {
    // No Origin header — allowed so curl and direct testing work
    const req = new Request('https://marginalia-reader.workers.dev?url=https://example.com');
    const res = await worker.fetch(req, makeEnv());

    expect(res.status).not.toBe(403);
  });

  it('allows localhost origin for development', async () => {
    const req = new Request('https://marginalia-reader.workers.dev?url=https://example.com', {
      headers: new Headers({ Origin: 'http://localhost:5173' }),
    });
    const res = await worker.fetch(req, makeEnv());

    expect(res.status).not.toBe(403);
  });
});

describe('URL validation', () => {
  it('returns 400 when url param is missing', async () => {
    const req = makeRequest('https://marginalia-reader.workers.dev');
    const res = await worker.fetch(req, makeEnv());

    expect(res.status).toBe(400);
    expect(await res.text()).toBe('Missing url param');
  });

  it('returns 400 for non-HTTPS target URLs', async () => {
    const req = makeRequest('https://marginalia-reader.workers.dev?url=http://example.com');
    const res = await worker.fetch(req, makeEnv());

    expect(res.status).toBe(400);
    expect(await res.text()).toContain('HTTPS');
  });

  it('returns 400 for non-HTTP schemes', async () => {
    const req = makeRequest('https://marginalia-reader.workers.dev?url=file:///etc/passwd');
    const res = await worker.fetch(req, makeEnv());

    expect(res.status).toBe(400);
  });

  it('returns 400 for private/reserved IPs', async () => {
    const req = makeRequest('https://marginalia-reader.workers.dev?url=https://169.254.169.254/latest/meta-data/');
    const res = await worker.fetch(req, makeEnv());

    expect(res.status).toBe(400);
    expect(await res.text()).toContain('private');
  });

  it('returns 400 for localhost targets', async () => {
    const req = makeRequest('https://marginalia-reader.workers.dev?url=https://localhost/secret');
    const res = await worker.fetch(req, makeEnv());

    expect(res.status).toBe(400);
  });

  it('returns 400 for 10.x.x.x range', async () => {
    const req = makeRequest('https://marginalia-reader.workers.dev?url=https://10.0.0.1/internal');
    const res = await worker.fetch(req, makeEnv());

    expect(res.status).toBe(400);
  });

  it('returns 400 for 192.168.x.x range', async () => {
    const req = makeRequest('https://marginalia-reader.workers.dev?url=https://192.168.1.1/admin');
    const res = await worker.fetch(req, makeEnv());

    expect(res.status).toBe(400);
  });
});

describe('proxying', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('fetches from r.jina.ai with the target URL', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('# Hello', { status: 200 }));

    const req = makeRequest(
      'https://marginalia-reader.workers.dev?url=' + encodeURIComponent('https://example.com/article'),
    );
    await worker.fetch(req, makeEnv());

    expect(fetch).toHaveBeenCalledWith(
      'https://r.jina.ai/https://example.com/article',
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
  });

  it('returns markdown with text/plain content type', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('# Hello World', { status: 200 }));

    const req = makeRequest(
      'https://marginalia-reader.workers.dev?url=' + encodeURIComponent('https://example.com'),
    );
    const res = await worker.fetch(req, makeEnv());

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
    expect(await res.text()).toBe('# Hello World');
  });

  it('sets Cache-Control to no-store', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('content', { status: 200 }));

    const req = makeRequest(
      'https://marginalia-reader.workers.dev?url=' + encodeURIComponent('https://example.com'),
    );
    const res = await worker.fetch(req, makeEnv());

    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('returns user-friendly message on Jina error', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('error', { status: 500, statusText: 'Internal Server Error' }));

    const req = makeRequest(
      'https://marginalia-reader.workers.dev?url=' + encodeURIComponent('https://example.com'),
    );
    const res = await worker.fetch(req, makeEnv());

    expect(res.status).toBe(502);
    expect(await res.text()).toBe('Could not convert this page to markdown');
  });

  it('returns rate-limit message on 429', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('', { status: 429, statusText: 'Too Many Requests' }));

    const req = makeRequest(
      'https://marginalia-reader.workers.dev?url=' + encodeURIComponent('https://example.com'),
    );
    const res = await worker.fetch(req, makeEnv());

    expect(res.status).toBe(502);
    expect(await res.text()).toContain('Too many requests');
  });

  it('passes Jina API key when configured', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('content', { status: 200 }));

    const req = makeRequest(
      'https://marginalia-reader.workers.dev?url=' + encodeURIComponent('https://example.com'),
    );
    const env = { JINA_API_KEY: 'test-key-123' };
    await worker.fetch(req, env);

    const callArgs = vi.mocked(fetch).mock.calls[0];
    const headers = callArgs[1]?.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer test-key-123');
  });

  it('does not send Authorization header when no API key', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('content', { status: 200 }));

    const req = makeRequest(
      'https://marginalia-reader.workers.dev?url=' + encodeURIComponent('https://example.com'),
    );
    await worker.fetch(req, makeEnv());

    const callArgs = vi.mocked(fetch).mock.calls[0];
    const headers = callArgs[1]?.headers as Headers;
    expect(headers.has('Authorization')).toBe(false);
  });
});

describe('response size limit', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('returns 502 when response exceeds size limit', async () => {
    // 6MB response (over 5MB limit)
    const huge = 'x'.repeat(6 * 1024 * 1024);
    vi.mocked(fetch).mockResolvedValue(new Response(huge, {
      status: 200,
      headers: { 'Content-Length': String(huge.length) },
    }));

    const req = makeRequest(
      'https://marginalia-reader.workers.dev?url=' + encodeURIComponent('https://example.com'),
    );
    const res = await worker.fetch(req, makeEnv());

    expect(res.status).toBe(502);
    expect(await res.text()).toContain('too large to convert');
  });
});
