import type { WeatherResponse, MarineResponse } from '../api/openMeteo';
import type { Spot } from '../data/spots';
import { degToCardinal, fmtNum, windStyle, waveStyle } from '../lib/format';
import { findExtrema, coefficientForDay } from '../lib/tideMath';
import { weatherCodeInfo } from '../lib/weatherCode';
import WindArrow from './WindArrow';
import WeatherIcon from './WeatherIcon';

interface Props {
  weather: WeatherResponse;
  marine: MarineResponse;
  spots: Spot[];
}

interface KiteWindow {
  date: string;
  startHour: number;
  endHour: number;
  avgWindKts: number;
  avgGustKts: number;
  directionDeg: number;
  goodSpots: string[];
  weatherCode: number;
}

interface SurfWindow {
  date: string;
  startHour: number;
  endHour: number;
  avgWaveHeight: number;
  avgPeriod: number;
  waveDirDeg: number;
  windDirDeg: number;
}

function isOffshore(windDeg: number, facingDeg: number): boolean {
  const offshoreDeg = (facingDeg + 180) % 360;
  const diff = Math.abs(((windDeg - offshoreDeg + 540) % 360) - 180);
  return diff <= 90;
}

function angularDiff(a: number, b: number): number {
  return Math.abs(((a - b + 540) % 360) - 180);
}

function findKiteWindows(wt: WeatherResponse['hourly'], spots: Spot[]): KiteWindow[] {
  const windows: KiteWindow[] = [];
  const n = wt.time.length;
  let i = 0;

  while (i < n) {
    const speed = wt.wind_speed_10m[i];
    if (speed >= 13) {
      let j = i;
      while (j < n && wt.wind_speed_10m[j] >= 13) j++;
      const duration = j - i;
      if (duration >= 2) {
        const slice = Array.from({ length: j - i }, (_, k) => i + k);
        const avgSpeed = slice.reduce((s, k) => s + wt.wind_speed_10m[k], 0) / slice.length;
        const avgGust = slice.reduce((s, k) => s + wt.wind_gusts_10m[k], 0) / slice.length;
        const avgDir = slice.reduce((s, k) => s + wt.wind_direction_10m[k], 0) / slice.length;
        const midIdx = slice[Math.floor(slice.length / 2)];
        const weatherCode = wt.weather_code[midIdx];
        const date = wt.time[i].slice(0, 10);
        const startHour = Number(wt.time[i].slice(11, 13));
        const endHour = Number(wt.time[j - 1].slice(11, 13));
        const goodSpots = spots
          .filter(s => !isOffshore(avgDir, s.facingDeg))
          .map(s => s.name);
        windows.push({ date, startHour, endHour, avgWindKts: avgSpeed, avgGustKts: avgGust, directionDeg: avgDir, goodSpots, weatherCode });
      }
      i = j;
    } else {
      i++;
    }
  }
  return windows;
}

function findSurfWindows(mt: MarineResponse['hourly'], wt: WeatherResponse['hourly']): SurfWindow[] {
  const windows: SurfWindow[] = [];
  const n = mt.time.length;
  let i = 0;

  while (i < n) {
    const h = mt.wave_height[i];
    const p = mt.wave_period[i];
    const waveDir = mt.wave_direction[i];
    const windIdx = wt.time.indexOf(mt.time[i]);
    const windDir = windIdx >= 0 ? wt.wind_direction_10m[windIdx] : waveDir;
    const isOpposite = angularDiff(waveDir, windDir) > 90;

    if (h >= 0.8 && p >= 10 && isOpposite) {
      let j = i;
      while (j < n) {
        const hj = mt.wave_height[j];
        const pj = mt.wave_period[j];
        const wdj = mt.wave_direction[j];
        const wiIdx = wt.time.indexOf(mt.time[j]);
        const wij = wiIdx >= 0 ? wt.wind_direction_10m[wiIdx] : wdj;
        if (hj >= 0.8 && pj >= 10 && angularDiff(wdj, wij) > 90) j++;
        else break;
      }
      if (j - i >= 2) {
        const slice = Array.from({ length: j - i }, (_, k) => i + k);
        const avgH = slice.reduce((s, k) => s + mt.wave_height[k], 0) / slice.length;
        const avgP = slice.reduce((s, k) => s + mt.wave_period[k], 0) / slice.length;
        const avgWaveDir = slice.reduce((s, k) => s + mt.wave_direction[k], 0) / slice.length;
        const avgWindDir = slice.reduce((s, k) => {
          const wi = wt.time.indexOf(mt.time[k]);
          return s + (wi >= 0 ? wt.wind_direction_10m[wi] : 0);
        }, 0) / slice.length;
        windows.push({
          date: mt.time[i].slice(0, 10),
          startHour: Number(mt.time[i].slice(11, 13)),
          endHour: Number(mt.time[j - 1].slice(11, 13)),
          avgWaveHeight: avgH,
          avgPeriod: avgP,
          waveDirDeg: avgWaveDir,
          windDirDeg: avgWindDir,
        });
      }
      i = j;
    } else {
      i++;
    }
  }
  return windows;
}

function fmtDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
}

function fmtRange(start: number, end: number): string {
  return `${String(start).padStart(2, '0')}h – ${String(end).padStart(2, '0')}h`;
}

