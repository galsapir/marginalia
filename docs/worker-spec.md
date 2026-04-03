# Marginalia Reader Proxy — Cloudflare Worker Spec

## Purpose

Marginalia is a static site (GitHub Pages) with no backend. To convert arbitrary
webpages into markdown, we use [Jina Reader](https://r.jina.ai/) — a free API
that returns a markdown version of any URL. However, Jina Reader does not send
CORS headers, so browser-side `fetch()` calls are blocked. This worker acts as a
thin CORS proxy between the Marginalia frontend and Jina Reader.

## Why Cloudflare Workers

| Consideration          | Decision                                                    |
| ---------------------- | ----------------------------------------------------------- |
| No backend to maintain | Workers are serverless — deploy once, no infra management   |
| Free tier              | 100k requests/day, more than enough for personal use        |
| Edge latency           | Runs on Cloudflare's edge, low latency globally             |
| TOS-compliant          | Your own infrastructure — no third-party proxy TOS concerns |
| Simple                 | ~30 lines of code, one file, one command to deploy          |

We explicitly chose **not** to use public CORS proxies (corsproxy.io,
allorigins.win, cors-anywhere) because they are intended for development only,
have no SLA, and using them in a deployed app violates the spirit of their terms.

## API Contract

### Request

```
GET https://<your-worker>.workers.dev?url=<encoded-target-url>
```

| Param | Required | Description                            |
| ----- | -------- | -------------------------------------- |
| `url` | Yes      | The target webpage URL, percent-encoded |

### Response

| Status | Body                  | Meaning                                      |
| ------ | --------------------- | -------------------------------------------- |
| 200    | Markdown text (UTF-8) | Success — Jina Reader converted the page     |
| 400    | `"Missing url param"` | The `url` query parameter was not provided   |
| 502    | Error message         | Jina Reader returned a non-OK status         |

### CORS Headers (all responses)

The worker uses an **origin allowlist** — only requests from allowed origins
receive CORS headers. Requests from disallowed origins get a 403.

Allowed origins: `https://galsapir.github.io`, `http://localhost:5173`,
`http://localhost:4173`. Requests with no `Origin` header (curl, direct) are
allowed for dev/testing.

```
Access-Control-Allow-Origin: <requesting origin>
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

### Preflight

The worker handles `OPTIONS` requests and returns 204 with the CORS headers
above.

## Behaviour

1. Parse the `url` query parameter from the incoming request.
2. If missing, return `400`.
3. Fetch `https://r.jina.ai/<url>` (the url should NOT be re-encoded — Jina
   expects a raw URL after the prefix).
4. If Jina returns a non-OK status, return `502` with a descriptive message.
5. Stream/return Jina's response body as `text/plain; charset=utf-8`.
6. Attach CORS headers to every response.

## Security Considerations

- **Allowlist origins** (optional): If you want to restrict usage to your own
  site, set `Access-Control-Allow-Origin` to your GitHub Pages domain instead
  of `*`.
- **Rate limiting**: Cloudflare Workers has built-in rate limiting you can
  enable. Without it, the free Jina tier (~20 RPM without key, 100 RPM with
  free key) is the natural throttle.
- **No secrets required for basic use**: Jina Reader works without an API key
  for light usage. If you want higher limits, get a free key from
  [jina.ai/api-dashboard](https://jina.ai/api-dashboard/) and pass it as the
  `Authorization: Bearer <key>` header from the worker to Jina (store the key
  as a Cloudflare Worker secret via `wrangler secret put JINA_API_KEY`).

## Frontend Integration

The Marginalia frontend calls this worker from `src/lib/webpage.ts`. The
default proxy URL is configured at the top of that file:

```ts
const DEFAULT_PROXY_URL = 'https://marginalia-reader.galsapir.workers.dev';
```

## Deployment

The worker lives in `worker/` and is deployed via:

```sh
cd worker && ./node_modules/.bin/wrangler deploy
```

To add a Jina API key for higher rate limits:

```sh
wrangler secret put JINA_API_KEY
```
