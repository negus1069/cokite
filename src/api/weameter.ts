// Fetches real-time wind readings from a WEAMETER-compatible station JSON.
// https://weameter.com — network of live anemometer stations on the French
// Atlantic coast. Each station exposes a static JSON polled every 5 s.

import { fetchViaProxy } from './proxy';

// Trailing time-interval statistics returned by WEAMETER inside `Average.{0..6}`.
// Indices: 0=10min, 1=1h, 2=2h, 3=4h, 4=6h, 5=12h, 6=24h.
interface WeameterAverageBucket {
  TimeIntervalTxt: string;
  w: string;      // average wind, kts
  gmax: string;   // max gust in the interval, kts
  min: string;    // min wind, kts
  gmaxtime: string;
  mintime: string;
  b: number | string;
  btxt: string;
}

export interface WeameterCurrent {
  epoch: number;
  date: string;
  time: string;
  w: string;    // wind speed (kts) as string
  b: string;    // bearing deg as string ("000" etc.)
  btxt: string; // French cardinal
  g: string;    // gust (kts) as string
}

export interface WeameterResponse {
  ver: number;
  timeshift: number;
  current: WeameterCurrent;
  Average?: {
    Params?: unknown;
    [bucket: string]: WeameterAverageBucket | unknown | undefined;
  };
}

export async function fetchWeameter(url: string): Promise<WeameterResponse> {
  const res = await fetchViaProxy(url);
  const data = await res.json();
  if (!data || typeof data !== 'object' || !('current' in data)) {
    throw new Error('Weameter: unexpected payload');
  }
  return data as WeameterResponse;
}

/** Normalized live-reading shape shared by all station types. */
export interface LiveWind {
  speedKts: number;
  gustKts: number;
  directionDeg: number;
  directionText: string;
  timestamp: Date;
  hasData: boolean;
  /** Trailing 1-hour average wind speed (kts), if the station provides it. */
  avg1hKts?: number;
  /** Max gust over the trailing 1 hour (kts), if the station provides it. */
  gustMax1hKts?: number;
}

export function toLiveWind(r: WeameterResponse): LiveWind {
  const w = parseFloat(r.current?.w ?? '');
  const g = parseFloat(r.current?.g ?? '');
  const b = parseFloat(r.current?.b ?? '');
  const ts = r.current?.epoch ? new Date(r.current.epoch * 1000) : new Date(NaN);
  const hasData = Number.isFinite(w) && Number.isFinite(b) && !Number.isNaN(ts.getTime());

  // Extract trailing 1-hour stats if available (bucket "1" = 1h in WEAMETER).
  let avg1hKts: number | undefined;
  let gustMax1hKts: number | undefined;
  const b1 = r.Average?.['1'] as WeameterAverageBucket | undefined;
  if (b1 && typeof b1 === 'object') {
    const avg = parseFloat(b1.w);
    const gmax = parseFloat(b1.gmax);
    if (Number.isFinite(avg)) avg1hKts = avg;
    if (Number.isFinite(gmax)) gustMax1hKts = gmax;
  }

  return {
    speedKts: Number.isFinite(w) ? w : NaN,
    gustKts: Number.isFinite(g) ? g : NaN,
    directionDeg: Number.isFinite(b) ? b : NaN,
    directionText: r.current?.btxt ?? '',
    timestamp: ts,
    hasData,
    avg1hKts,
    gustMax1hKts,
  };
}