export default function SessionCards({ weather, marine, spots }: Props) {
  const kiteWindows = findKiteWindows(weather.hourly, spots);
  const surfWindows = findSurfWindows(marine.hourly, weather.hourly);

  const nextKite = kiteWindows[0] ?? null;
  const nextSurf = surfWindows[0] ?? null;

  const REF = spots[0];
  const tideExtrema = findExtrema(marine.hourly.time, marine.hourly.sea_level_height_msl);
  const tideCoef = nextKite
    ? coefficientForDay(marine.hourly.time, marine.hourly.sea_level_height_msl, nextKite.date, REF.springRange)
    : null;
  const tideDayExtrema = nextKite
    ? tideExtrema.filter(e => {
        if (!e.time.startsWith(nextKite.date)) return false;
        const h = Number(e.time.slice(11, 13));
        return h >= 7 && h <= 21;
      })
    : [];

  const kiteWeather = nextKite ? weatherCodeInfo(nextKite.weatherCode) : null;

  return (
    <div className="flex flex-wrap gap-4">
      {/* Kite card */}
      <div className="flex-1 min-w-[240px] bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="relative h-32 bg-slate-900 flex items-center justify-center overflow-hidden">
          <img
            src={`${import.meta.env.BASE_URL}kite-session.png`}
            alt="Kite session"
            className="w-full h-full object-cover object-center opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900/60" />
          <span className="absolute bottom-2 left-3 font-semibold text-white uppercase text-xs tracking-wide drop-shadow">Prochaine session kite</span>
        </div>
        <div className="p-4 flex flex-col gap-3">
        {nextKite ? (
          <>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="font-black text-slate-800 capitalize text-left">{fmtDate(nextKite.date)} — <span className="font-normal text-slate-400">{fmtRange(nextKite.startHour, nextKite.endHour)}</span></div>
              </div>
              {kiteWeather && (
                <div className="flex items-center gap-1.5">
                  <WeatherIcon icon={kiteWeather.icon} label={kiteWeather.label} size={28} />
                  <span className="text-xs text-slate-500">{kiteWeather.label}</span>
                </div>
              )}
            </div>
            {nextKite.goodSpots.length > 0 ? (
              <div className="text-xs text-slate-500">
                <span className="font-medium text-slate-600">Spots favorables : </span>
                {nextKite.goodSpots.join(', ')}
              </div>
            ) : (
              <div className="text-xs text-amber-600 font-medium">⚠ Vent de terre sur tous les spots</div>
            )}
            <div className="flex items-center gap-2">
              <span
                className="px-3 py-1 rounded-lg text-sm font-bold"
                style={windStyle(nextKite.avgWindKts)}
              >
                {fmtNum(nextKite.avgWindKts, 0)} kts
              </span>
              <span
                className="px-3 py-1 rounded-lg text-sm font-bold"
                style={windStyle(nextKite.avgGustKts, 0.80)}
              >
                ↑ {fmtNum(nextKite.avgGustKts, 0)} kts
              </span>
              <div className="flex items-center gap-1 ml-1">
                <WindArrow deg={nextKite.directionDeg} className="text-slate-600" size={18} />
                <span className="text-sm font-medium text-slate-600">{degToCardinal(nextKite.directionDeg)}</span>
              </div>
            </div>
            {/* Tide info */}
            <div className="flex items-center gap-2 flex-wrap">
              {tideCoef !== null && (
                <span className="px-2 py-0.5 rounded font-bold text-[11px] text-amber-900 bg-amber-400">
                  Coef {tideCoef}
                </span>
              )}
              {tideDayExtrema.map(e => (
                <span key={e.time} className="text-xs text-slate-500 flex items-center gap-0.5">
                  <span className={e.kind === 'PM' ? 'text-blue-500' : 'text-slate-400'}>
                    {e.kind === 'PM' ? '▲' : '▼'}
                  </span>
                  <span className="font-medium text-slate-600">{e.time.slice(11, 16).replace(':', 'h')}</span>
                  <span className="text-slate-400">({fmtNum(e.height, 1)}m)</span>
                </span>
              ))}
            </div>
          </>
        ) : (
          <div className="text-sm text-slate-400">Pas de session prévue dans les 10 jours</div>
        )}
        </div>
      </div>

      {/* Surf card */}
      <div className="flex-1 min-w-[240px] bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="relative h-32 bg-white flex items-center justify-center overflow-hidden">
          <img
            src={`${import.meta.env.BASE_URL}surf-session.png`}
            alt="Surf session"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-transparent to-slate-900/60" />
          <span className="absolute bottom-2 left-3 font-semibold text-white uppercase text-xs tracking-wide drop-shadow">Prochaine session surf</span>
        </div>
        <div className="p-4 flex flex-col gap-3">
        {nextSurf ? (
          <>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="font-black text-slate-800 capitalize text-left">{fmtDate(nextSurf.date)}</div>
                <div className="text-xs text-slate-400 text-left">{fmtRange(nextSurf.startHour, nextSurf.endHour)}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="px-3 py-1 rounded-lg text-sm font-bold"
                style={waveStyle(nextSurf.avgWaveHeight)}
              >
                {fmtNum(nextSurf.avgWaveHeight, 1)} m
              </span>
              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-lg font-medium">
                {fmtNum(nextSurf.avgPeriod, 0)}s période
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <WindArrow deg={nextSurf.waveDirDeg} className="text-cyan-500" size={12} />
                houle {degToCardinal(nextSurf.waveDirDeg)}
              </span>
              <span className="flex items-center gap-1">
                <WindArrow deg={nextSurf.windDirDeg} className="text-slate-400" size={12} />
                vent {degToCardinal(nextSurf.windDirDeg)}
              </span>
            </div>
          </>
        ) : (
          <div className="text-sm text-slate-400">Pas de session prévue dans les 10 jours</div>
        )}
        </div>
      </div>
    </div>
  );
}
