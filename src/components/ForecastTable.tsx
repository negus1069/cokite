import type { WeatherResponse, MarineResponse } from '../api/openMeteo';
import type { Spot } from '../data/spots';
import {
  findExtrema,
  coefficientForDay,
  type TideExtremum,
} from '../lib/tideMath';
import {
  degToCardinal,
  fmtHourMin,
  fmtNum,
  tempStyle,
  waveStyle,
  windStyle,
} from '../lib/format';
import { cloudEmoji, isNightHour } from '../lib/weatherCode';
import WindArrow from './WindArrow';
import TideChart from './TideChart';

interface Props {
  spot: Spot;
  date: string; // 'YYYY-MM-DD' in local tz
  weather: WeatherResponse;
  marine: MarineResponse;
}

const SLOT_HOURS = Array.from({ length: 17 }, (_, i) => i + 5); // 5..21

function indexFor(times: string[], date: string, hour: number): number {
  const target = `${date}T${String(hour).padStart(2, '0')}:00`;
  return times.indexOf(target);
}

function precip1h(precip: number[], i: number): number {
  if (i < 0) return 0;
  return precip[i] ?? 0;
}

export default function ForecastTable({ spot, date, weather, marine }: Props) {
  const wt = weather.hourly;
  const mt = marine.hourly;

  const slots = SLOT_HOURS.map((h) => ({
    hour: h,
    iW: indexFor(wt.time, date, h),
    iM: indexFor(mt.time, date, h),
  }));

  const extrema = findExtrema(mt.time, mt.sea_level_height_msl, 3);
  const coef = coefficientForDay(mt.time, mt.sea_level_height_msl, date, spot.springRange);

  // PM/BM events for this day only, sorted by time
  const todayExtrema: TideExtremum[] = extrema
    .filter((e) => e.time.startsWith(date))
    .sort((a, b) => a.index - b.index);

  const cell = (content: React.ReactNode, extra = '') => (
    <td className={`px-1 py-1.5 text-center text-xs ${extra}`}>{content}</td>
  );

  const heading = (() => {
    try {
      const d = new Date(`${date}T12:00:00`);
      return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' });
    } catch { return date; }
  })();

  return (
    <div>
      {/* Date heading + tide strip */}
      <div className="flex flex-wrap items-center gap-3 pb-3">
        <span className="text-lg font-bold whitespace-nowrap">{heading}</span>
        {coef !== null && (
          <span className="px-2 py-0.5 rounded font-bold text-xs text-amber-900 bg-amber-400">
            Coef {coef}
          </span>
        )}
        {todayExtrema.map((e) => {
          const isPM = e.kind === 'PM';
          return (
            <span
              key={e.index}
              className={`px-2 py-0.5 rounded text-xs font-medium ${isPM ? 'bg-emerald-900/60 text-emerald-300' : 'bg-cyan-900/60 text-cyan-300'}`}
            >
              {fmtHourMin(e.time)} {e.kind} · {fmtNum(e.height, 1)}m
            </span>
          );
        })}
      </div>

      <div className="mb-2 rounded overflow-hidden border border-slate-800/60 text-slate-300">
        <TideChart
          times={mt.time}
          heights={mt.sea_level_height_msl}
          date={date}
          hours={SLOT_HOURS}
          colWidth={40}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-slate-100 border-separate border-spacing-0 text-xs">
          <thead>
            <tr>
              <th className="text-left font-normal pb-3 pr-3 align-bottom whitespace-nowrap"></th>
              {slots.map((s) => (
                <th key={s.hour} className="text-[11px] font-medium text-slate-300 pb-3 min-w-[38px]">
                  {String(s.hour).padStart(2, '0')}h
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="[&_tr>td:first-child]:text-slate-300 [&_tr>td:first-child]:pr-3 [&_tr>td:first-child]:text-left [&_tr>td:first-child]:whitespace-nowrap">
            <tr className="border-t border-slate-800">
              <td className="py-2 text-sm">Direction du vent</td>
              {slots.map((s) => {
                const deg = wt.wind_direction_10m[s.iW];
                return (
                  <td key={s.hour} className="text-center">
                    <div className="flex flex-col items-center">
                      <WindArrow deg={deg} className="text-slate-200" />
                      <span className="text-[10px] text-slate-400 mt-0.5">{degToCardinal(deg)}</span>
                    </div>
                  </td>
                );
              })}
            </tr>

            <tr>
              <td className="py-2 text-sm">Vitesse du vent (kts)</td>
              {slots.map((s) => {
                const v = wt.wind_speed_10m[s.iW];
                const st = windStyle(v);
                const h = Math.max(20, Math.min(100, (v / 40) * 100));
                return (
                  <td key={s.hour} className="align-bottom p-0 m-0 bg-slate-800/60">
                    <div className="relative h-10 w-full overflow-hidden">
                      <div
                        className="absolute bottom-0 left-0 right-0 flex items-start justify-center pt-0.5 text-[11px] font-semibold leading-none text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.7)]"
                        style={{ height: `${h}%`, backgroundColor: st.backgroundColor }}
                      >
                        {fmtNum(v, 0)}
                      </div>
                    </div>
                  </td>
                );
              })}
            </tr>

            <tr>
              <td className="py-2 text-sm">Rafale (max kts)</td>
              {slots.map((s) => {
                const v = wt.wind_gusts_10m[s.iW];
                const st = windStyle(v);
                const h = Math.max(20, Math.min(100, (v / 40) * 100));
                return (
                  <td key={s.hour} className="align-bottom p-0 m-0 bg-slate-800/60">
                    <div className="relative h-10 w-full overflow-hidden">
                      <div
                        className="absolute bottom-0 left-0 right-0 flex items-start justify-center pt-0.5 text-[11px] font-semibold leading-none text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.7)]"
                        style={{ height: `${h}%`, backgroundColor: st.backgroundColor }}
                      >
                        {fmtNum(v, 0)}
                      </div>
                    </div>
                  </td>
                );
              })}
            </tr>

            <tr>
              <td className="py-2 text-sm">Couverture nuageuse</td>
              {slots.map((s) => {
                const c = wt.cloud_cover[s.iW];
                const night = isNightHour(wt.time[s.iW]);
                return cell(
                  <span title={`${Math.round(c)} %`} className="text-xl">
                    {cloudEmoji(c, night)}
                  </span>,
                );
              })}
            </tr>

            <tr>
              <td className="py-2 text-sm">Précipitations (mm/h)</td>
              {slots.map((s) => cell(fmtNum(precip1h(wt.precipitation, s.iW), 1)))}
            </tr>

            <tr>
              <td className="py-2 text-sm">Température (°C)</td>
              {slots.map((s) => {
                const t = wt.temperature_2m[s.iW];
                const st = tempStyle(t);
                return (
                  <td key={s.hour} className="align-bottom p-0 m-0 bg-slate-800/60">
                    <div className="relative h-10 w-full overflow-hidden">
                      <div
                        className="absolute bottom-0 left-0 right-0 flex items-start justify-center pt-0.5 text-[11px] font-semibold leading-none text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.7)]"
                        style={{ height: `${st.heightPct}%`, backgroundColor: st.backgroundColor }}
                      >
                        {fmtNum(t, 0)}
                      </div>
                    </div>
                  </td>
                );
              })}
            </tr>

            <tr className="border-t border-slate-800">
              <td className="py-2 text-sm">Direction des vagues</td>
              {slots.map((s) => {
                const deg = mt.wave_direction[s.iM];
                return (
                  <td key={s.hour} className="text-center">
                    <div className="flex flex-col items-center">
                      <WindArrow deg={deg} className="text-cyan-300" />
                      <span className="text-[10px] text-slate-400 mt-0.5">{degToCardinal(deg)}</span>
                    </div>
                  </td>
                );
              })}
            </tr>

            <tr>
              <td className="py-2 text-sm font-medium text-cyan-200">Hauteur des vagues (m)</td>
              {slots.map((s) => {
                const h = mt.wave_height[s.iM];
                const st = waveStyle(h);
                const label = fmtNum(h, 1);
                const short = st.heightPct < 35;
                return (
                  <td key={s.hour} className="align-bottom p-0 m-0 bg-slate-800/60">
                    <div className="relative h-10 w-full overflow-hidden">
                      {short && (
                        <div className="absolute top-0 left-0 right-0 flex justify-center text-[11px] font-semibold text-slate-200 pt-0.5">
                          {label}
                        </div>
                      )}
                      <div
                        className="absolute bottom-0 left-0 right-0 flex items-start justify-center pt-0.5 text-[11px] font-semibold leading-none text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.7)]"
                        style={{ height: `${st.heightPct}%`, backgroundColor: st.backgroundColor }}
                      >
                        {!short && label}
                      </div>
                    </div>
                  </td>
                );
              })}
            </tr>

            <tr>
              <td className="py-2 text-sm">Période de temps (s)</td>
              {slots.map((s) => cell(fmtNum(mt.wave_period[s.iM], 0)))}
            </tr>

          </tbody>
        </table>
      </div>
    </div>
  );
}
