import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchWeameter, toLiveWind, type LiveWind } from '../api/weameter';
import { fetchClientRaw } from '../api/clientraw';
import type { LiveWindSource } from '../data/spots';
import { degToCardinal, fmtNum, windStyle } from '../lib/format';

interface Props {
  source: LiveWindSource;
  stationName: string;
}

interface Sample { t: number; w: number; g: number; }

function rollingAvg(buf: Sample[], now: number, windowMs: number) {
  const cutoff = now - windowMs;
  let sum = 0; let count = 0; let gmax = -Infinity;
  for (const s of buf) {
    if (s.t < cutoff) continue;
    if (Number.isFinite(s.w)) { sum += s.w; count++; }
    if (Number.isFinite(s.g) && s.g > gmax) gmax = s.g;
  }
  return {
    avg: count > 0 ? sum / count : undefined,
    gmax: gmax > -Infinity ? gmax : undefined,
  };
}

export default function LiveWindCard({ source, stationName }: Props) {
  const bufRef = useRef<Sample[]>([]);

  const q = useQuery<LiveWind>({
    queryKey: ['live-wind', source.type, source.url],
    queryFn: async () => {
      if (source.type === 'weameter') return fetchWeameter(source.url).then(toLiveWind);
      const r = await fetchClientRaw(source.url);
      return { speedKts: r.speedKts, gustKts: r.gustKts, directionDeg: r.directionDeg, directionText: degToCardinal(r.directionDeg), timestamp: r.timestamp, hasData: r.hasData };
    },
    refetchInterval: 5000,
    staleTime: 4000,
  });

  useEffect(() => {
    const d = q.data;
    if (!d?.hasData) return;
    const buf = bufRef.current;
    const t = d.timestamp.getTime();
    if (buf.length > 0 && buf[buf.length - 1].t === t) return;
    buf.push({ t, w: d.speedKts, g: d.gustKts });
    const cutoff = Date.now() - 65 * 60 * 1000;
    while (buf.length > 0 && buf[0].t < cutoff) buf.shift();
    if (buf.length > 800) buf.splice(0, buf.length - 800);
  }, [q.data]);

  const skeleton = (msg: string) => (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 flex flex-col gap-3 min-w-[200px]">
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide truncate">{stationName}</div>
      <div className="text-xs text-slate-400">{msg}</div>
    </div>
  );

  if (q.isLoading) return skeleton('Connexion…');
  if (q.error || !q.data?.hasData) return skeleton('Station hors ligne');

  const d = q.data;
  const age = Math.round((Date.now() - d.timestamp.getTime()) / 1000);
  const ageLabel = age < 60 ? `${age}s` : `${Math.round(age / 60)}min`;
  const st = windStyle(d.speedKts);

  const avg1h = d.avg1hKts ?? rollingAvg(bufRef.current, Date.now(), 60 * 60_000).avg;
  const stAvg1h = avg1h !== undefined ? windStyle(avg1h) : null;

  const compassDeg = d.directionDeg;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 flex flex-col gap-3 min-w-[220px] flex-1">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide truncate">{stationName}</span>
        <div className="flex items-center gap-1 shrink-0">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] text-emerald-600 font-semibold">LIVE</span>
          <span className="text-[10px] text-slate-400 ml-1">({ageLabel})</span>
        </div>
      </div>

      {/* Compass + direction + speed tiles on same line */}
      <div className="flex items-center gap-3">
        <Compass deg={compassDeg} />
        <div className="flex flex-col gap-0.5 shrink-0">
          <div className="text-xl font-bold text-slate-800">{degToCardinal(d.directionDeg)}</div>
          <div className="text-xs text-slate-400">{Math.round(d.directionDeg)}°</div>
        </div>
        <div className="flex gap-2 flex-1">
          <SpeedTile label="Instant." value={d.speedKts} st={st} />
          <SpeedTile label="Moy. 1h" value={avg1h} st={stAvg1h} />
        </div>
      </div>

      {/* Gust */}
      <div className="text-xs text-slate-500 text-center">
        Rafale : <span className="font-semibold text-slate-700">{fmtNum(d.gustKts, 1)} kts</span>
      </div>
    </div>
  );
}

function SpeedTile({ label, value, st }: { label: string; value: number | undefined; st: ReturnType<typeof windStyle> | null }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-xl py-2 px-1 flex-1" style={st && value !== undefined ? { backgroundColor: st.backgroundColor } : { backgroundColor: '#f1f5f9' }}>
      <span className="text-[9px] uppercase tracking-wide font-semibold" style={{ color: st?.color ?? '#94a3b8' }}>{label}</span>
      <span className="text-base font-bold leading-tight" style={{ color: st?.color ?? '#94a3b8' }}>
        {value !== undefined ? `${fmtNum(value, 1)}` : '—'}
      </span>
      {value !== undefined && <span className="text-[9px]" style={{ color: st?.color ?? '#94a3b8' }}>kts</span>}
    </div>
  );
}

function Compass({ deg }: { deg: number }) {
  return (
    <div className="relative w-14 h-14 shrink-0">
      {/* Outer ring */}
      <svg viewBox="0 0 56 56" className="w-full h-full">
        <circle cx="28" cy="28" r="26" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="2" />
        <circle cx="28" cy="28" r="20" fill="none" stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="2 3" />
        {/* Cardinal labels */}
        <text x="28" y="7" textAnchor="middle" fontSize="5" fontWeight="700" fill="#ef4444">N</text>
        <text x="28" y="53" textAnchor="middle" fontSize="5" fill="#64748b">S</text>
        <text x="51" y="30" textAnchor="middle" fontSize="5" fill="#64748b">E</text>
        <text x="5" y="30" textAnchor="middle" fontSize="5" fill="#64748b">O</text>
        {/* Needle */}
        <g transform={`rotate(${deg}, 28, 28)`}>
          {/* North (red) */}
          <polygon points="28,10 25,28 31,28" fill="#ef4444" />
          {/* South (dark) */}
          <polygon points="28,46 25,28 31,28" fill="#1e293b" />
          <circle cx="28" cy="28" r="2.5" fill="#1e293b" />
        </g>
      </svg>
    </div>
  );
}
