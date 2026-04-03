// ABOUTME: Integration tests that hit the real deployed Cloudflare Worker.
// ABOUTME: Run with `yarn test:integration` — requires network access and deployed worker.

import { describe, it, expect } from 'vitest';

const WORKER_URL = 'https://marginalia-reader.galsapir.workers.dev';

describe('deployed worker', () => {
  describe('validation', () => {
    it('returns 400 when url param is missing', async () => {
      const res = await fetch(WORKER_URL);

      expect(res.status).toBe(400);
      expect(await res.text()).toBe('Missing url param');
    });

    it('returns 400 for HTTP (non-HTTPS) URLs', async () => {
      const res = await fetch(`${WORKER_URL}?url=${encodeURIComponent('http://example.com')}`);

      expect(res.status).toBe(400);
      expect(await res.text()).toContain('HTTPS');
    });

    it('returns 400 for private IP addresses', async () => {
      const res = await fetch(`${WORKER_URL}?url=${encodeURIComponent('https://169.254.169.254/latest')}`);

      expect(res.status).toBe(400);
      expect(await res.text()).toContain('private');
    });

    it('returns 400 for localhost', async () => {
      const res = await fetch(`${WORKER_URL}?url=${encodeURIComponent('https://localhost/secret')}`);

      expect(res.status).toBe(400);
    });
  });

  describe('CORS', () => {
    it('returns CORS headers on preflight', async () => {
      const res = await fetch(WORKER_URL, {
        method: 'OPTIONS',
        headers: { Origin: 'https://galsapir.github.io' },
      });

      expect(res.status).toBe(204);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://galsapir.github.io');
      expect(res.headers.get('Access-Control-Allow-Methods')).toBe('GET, OPTIONS');
    });

    it('rejects disallowed origins', async () => {
      const res = await fetch(`${WORKER_URL}?url=${encodeURIComponent('https://example.com')}`, {
        headers: { Origin: 'https://evil.com' },
      });

      expect(res.status).toBe(403);
    });
  });

  describe('proxying', () => {
    it('returns markdown for a valid HTTPS URL', async () => {
      const res = await fetch(`${WORKER_URL}?url=${encodeURIComponent('https://example.com')}`);

      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
      expect(res.headers.get('Cache-Control')).toBe('no-store');

      const body = await res.text();
      expect(body).toContain('Example Domain');
    }, 15000);

    it('returns markdown for a real article', async () => {
      const res = await fetch(
        `${WORKER_URL}?url=${encodeURIComponent('https://developer.mozilla.org/en-US/docs/Web/HTML')}`,
      );

      expect(res.status).toBe(200);
      const body = await res.text();
      expect(body.length).toBeGreaterThan(100);
      expect(body).toContain('HTML');
    }, 30000);
  });
});
