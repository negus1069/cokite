// Shared proxy strategies for fetching external endpoints from the browser.
// Many public weather-station feeds don't set CORS headers; we work around
// that in two ways:
//   1. Local dev: Vite dev-server proxy (see `vite.config.ts`).
//   2. Production (static GH Pages): fallback to public CORS proxies.

const isDev = import.meta.env.DEV;

/**
 * Same-origin rewrites used in dev (via Vite's `server.proxy`) and optionally
 * in prod if you deploy behind a reverse proxy that mirrors these paths.
 */
const DEV_REWRITES: Array<{ from: string; to: string }> = [
  { from: 'https://weameter.com', to: '/weameter' },
  { from: 'https://www.meteolarochelle.fr', to: '/mlr' },
];

/** Ordered list of public CORS proxies. First success wins. */
const PUBLIC_PROXIES: Array<(url: string) => string> = [
  (url) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
];

/**
 * Fetch an external URL, resolving CORS restrictions transparently.
 * In dev, uses the local Vite proxy (deterministic and fast).
 * In prod, tries public CORS proxies in order.
 */
export async function fetchViaProxy(url: string, init?: RequestInit): Promise<Response> {
  if (isDev) {
    // Try local Vite reverse proxy first.
    for (const r of DEV_REWRITES) {
      if (url.startsWith(r.from)) {
        return fetch(url.replace(r.from, r.to), { cache: 'no-store', ...init });
      }
    }
  }
  let lastErr: unknown;
  for (const build of PUBLIC_PROXIES) {
    try {
      const target = build(url);
      const res = await fetch(target, { cache: 'no-store', ...init });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(
    `Impossible d'atteindre ${url} via un proxy CORS (${
      lastErr instanceof Error ? lastErr.message : lastErr
    })`,
  );
}
