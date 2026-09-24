import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SPOTS, type Spot } from '../data/spots';
import { fetchWeather, fetchMarine, type WeatherResponse } from '../api/openMeteo';
import { findExtrema, coefficientForDay } from '../lib/tideMath';
import { windStyle, tempStyle, waveStyle, periodStyle, degToCardinal, fmtNum } from '../lib/format';
import { cloudEmoji } from '../lib/weatherCode';
import WindArrow from './WindArrow';
import LiveWindBadge from './LiveWindBadge';
import TideChart from './TideChart';

const REF = SPOTS[0];

// Hourly columns: 8h–20h
const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8..20

// Column width in px (27 ≈ 38 × 0.7)
const COL_W = 27;

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(isoDate: string, n: number): string {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function shortDateLabel(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
}

function getSunset(weather: WeatherResponse, isoDate: string): string | null {
  const idx = weather.daily?.time.indexOf(isoDate);
  if (idx == null || idx < 0) return null;
  return weather.daily.sunset[idx].slice(11, 16).replace(':', 'h');
}

function getSunrise(weather: WeatherResponse, isoDate: string): string | null {
  const idx = weather.daily?.time.indexOf(isoDate);
  if (idx == null || idx < 0) return null;
  return weather.daily.sunrise[idx].slice(11, 16).replace(':', 'h');
}

function idxFor(times: string[], date: string, hour: number): number {
  return times.indexOf(`${date}T${String(hour).padStart(2, '0')}:00`);
}

interface ColSpec { hour: number; date: string; iW: number; iM: number; }

// Wind is offshore when it blows away from shore:
// wind direction is roughly opposite to the spot's facing direction (within 90°).
function isOffshore(windDeg: number, facingDeg: number): boolean {
  const offshoreDeg = (facingDeg + 180) % 360;
  const diff = Math.abs(((windDeg - offshoreDeg + 540) % 360) - 180);
  return diff <= 90;
}

interface Props {
  onSelectSpot: (spot: Spot) => void;
}

export default function HomePage({ onSelectSpot }: Props) {
  const today = useMemo(todayISO, []);
  const days = useMemo(() => Array.from({ length: 10 }, (_, i) => addDays(today, i)), [today]);

  const weatherQ = useQuery({
    queryKey: ['weather', REF.lat, REF.lon],
    queryFn: () => fetchWeather(REF.lat, REF.lon, 10),
  });
  const marineQ = useQuery({
    queryKey: ['marine', REF.lat, REF.lon],
    queryFn: () => fetchMarine(REF.lat, REF.lon, 10),
  });

  const dateLabel = new Date(`${today}T12:00:00`).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const tideInfoByDay = useMemo(() => {
    if (!marineQ.data) return {};
    const { time, sea_level_height_msl } = marineQ.data.hourly;
    const extrema = findExtrema(time, sea_level_height_msl);
    return Object.fromEntries(days.map((d) => [
      d,
      {
        extrema: extrema.filter((e) => e.time.startsWith(d)),
        coef: coefficientForDay(time, sea_level_height_msl, d, REF.springRange),
      },
    ]));
  }, [marineQ.data, days]);

  const sunset = useMemo(() => {
    if (!weatherQ.data) return null;
    return getSunset(weatherQ.data, today);
  }, [weatherQ.data, today]);

  const sunrise = useMemo(() => {
    if (!weatherQ.data) return null;
    return getSunrise(weatherQ.data, today);
  }, [weatherQ.data, today]);

  const loading = weatherQ.isLoading || marineQ.isLoading;
  const wt = weatherQ.data?.hourly;
  const mt = marineQ.data?.hourly;

  // All columns across 3 days
  const allCols: ColSpec[] = useMemo(() =>
    days.flatMap((d) =>
      HOURS.map((h) => ({
        hour: h,
        date: d,
        iW: wt ? idxFor(wt.time, d, h) : -1,
        iM: mt ? idxFor(mt.time, d, h) : -1,
      }))
    ),
    [days, wt, mt]
  );

  // Shared label column width
  const LABEL_W = 'w-28 min-w-[7rem]';
  const totalDataCols = HOURS.length * days.length;

  return (
    <div className="space-y-5">
      {/* Date + tide header */}
      <div className="flex items-center gap-6 flex-wrap">
        <h2 className="text-2xl font-bold capitalize">{dateLabel}</h2>
        {sunrise && <SunWidget type="rise" time={sunrise} />}
        {sunset && <SunWidget type="set" time={sunset} />}
        {loading && <span className="text-sm text-slate-400">Chargement…</span>}
      </div>

      {/* Unified table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-x-auto">
        <table className="text-slate-100 border-collapse text-xs bg-slate-900" style={{ minWidth: `${7 * 16 + totalDataCols * COL_W}px`, width: '100%' }}>
          <thead>
            {/* Day header row */}
            <tr>
              <th className={`${LABEL_W} sticky left-0 z-10 sticky-label-col`}></th>
              {days.map((d) => (
                <th
                  key={d}
                  colSpan={HOURS.length}
                  className="text-[11px] font-semibold text-slate-300 pb-1 pt-2 text-center border-l border-slate-700/50 capitalize"
                >
                  {shortDateLabel(d)}
                </th>
              ))}
            </tr>
            {/* Hour row */}
            <tr>
              <th className={`${LABEL_W} text-left font-normal text-slate-500 pl-3 pr-2 pb-2 sticky left-0 z-10 sticky-label-col`}></th>
              {days.flatMap((d) =>
                HOURS.map((h, hi) => (
                  <th
                    key={`${d}-${h}`}
                    className={`text-[11px] font-semibold text-slate-300 pb-2 text-center${hi === 0 ? ' border-l border-slate-700/50' : ''}`}
                    style={{ minWidth: `${COL_W}px` }}
                  >
                    {String(h).padStart(2, '0')}h
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody className={`[&_tr>td:first-child]:pl-3 [&_tr>td:first-child]:pr-2 [&_tr>td:first-child]:text-left [&_tr>td:first-child]:whitespace-nowrap [&_tr>td:first-child]:${LABEL_W} [&_tr>td:first-child]:sticky [&_tr>td:first-child]:left-0 [&_tr>td:first-child]:z-10 [&_tr>td:first-child]:sticky-label-col`}>

            {/* ── SHARED ROWS ── */}
            {/* Tide charts — one per day */}
            {mt && (
              <tr>
                <td className="py-1 text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span>Marée</span>
                    {tideInfoByDay[today]?.coef != null && (
                      <span className="px-1.5 py-0.5 rounded font-bold text-[10px] text-amber-900 bg-amber-400 whitespace-nowrap">
                        Coef {tideInfoByDay[today].coef}
                      </span>
                    )}
                  </div>
                </td>
                {days.map((d, di) => (
                  <td key={d} colSpan={HOURS.length} className={`p-0${di > 0 ? ' border-l border-slate-700/50' : ''}`}>
                    <TideChart
                      times={mt.time}
                      heights={mt.sea_level_height_msl}
                      date={d}
                      hours={HOURS}
                      colWidth={COL_W}
                      context={2}
                      svgHeight={80}
                    />
                  </td>
                ))}
              </tr>
            )}

            {/* Nuages */}
            {wt && (
              <tr className="border-t border-slate-800/60">
                <td className="py-1 text-slate-400">Nuages</td>
                {allCols.map(({ hour, date, iW }, ci) => (
                  <td key={`${date}-${hour}`} className={`px-0.5 py-1 text-center${ci % HOURS.length === 0 && ci > 0 ? ' border-l border-slate-700/50' : ''}`}>
                    {iW >= 0 ? <span className="text-lg" title={`${Math.round(wt.cloud_cover[iW])}%`}>{cloudEmoji(wt.cloud_cover[iW])}</span> : '—'}
                  </td>
                ))}
              </tr>
            )}

            {/* Température */}
            {wt && (
              <tr>
                <td className="py-0 text-slate-400">Temp (°C)</td>
                {allCols.map(({ hour, date, iW }, ci) => {
                  const borderClass = ci % HOURS.length === 0 && ci > 0 ? ' border-l border-slate-700/50' : '';
                  if (iW < 0) return <td key={`${date}-${hour}`} className={borderClass} />;
                  const st = tempStyle(wt.temperature_2m[iW]);
                  return (
                    <td key={`${date}-${hour}`} className={`p-0 text-center text-[10px] font-semibold${borderClass}`} style={{ backgroundColor: st.backgroundColor, color: '#1e293b' }}>
                      <div className="py-1">{fmtNum(wt.temperature_2m[iW], 0)}</div>
                    </td>
                  );
                })}
              </tr>
            )}

            {/* ── PER-SPOT ROWS ── */}
            {SPOTS.map((spot) => (
              <SpotRows
                key={spot.slug}
                spot={spot}
                allCols={allCols}
                hours={HOURS}
                wt={wt}
                mt={mt}
                onSelect={() => onSelectSpot(spot)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- SpotRows ----------

// Simpler typed version
function SpotRows({ spot, allCols, hours, wt, mt, onSelect }: {
  spot: Spot;
  allCols: ColSpec[];
  hours: number[];
  wt: { time: string[]; wind_direction_10m: number[]; wind_speed_10m: number[]; wind_gusts_10m: number[] } | undefined;
  mt: { time: string[]; wave_height: number[]; wave_direction: number[]; wave_period: number[] } | undefined;
  onSelect: () => void;
}) {
  const N = allCols.length;
  const { facingDeg } = spot;

  function borderCls(ci: number) {
    return ci % hours.length === 0 && ci > 0 ? ' border-l border-slate-700/50' : '';
  }

  return (
    <>
      {/* Spot header row */}
      <tr className="border-t-2 border-slate-700">
        {/* Sticky label cell: spot name + détail link */}
        <td className="pt-3 pb-0 pl-3 pr-2 sticky left-0 z-10 sticky-label-col whitespace-nowrap">
          <div className="flex items-center gap-1.5 py-2">
            <button
              onClick={onSelect}
              className="font-semibold text-slate-100 hover:underline focus:outline-none text-sm"
            >
              {spot.name}
            </button>
            <span className="text-slate-600 text-xs">→ Détail</span>
          </div>
        </td>
        {/* Remaining columns: live badge floated left, rest empty */}
        <td colSpan={N} className="pt-3 pb-0 sticky-label-col">
          {spot.liveWind && (
            <div className="py-2 pl-1">
              <LiveWindBadge source={spot.liveWind} stationName={spot.name} />
            </div>
          )}
        </td>
      </tr>

      {/* Direction */}
      {wt && (
        <tr>
          <td className="py-1 text-slate-400">Dir. vent</td>
          {allCols.map(({ hour, date, iW }, ci) => (
            <td key={`${date}-${hour}`} className={`text-center py-0.5${borderCls(ci)}`}>
              {iW >= 0 ? (
                <div className="flex flex-col items-center">
                  {(() => {
                    const deg = wt.wind_direction_10m[iW];
                    const off = isOffshore(deg, facingDeg);
                    return <>
                      <WindArrow deg={deg} className={off ? 'text-red-500' : 'text-slate-500'} size={14} />
                      <span className={`text-[9px] ${off ? 'text-red-400' : 'text-slate-500'}`}>{degToCardinal(deg)}</span>
                    </>;
                  })()}
                </div>
              ) : '—'}
            </td>
          ))}
        </tr>
      )}

      {/* Vent */}
      {wt && (
        <tr>
          <td className="py-0 text-slate-400">Vent (kts)</td>
          {allCols.map(({ hour, date, iW }, ci) => {
            const bc = borderCls(ci);
            if (iW < 0) return <td key={`${date}-${hour}`} className={bc} />;
            const v = wt.wind_speed_10m[iW];
            const st = windStyle(v);
            return (
              <td key={`${date}-${hour}`} className={`p-0 text-center text-[10px] font-semibold${bc}`} style={{ backgroundColor: st.backgroundColor, color: st.color }}>
                <div className="py-1">{fmtNum(v, 0)}</div>
              </td>
            );
          })}
        </tr>
      )}

      {/* Rafale */}
      {wt && (
        <tr>
          <td className="py-0 text-slate-400">Rafale (kts)</td>
          {allCols.map(({ hour, date, iW }, ci) => {
            const bc = borderCls(ci);
            if (iW < 0) return <td key={`${date}-${hour}`} className={bc} />;
            const v = wt.wind_gusts_10m[iW];
            const st = windStyle(v);
            return (
              <td key={`${date}-${hour}`} className={`p-0 text-center text-[10px] font-semibold${bc}`} style={{ backgroundColor: st.backgroundColor, color: st.color }}>
                <div className="py-1">{fmtNum(v, 0)}</div>
              </td>
            );
          })}
        </tr>
      )}

      {/* Direction houle */}
      {mt && (
        <tr>
          <td className="py-1 text-slate-400">Dir. houle</td>
          {allCols.map(({ hour, date, iM }, ci) => (
            <td key={`${date}-${hour}`} className={`text-center py-0.5${borderCls(ci)}`}>
              {iM >= 0 ? (
                <div className="flex flex-col items-center">
                  <WindArrow deg={mt.wave_direction[iM]} className="text-cyan-400" size={14} />
                  <span className="text-[9px] text-slate-500">{degToCardinal(mt.wave_direction[iM])}</span>
                </div>
              ) : '—'}
            </td>
          ))}
        </tr>
      )}

      {/* Vagues */}
      {mt && (
        <tr>
          <td className="py-0 text-slate-400">Vagues (m)</td>
          {allCols.map(({ hour, date, iM }, ci) => {
            const bc = borderCls(ci);
            if (iM < 0) return <td key={`${date}-${hour}`} className={bc} />;
            const v = mt.wave_height[iM];
            const st = waveStyle(v);
            return (
              <td key={`${date}-${hour}`} className={`p-0 text-center text-[10px] font-semibold${bc}`} style={{ backgroundColor: st.backgroundColor, color: '#1e293b' }}>
                <div className="py-1">{fmtNum(v, 1)}</div>
              </td>
            );
          })}
        </tr>
      )}

      {/* Période */}
      {mt && (
        <tr>
          <td className="py-1 pb-2 text-slate-400">Période (s)</td>
          {allCols.map(({ hour, date, iM }, ci) => {
            const bc = borderCls(ci);
            if (iM < 0 || !Number.isFinite(mt.wave_period[iM])) return <td key={`${date}-${hour}`} className={`text-center py-1 text-slate-500${bc}`}>—</td>;
            const v = mt.wave_period[iM];
            const st = periodStyle(v);
            return (
              <td key={`${date}-${hour}`} className={`p-0 text-center text-[10px] font-semibold${bc}`} style={{ backgroundColor: st.backgroundColor, color: st.color }}>
                <div className="py-1">{fmtNum(v, 0)}s</div>
              </td>
            );
          })}
        </tr>
      )}
    </>
  );
}

// ---------- SunWidget ----------

function SunWidget({ type, time }: { type: 'rise' | 'set'; time: string }) {
  const isRise = type === 'rise';
  return (
    <div className="flex items-center gap-2">
      <svg width="44" height="36" viewBox="0 0 44 36" fill="none" aria-hidden>
        {/* Sky glow */}
        <ellipse cx="22" cy="28" rx="20" ry="10"
          fill={isRise ? 'url(#sky-rise)' : 'url(#sky-set)'} opacity="0.5" />
        {/* Horizon line */}
        <line x1="2" y1="28" x2="42" y2="28" stroke="#cbd5e1" strokeWidth="1" strokeOpacity="0.4" />
        {/* Sun body */}
        <circle cx="22" cy={isRise ? 20 : 24} r="8"
          fill={isRise ? 'url(#sun-rise)' : 'url(#sun-set)'} />
        {/* Arrow */}
        {isRise
          ? <polygon points="22,6 18,12 26,12" fill="#60a5fa" />
          : <polygon points="22,34 18,28 26,28" fill="#f97316" />}
        <defs>
          <radialGradient id="sky-rise" cx="50%" cy="80%" r="60%">
            <stop offset="0%" stopColor="#fef9c3" />
            <stop offset="100%" stopColor="#bfdbfe" />
          </radialGradient>
          <radialGradient id="sky-set" cx="50%" cy="80%" r="60%">
            <stop offset="0%" stopColor="#fed7aa" />
            <stop offset="100%" stopColor="#fecaca" />
          </radialGradient>
          <radialGradient id="sun-rise" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="100%" stopColor="#f59e0b" />
          </radialGradient>
          <radialGradient id="sun-set" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#fde68a" />
            <stop offset="100%" stopColor="#ea580c" />
          </radialGradient>
        </defs>
      </svg>
      <div className="text-xs leading-tight">
        <div className="text-slate-400">{isRise ? 'Lever' : 'Coucher'}</div>
        <div className="font-semibold text-slate-200 text-sm">{time.replace('h', ':')}</div>
      </div>
    </div>
  );
}
