import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchWeameter, toLiveWind, type LiveWind } from '../api/weameter';
import { fetchClientRaw } from '../api/clientraw';
import type { LiveWindSource } from '../data/spots';
import { degToCardinal, fmtNum, windStyle } from '../lib/format';
import WindArrow from './WindArrow';

interface Props {
  source: LiveWindSource;
  stationName?: string;
}

interface Sample {
  t: number;
  w: number;
  g: number;
}

const MAX_SAMPLES = 800;

function rollingAvg1h(buf: Sample[], now: number) {
  const cutoff = now - 60 * 60 * 1000;
  let sum = 0;
  let count = 0;
  let gmax = -Infinity;
  for (const s of buf) {
    if (s.t < cutoff) continue;
    if (Number.isFinite(s.w)) { sum += s.w; count++; }
    if (Number.isFinite(s.g) && s.g > gmax) gmax = s.g;
  }
  const spanMin = count > 0 ? Math.round((now - Math.max(cutoff, buf[0]?.t ?? now)) / 60000) : 0;
  return {
    avg: count > 0 ? sum / count : undefined,
    gmax: gmax > -Infinity ? gmax : undefined,
    spanMin,
  };
}

/**
 * Live wind reading pulled from a weather station feed.
 * Supports two source types:
 *   - `weameter`  : Weameter station JSON (Rivedoux, Île de Ré, ...)
 *   - `clientraw` : Weather Display "clientraw.txt" (meteo-la-rochelle.fr, ...)
 * Polls every 5 seconds.
 */
export default function LiveWindBadge({ source, stationName }: Props) {
  const bufRef = useRef<Sample[]>([]);

  const q = useQuery<LiveWind>({
    queryKey: ['live-wind', source.type, source.url],
    queryFn: async () => {
      if (source.type === 'weameter') {
        return fetchWeameter(source.url).then(toLiveWind);
      }
      // clientraw
      const r = await fetchClientRaw(source.url);
      return {
        speedKts: r.speedKts,
        gustKts: r.gustKts,
        directionDeg: r.directionDeg,
        directionText: degToCardinal(r.directionDeg),
        timestamp: r.timestamp,
        hasData: r.hasData,
      };
    },
    refetchInterval: 5000,
    staleTime: 4000,
  });

  // Feed the rolling buffer whenever a new valid sample arrives.
  useEffect(() => {
    const d = q.data;
    if (!d?.hasData) return;
    const buf = bufRef.current;
    const t = d.timestamp.getTime();
    if (buf.length > 0 && buf[buf.length - 1].t === t) return;
    buf.push({ t, w: d.speedKts, g: d.gustKts });
    const cutoff = Date.now() - 65 * 60 * 1000;
    while (buf.length > 0 && buf[0].t < cutoff) buf.shift();
    if (buf.length > MAX_SAMPLES) buf.splice(0, buf.length - MAX_SAMPLES);
  }, [q.data]);

  if (q.isLoading) {
    return (
      <div className="rounded-lg border border-slate-700/40 px-3 py-2 text-xs text-slate-400">
        📡 Connexion à la station…
      </div>
    );
  }

  if (q.error || !q.data?.hasData) {
    return (
      <div className="rounded-lg border border-slate-700/40 px-3 py-2 text-xs text-slate-400">
        📡 Station hors ligne
      </div>
    );
  }

  const d = q.data;
  const st = windStyle(d.speedKts);
  const age = Math.round((Date.now() - d.timestamp.getTime()) / 1000);
  const ageLabel = age < 60 ? `${age}s` : `${Math.round(age / 60)}min`;

  // Prefer station-provided 1h stats; else fall back to the rolling buffer.
  const rolling = rollingAvg1h(bufRef.current, Date.now());
  const avg1h = d.avg1hKts ?? rolling.avg;
  const gmax1h = d.gustMax1hKts ?? rolling.gmax;
  const avgTag =
    d.avg1hKts !== undefined
      ? '1h'
      : rolling.spanMin >= 60
        ? '1h'
        : `~${Math.max(1, rolling.spanMin)}min`;
  const stAvg = avg1h !== undefined ? windStyle(avg1h) : null;

  return (
    <div
      className="rounded-lg border border-slate-700/40 px-3 py-1.5 text-xs flex items-center gap-x-2.5 whitespace-nowrap overflow-hidden"
      title={`Station ${stationName ?? ''} · lecture il y a ${ageLabel}`}
    >
      <div className="flex items-center gap-1 shrink-0">
        <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-emerald-600 font-medium">LIVE</span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <WindArrow deg={d.directionDeg} className="text-slate-200" size={14} />
        <span className="text-slate-300">{degToCardinal(d.directionDeg)} · {Math.round(d.directionDeg)}°</span>
      </div>
      <span className="text-slate-500 shrink-0">vent</span>
      <span
        className="px-2 py-0.5 rounded font-semibold shrink-0"
        style={{ backgroundColor: st.backgroundColor, color: st.color }}
      >
        {fmtNum(d.speedKts, 0)} kts
      </span>
      <span className="text-slate-400 shrink-0">
        raf. <span className="text-slate-200 font-medium">{fmtNum(d.gustKts, 0)}</span>
      </span>
      {avg1h !== undefined && stAvg && (
        <>
          <span className="text-slate-500 shrink-0">moy. {avgTag}</span>
          <span
            className="px-2 py-0.5 rounded font-semibold shrink-0"
            style={{ backgroundColor: stAvg.backgroundColor, color: stAvg.color }}
          >
            {fmtNum(avg1h, 0)}
          </span>
          {gmax1h !== undefined && (
            <span className="text-slate-500 shrink-0">
              raf.max <span className="text-slate-200 font-medium">{fmtNum(gmax1h, 0)}</span>
            </span>
          )}
        </>
      )}
      <span className="text-slate-500 shrink-0">
        {d.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        <span className="text-slate-600 ml-1">({ageLabel})</span>
      </span>
    </div>
  );
}

