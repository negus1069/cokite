// Shared proxy strategies for fetching external endpoints from the browser.
// Many public weather-station feeds don't set CORS headers; we work around
// that in two ways:
//   1. Local dev: Vite dev-server proxy (see `vite.config.ts`).
//   2. Production (static GH Pages): fallback to public CORS proxies.

const isDev = import.meta.env.DEV;

const DEV_REWRITES: Array<{ from: string; to: string }> = [
  { from: 'https://weameter.com', to: '/weameter' },
  { from: 'https://www.meteolarochelle.fr', to: '/mlr' },
];

/** Ordered list of public CORS proxies. First success wins. */
const PUBLIC_PROXIES: Array<(url: string) => string> = [
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  (url) => `https://thingproxy.freeboard.io/fetch/${url}`,
];

export async function fetchViaProxy(url: string, init?: RequestInit): Promise<Response> {
  if (isDev) {
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
