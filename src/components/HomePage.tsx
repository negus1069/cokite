import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SPOTS, type Spot } from '../data/spots';
import { fetchWeather, fetchMarine, type WeatherResponse } from '../api/openMeteo';
import { findExtrema, coefficientForDay } from '../lib/tideMath';
import { windStyle, tempStyle, waveStyle, degToCardinal, fmtNum } from '../lib/format';
import { cloudEmoji } from '../lib/weatherCode';
import WindArrow from './WindArrow';
import LiveWindBadge from './LiveWindBadge';
import TideChart from './TideChart';

const REF = SPOTS[0];

// Hourly columns: 8h–20h
const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8..20

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getSunset(weather: WeatherResponse, isoDate: string): string | null {
  const idx = weather.daily?.time.indexOf(isoDate);
  if (idx == null || idx < 0) return null;
  return weather.daily.sunset[idx].slice(11, 16).replace(':', 'h');
}

function idxFor(times: string[], date: string, hour: number): number {
  return times.indexOf(`${date}T${String(hour).padStart(2, '0')}:00`);
}

interface Props {
  onSelectSpot: (spot: Spot) => void;
}

export default function HomePage({ onSelectSpot }: Props) {
  const today = useMemo(todayISO, []);

  const weatherQ = useQuery({
    queryKey: ['weather', REF.lat, REF.lon],
    queryFn: () => fetchWeather(REF.lat, REF.lon, 7),
  });
  const marineQ = useQuery({
    queryKey: ['marine', REF.lat, REF.lon],
    queryFn: () => fetchMarine(REF.lat, REF.lon, 7),
  });

  const dateLabel = new Date(`${today}T12:00:00`).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const tideInfo = useMemo(() => {
    if (!marineQ.data) return null;
    const { time, sea_level_height_msl } = marineQ.data.hourly;
    const extrema = findExtrema(time, sea_level_height_msl);
    const todayExtrema = extrema.filter((e) => e.time.startsWith(today));
    const coef = coefficientForDay(time, sea_level_height_msl, today, REF.springRange);
    return { extrema: todayExtrema, coef };
  }, [marineQ.data, today]);

  const sunset = useMemo(() => {
    if (!weatherQ.data) return null;
    return getSunset(weatherQ.data, today);
  }, [weatherQ.data, today]);

  const loading = weatherQ.isLoading || marineQ.isLoading;
  const wt = weatherQ.data?.hourly;
  const mt = marineQ.data?.hourly;

  // Column indices into hourly arrays for each display hour
  const cols = HOURS.map((h) => ({
    hour: h,
    iW: wt ? idxFor(wt.time, today, h) : -1,
    iM: mt ? idxFor(mt.time, today, h) : -1,
  }));

  // Shared label column width
  const LABEL_W = 'w-28 min-w-[7rem]';

  return (
    <div className="space-y-5">
      {/* Date + tide header */}
      <div className="flex items-baseline gap-4">
        <h2 className="text-2xl font-bold capitalize">{dateLabel}</h2>
        {loading && <span className="text-sm text-slate-400">Chargement…</span>}
      </div>

      {/* Tide info strip */}
      <div className="flex flex-wrap items-center gap-3 bg-slate-900/60 border border-slate-800 rounded-lg px-4 py-3 text-sm">
        <span className="text-slate-400 text-xs uppercase tracking-wider mr-1">Rivedoux</span>
        {tideInfo ? (
          <>
            {tideInfo.coef !== null && (
              <span className="px-2.5 py-0.5 rounded font-bold text-xs text-amber-900 bg-amber-400">
                Coef {tideInfo.coef}
              </span>
            )}
            {tideInfo.extrema.map((e) => {
              const hm = e.time.slice(11, 16).replace(':', 'h');
              const isPM = e.kind === 'PM';
              return (
                <span key={e.index} className={`px-2 py-0.5 rounded text-xs font-medium ${isPM ? 'bg-emerald-900/60 text-emerald-300' : 'bg-cyan-900/60 text-cyan-300'}`}>
                  {hm} {e.kind} · {fmtNum(e.height, 1)}m
                </span>
              );
            })}
          </>
        ) : <span className="text-slate-500 text-xs">Marées —</span>}
        {sunset
          ? <span className="ml-auto flex items-center gap-1 text-orange-300 text-sm"><span>🌇</span><span className="font-medium">{sunset}</span></span>
          : <span className="ml-auto text-slate-500">🌇 —</span>}
      </div>

      {/* Unified table */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-lg overflow-x-auto">
        <table className="text-slate-100 border-separate border-spacing-0 text-xs" style={{ minWidth: '700px', width: '100%' }}>
          <thead>
            <tr>
              <th className={`${LABEL_W} text-left font-normal text-slate-500 pl-3 pr-2 pb-2 pt-3`}></th>
              {HOURS.map((h) => (
                <th key={h} className="text-[11px] font-semibold text-slate-300 pb-2 pt-3 text-center" style={{ minWidth: '38px' }}>
                  {String(h).padStart(2, '0')}h
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={`[&_tr>td:first-child]:pl-3 [&_tr>td:first-child]:pr-2 [&_tr>td:first-child]:text-left [&_tr>td:first-child]:whitespace-nowrap [&_tr>td:first-child]:${LABEL_W}`}>

            {/* ── SHARED ROWS ── */}
            {/* Tide chart spanning all columns */}
            {mt && (
              <tr>
                <td className="py-1 text-slate-400">Marée</td>
                <td colSpan={HOURS.length} className="p-0">
                  <div className="text-slate-300">
                    <TideChart
                      times={mt.time}
                      heights={mt.sea_level_height_msl}
                      date={today}
                      hours={HOURS}
                      colWidth={40}
                      context={2}
                      svgHeight={80}
                    />
                  </div>
                </td>
              </tr>
            )}

            {/* Nuages */}
            {wt && (
              <tr className="border-t border-slate-800/60">
                <td className="py-1 text-slate-400">Nuages</td>
                {cols.map(({ hour, iW }) => (
                  <td key={hour} className="px-0.5 py-1 text-center">
                    {iW >= 0 ? <span className="text-lg" title={`${Math.round(wt.cloud_cover[iW])}%`}>{cloudEmoji(wt.cloud_cover[iW])}</span> : '—'}
                  </td>
                ))}
              </tr>
            )}

            {/* Température */}
            {wt && (
              <tr>
                <td className="py-0 text-slate-400">Temp (°C)</td>
                {cols.map(({ hour, iW }) => {
                  if (iW < 0) return <td key={hour} />;
                  const st = tempStyle(wt.temperature_2m[iW]);
                  return (
                    <td key={hour} className="align-bottom p-0 bg-slate-800/60">
                      <div className="relative h-8 overflow-hidden">
                        <div
                          className="absolute bottom-0 left-0 right-0 flex items-start justify-center pt-0.5 text-[10px] font-semibold leading-none text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.7)]"
                          style={{ height: `${st.heightPct}%`, backgroundColor: st.backgroundColor }}
                        >
                          {fmtNum(wt.temperature_2m[iW], 0)}
                        </div>
                      </div>
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
                cols={cols}
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

interface ColSpec { hour: number; iW: number; iM: number; }

// Simpler typed version
function SpotRows({ spot, cols, wt, mt, onSelect }: {
  spot: Spot;
  cols: ColSpec[];
  wt: { time: string[]; wind_direction_10m: number[]; wind_speed_10m: number[]; wind_gusts_10m: number[] } | undefined;
  mt: { time: string[]; wave_height: number[]; wave_period: number[] } | undefined;
  onSelect: () => void;
}) {
  const N = cols.length;

  return (
    <>
      {/* Spot header row */}
      <tr className="border-t-2 border-slate-700">
        <td colSpan={N + 1} className="py-0">
          <div className="flex items-center gap-3 px-0 py-2">
            <button
              onClick={onSelect}
              className="font-semibold text-slate-100 hover:underline focus:outline-none text-sm"
            >
              {spot.name}
            </button>
            <span className="text-slate-600 text-xs">→ Détail</span>
            {spot.liveWind && (
              <div className="ml-2">
                <LiveWindBadge source={spot.liveWind} stationName={spot.name} />
              </div>
            )}
          </div>
        </td>
      </tr>

      {/* Direction */}
      {wt && (
        <tr>
          <td className="py-1 text-slate-400">Dir. vent</td>
          {cols.map(({ hour, iW }) => (
            <td key={hour} className="text-center py-0.5">
              {iW >= 0 ? (
                <div className="flex flex-col items-center">
                  <WindArrow deg={wt.wind_direction_10m[iW]} className="text-slate-200" size={14} />
                  <span className="text-[9px] text-slate-500">{degToCardinal(wt.wind_direction_10m[iW])}</span>
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
          {cols.map(({ hour, iW }) => {
            if (iW < 0) return <td key={hour} />;
            const v = wt.wind_speed_10m[iW];
            const st = windStyle(v);
            const h = Math.max(20, Math.min(100, (v / 40) * 100));
            return (
              <td key={hour} className="align-bottom p-0 bg-slate-800/60">
                <div className="relative h-8 overflow-hidden">
                  <div
                    className="absolute bottom-0 left-0 right-0 flex items-start justify-center pt-0.5 text-[10px] font-semibold leading-none text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.7)]"
                    style={{ height: `${h}%`, backgroundColor: st.backgroundColor }}
                  >
                    {fmtNum(v, 0)}
                  </div>
                </div>
              </td>
            );
          })}
        </tr>
      )}

      {/* Rafale */}
      {wt && (
        <tr>
          <td className="py-0 text-slate-400">Rafale (kts)</td>
          {cols.map(({ hour, iW }) => {
            if (iW < 0) return <td key={hour} />;
            const v = wt.wind_gusts_10m[iW];
            const st = windStyle(v);
            const h = Math.max(20, Math.min(100, (v / 40) * 100));
            return (
              <td key={hour} className="align-bottom p-0 bg-slate-800/60">
                <div className="relative h-8 overflow-hidden">
                  <div
                    className="absolute bottom-0 left-0 right-0 flex items-start justify-center pt-0.5 text-[10px] font-semibold leading-none text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.7)]"
                    style={{ height: `${h}%`, backgroundColor: st.backgroundColor }}
                  >
                    {fmtNum(v, 0)}
                  </div>
                </div>
              </td>
            );
          })}
        </tr>
      )}

      {/* Vagues */}
      {mt && (
        <tr>
          <td className="py-0 text-cyan-300/70">Vagues (m)</td>
          {cols.map(({ hour, iM }) => {
            if (iM < 0) return <td key={hour} />;
            const v = mt.wave_height[iM];
            const st = waveStyle(v);
            const label = fmtNum(v, 1);
            const short = st.heightPct < 35;
            return (
              <td key={hour} className="align-bottom p-0 bg-slate-800/60">
                <div className="relative h-8 overflow-hidden">
                  {short && (
                    <div className="absolute top-0 left-0 right-0 flex justify-center text-[10px] font-semibold text-slate-200 pt-0.5">
                      {label}
                    </div>
                  )}
                  <div
                    className="absolute bottom-0 left-0 right-0 flex items-start justify-center pt-0.5 text-[10px] font-semibold leading-none text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.7)]"
                    style={{ height: `${st.heightPct}%`, backgroundColor: st.backgroundColor }}
                  >
                    {!short && label}
                  </div>
                </div>
              </td>
            );
          })}
        </tr>
      )}

      {/* Période */}
      {mt && (
        <tr>
          <td className="py-1 pb-2 text-slate-400">Période (s)</td>
          {cols.map(({ hour, iM }) => (
            <td key={hour} className="text-center py-1 text-slate-300">
              {iM >= 0 && Number.isFinite(mt.wave_period[iM]) ? `${fmtNum(mt.wave_period[iM], 0)}s` : '—'}
            </td>
          ))}
        </tr>
      )}
    </>
  );
}
