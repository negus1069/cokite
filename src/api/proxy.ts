// Fetch strategy:
//   Dev  → Vite reverse proxy (no CORS issues)
//   Prod → GitHub-hosted JSON/txt files updated every 5 min by a GH Actions workflow

const isDev = import.meta.env.DEV;

const DEV_REWRITES: Array<{ from: string; to: string }> = [
  { from: 'https://weameter.com', to: '/weameter' },
  { from: 'https://www.meteolarochelle.fr', to: '/mlr' },
];

// Maps upstream URLs to the pre-fetched static files served from /cokite/live/
const STATIC_FILES: Array<{ from: string; to: string }> = [
  {
    from: 'https://weameter.com/stations/ilederekitesurf/windrt.json',
    to: '/cokite/live/weameter-rivedoux.json',
  },
  {
    from: 'https://www.meteolarochelle.fr/wdlchatel/clientraw.txt',
    to: '/cokite/live/clientraw-chatelaillon.txt',
  },
];

export async function fetchViaProxy(url: string, init?: RequestInit): Promise<Response> {
  if (isDev) {
    for (const r of DEV_REWRITES) {
      if (url.startsWith(r.from)) {
        return fetch(url.replace(r.from, r.to), { cache: 'no-store', ...init });
      }
    }
  }

  // Production: serve from pre-fetched static files (no CORS needed)
  for (const s of STATIC_FILES) {
    if (url === s.from) {
      const res = await fetch(s.to, { cache: 'no-store', ...init });
      if (!res.ok) throw new Error(`Static live file not available (HTTP ${res.status})`);
      return res;
    }
  }

  throw new Error(`No proxy configured for ${url}`);
}
