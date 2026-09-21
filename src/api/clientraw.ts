// Parser for Weather Display's `clientraw.txt` file — a space-separated
// string of ~180 numeric fields updated every ~5s by the station software.
// Format reference: http://carterlake.org/software/clientraw.html
//
// We only decode the handful of fields we need for the live badge.

import { fetchViaProxy } from './proxy';

export interface ClientRawLive {
  speedKts: number;
  gustKts: number;
  directionDeg: number;
  temperatureC: number;
  humidityPct: number;
  pressureHpa: number;
  timestamp: Date; // best-effort local time (station-local)
  stationTag: string;
  hasData: boolean;
}

/**
 * Parse a raw clientraw.txt payload.
 * Valid records start with "12345" and end with "!!".
 */
export function parseClientRaw(raw: string): ClientRawLive {
  const trimmed = raw.trim();
  const parts = trimmed.split(/\s+/);
  const ok = parts[0] === '12345' && /!!/.test(trimmed);
  const num = (i: number) => {
    const v = parseFloat(parts[i] ?? '');
    return Number.isFinite(v) ? v : NaN;
  };
  const hh = num(29);
  const mm = num(30);
  const ss = num(31);
  const now = new Date();
  const ts = new Date(now);
  if (Number.isFinite(hh) && Number.isFinite(mm) && Number.isFinite(ss)) {
    ts.setHours(hh, mm, ss, 0);
  }
  return {
    speedKts: num(1),
    gustKts: num(2),
    directionDeg: num(3),
    temperatureC: num(4),
    humidityPct: num(5),
    pressureHpa: num(6),
    timestamp: ts,
    stationTag: parts[32] ?? '',
    hasData: ok && Number.isFinite(num(1)) && Number.isFinite(num(3)),
  };
}

/**
 * Fetch and parse a clientraw.txt endpoint (goes through the proxy chain
 * because most Weather Display sites don't set CORS).
 */
export async function fetchClientRaw(url: string): Promise<ClientRawLive> {
  const res = await fetchViaProxy(url);
  const text = await res.text();
  return parseClientRaw(text);
}
