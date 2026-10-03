import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SPOTS, type Spot } from '../data/spots';
import { fetchWeather, fetchMarine, type WeatherResponse } from '../api/openMeteo';
import { findExtrema, coefficientForDay } from '../lib/tideMath';
import { windStyle, tempStyle, waveStyle, periodStyle, degToCardinal, fmtNum } from '../lib/format';
import { cloudIcon } from '../lib/weatherCode';
import WindArrow from './WindArrow';
import LiveWindCard from './LiveWindCard';
import SessionCards from './SessionCards';
import TideChart from './TideChart';
import WeatherIcon from './WeatherIcon';

const REF = SPOTS[0];

// Hourly columns: 8h–20h
const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 7..21

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

  const currentHour = useMemo(() => new Date().getHours(), []);

  // All columns across days, starting from current hour on today
  const allCols: ColSpec[] = useMemo(() =>
    days.flatMap((d) =>
      HOURS.filter((h) => d !== today || h >= currentHour).map((h) => ({
        hour: h,
        date: d,
        iW: wt ? idxFor(wt.time, d, h) : -1,
        iM: mt ? idxFor(mt.time, d, h) : -1,
      }))
    ),
    [days, wt, mt, today, currentHour]
  );

  // Shared label column width
  const LABEL_W = 'sticky left-0 z-10 sticky-label-col';
  const totalDataCols = allCols.length;

  return (
    <div className="space-y-5">
      {/* Hero card */}
      <div className="relative rounded-2xl overflow-hidden shadow-md h-40">
        <img
          src={`${import.meta.env.BASE_URL}hero.png`}
          alt="Cokite Forecast"
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <div className="absolute bottom-4 left-5">
          <div className="text-white font-black text-2xl tracking-tight drop-shadow">Cokite Forecast</div>
        </div>
      </div>

      {/* Date + sun card header */}
      <div className="flex flex-col gap-3">
        <h2 className="text-2xl font-bold capitalize">{dateLabel}</h2>
        <div className="flex items-center gap-4 flex-wrap">
          {(sunrise || sunset) && (
            <div className="flex items-center gap-px rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white">
              {sunrise && (
                <div className="flex items-center gap-2.5 px-4 py-2.5">
                  <SunWidget type="rise" time={sunrise} />
                </div>
              )}
              {sunrise && sunset && <div className="w-px self-stretch bg-slate-200" />}
              {sunset && (
                <div className="flex items-center gap-2.5 px-4 py-2.5">
                  <SunWidget type="set" time={sunset} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Live wind cards */}
        {SPOTS.some(s => s.liveWind) && (
          <div className="flex flex-wrap gap-4">
            {SPOTS.filter(s => s.liveWind).map(s => (
              <LiveWindCard key={s.slug} source={s.liveWind!} stationName={s.name} />
            ))}
          </div>
        )}
      </div>
      {loading && <span className="text-sm text-slate-400">Chargement…</span>}

      {/* Session forecast cards */}
      {weatherQ.data && marineQ.data && (
        <SessionCards weather={weatherQ.data} marine={marineQ.data} spots={SPOTS} />
      )}

      {/* Unified table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-x-auto">
        <table className="text-slate-100 border-collapse text-xs bg-slate-900" style={{ minWidth: `${7 * 16 + totalDataCols * COL_W}px`, width: '100%' }}>
          <thead>
            {/* Day header row */}
            <tr>
              <th className={`${LABEL_W} sticky left-0 z-10 sticky-label-col`}></th>
              {days.map((d, di) => {
                const span = allCols.filter(c => c.date === d).length;
                if (span === 0) return null;
                return (
                  <th
                    key={d}
                    colSpan={span}
                    className={`text-[11px] font-bold text-slate-300 pb-1 pt-2 text-left pl-1 capitalize${di > 0 ? ' border-l border-slate-700/50' : ''}`}
                  >
                    {shortDateLabel(d)}
                  </th>
                );
              })}
            </tr>
            {/* Hour row */}
            <tr>
              <th className={`${LABEL_W} text-left font-normal text-slate-500 pl-3 pr-2 pb-2 sticky left-0 z-10 sticky-label-col`}></th>
              {allCols.map(({ date, hour }, ci) => (
                <th
                  key={`${date}-${hour}`}
                  className={`text-[11px] font-semibold text-slate-300 pb-2 text-left pl-1${ci > 0 && allCols[ci-1].date !== date ? ' border-l border-slate-700/50' : ''}`}
                  style={{ minWidth: `${COL_W}px` }}
                >
                  {String(hour).padStart(2, '0')}h
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="[&_tr>td:first-child]:pl-1 [&_tr>td:first-child]:pr-0 [&_tr>td:first-child]:text-left [&_tr>td:first-child]:text-[10px] [&_tr>td:first-child]:leading-tight [&_tr>td:first-child]:sticky [&_tr>td:first-child]:left-0 [&_tr>td:first-child]:z-10 [&_tr>td:first-child]:sticky-label-col">

            {/* ── SHARED ROWS ── */}
            {/* Nuages */}
            {wt && (
              <tr className="border-t border-slate-800/60">
                <td className="py-1 text-slate-400">Nuages</td>
                {allCols.map(({ hour, date, iW }, ci) => (
                  <td key={`${date}-${hour}`} className={`px-0.5 py-1 text-center${ci % HOURS.length === 0 && ci > 0 ? ' border-l border-slate-700/50' : ''}`}>
                    {iW >= 0 ? <WeatherIcon icon={cloudIcon(wt.cloud_cover[iW])} label={`${Math.round(wt.cloud_cover[iW])}%`} size={20} /> : '—'}
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

            {/* Pluie */}
            {wt && (
              <tr>
                <td className="py-0 text-slate-400">Pluie (mm)</td>
                {allCols.map(({ hour, date, iW }, ci) => {
                  const borderClass = ci % HOURS.length === 0 && ci > 0 ? ' border-l border-slate-700/50' : '';
                  if (iW < 0) return <td key={`${date}-${hour}`} className={borderClass} />;
                  const v = wt.precipitation[iW];
                  const bg = v <= 0 ? 'transparent' : v < 1 ? 'hsl(210 60% 85%)' : v < 3 ? 'hsl(210 70% 65%)' : 'hsl(210 80% 45%)';
                  const color = v >= 3 ? '#fff' : '#1e293b';
                  return (
                    <td key={`${date}-${hour}`} className={`p-0 text-center text-[10px] font-semibold${borderClass}`} style={{ backgroundColor: bg, color }}>
                      <div className="py-1">{v > 0 ? fmtNum(v, 1) : ''}</div>
                    </td>
                  );
                })}
              </tr>
            )}

            {/* Tide charts — one per day */}
            {mt && (
              <tr>
                <td className="py-1 text-slate-400">
                  <div className="flex flex-col gap-0.5">
                    <span>Marée</span>
                    {tideInfoByDay[today]?.coef != null && (
                      <span className="px-1.5 py-0.5 rounded font-bold text-[10px] text-amber-900 bg-amber-400 whitespace-nowrap w-fit">
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
                      svgHeight={70}
                    />
                  </td>
                ))}
              </tr>
            )}

            {/* ── PER-SPOT ROWS ── */}
            {SPOTS.map((spot) => (
              <SpotRows
                key={spot.slug}
                spot={spot}
                allCols={allCols}
                hours={HOURS}
                days={days}
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
function SpotRows({ spot, allCols, hours, days, wt, mt, onSelect }: {
  spot: Spot;
  allCols: ColSpec[];
  hours: number[];
  days: string[];
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
      <tr className="border-t-2 border-slate-700 sticky top-0 z-20 spot-title-row">
        {/* Sticky label cell: spot name */}
        <td className={`pt-3 pb-0 pl-3 pr-2 sticky left-0 z-30 bg-slate-900 whitespace-nowrap !w-36 !min-w-[9rem]`}>
          <div className="flex items-center gap-1.5 py-2">
            <button
              onClick={onSelect}
              className="font-semibold text-slate-100 hover:underline focus:outline-none text-sm"
            >
              {spot.name}
            </button>
            <WindArrow deg={(facingDeg + 180) % 360} className="text-slate-400" size={14} />
          </div>
        </td>
        {/* Remaining columns */}
        <td colSpan={N} className="pt-3 pb-0 bg-slate-900" />
      </tr>

      {/* Day sub-header row */}
      <tr className="sticky top-[2.5rem] z-20">
        <td className="sticky left-0 z-30 bg-slate-900" />
        {days.map((d, di) => {
          const span = allCols.filter(c => c.date === d).length;
          if (span === 0) return null;
          return (
            <td
              key={`day-${d}`}
              colSpan={span}
              className={`text-[11px] font-bold text-slate-300 text-left pl-1 pt-1 bg-slate-900 capitalize${di > 0 ? ' border-l border-slate-700/50' : ''}`}
            >
              {shortDateLabel(d)}
            </td>
          );
        })}
      </tr>

      {/* Hour sub-header row */}
      <tr className="sticky top-[4rem] z-20">
        <td className="sticky left-0 z-30 bg-slate-900" />
        {allCols.map(({ hour, date }, ci) => (
          <td
            key={`h-${date}-${hour}`}
            className={`text-[11px] font-semibold text-slate-400 text-left pl-1 pb-1 bg-slate-900${ci % hours.length === 0 && ci > 0 ? ' border-l border-slate-700/50' : ''}`}
          >
            {String(hour).padStart(2, '0')}h
          </td>
        ))}
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
                      <WindArrow deg={deg} className={off ? 'text-red-500' : 'text-slate-500'} size={16} />
                      <span className={`text-[8px] ${off ? 'text-red-400' : 'text-slate-500'}`}>{degToCardinal(deg)}</span>
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
            const v = Math.round(wt.wind_speed_10m[iW]);
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
            const v = Math.round(wt.wind_gusts_10m[iW]);
            const st = windStyle(v, 0.80);
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
                  <WindArrow deg={mt.wave_direction[iM]} className="text-cyan-400" size={16} />
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
    <div className="flex items-center gap-2.5">
      <div className="relative">
        <img
          src={`${import.meta.env.BASE_URL}icons/${isRise ? 'sunny' : 'night'}.svg`}
          alt=""
          width={32}
          height={32}
          style={{ display: 'block' }}
        />
        <span className="absolute -bottom-1 -right-1 text-[10px] font-bold text-slate-500 leading-none">
          {isRise ? '↑' : '↓'}
        </span>
      </div>
      <div className="leading-tight">
        <div className="text-[11px] text-slate-400 uppercase tracking-wide">{isRise ? 'Lever' : 'Coucher'}</div>
        <div className="font-semibold text-slate-700 text-sm">{time}</div>
      </div>
    </div>
  );
}
