import type { WeatherResponse, MarineResponse } from '../api/openMeteo';
import type { Spot } from '../data/spots';
import {
  findExtrema,
  coefficientForDay,
  extremaBySlot,
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

  // Map each extremum to the single closest column slot, so each PM/BM
  // event is labelled once (not repeated across ±N surrounding hours).
  const slotByExtremum = extremaBySlot(extrema, slots.map((s) => s.iM));

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
    <div className="overflow-x-auto">
      <table className="w-full text-slate-100 border-separate border-spacing-0 text-xs">
        <thead>
          <tr>
            <th className="text-left text-lg font-bold pb-3 pr-3 align-bottom whitespace-nowrap">{heading}</th>
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

          <tr>
            <td className="py-2 text-sm font-medium text-amber-200">Coef marée</td>
            {slots.map((s) => (
              <td
                key={s.hour}
                className="text-center text-xs font-semibold bg-amber-900/60 text-amber-100"
              >
                {coef ?? '—'}
              </td>
            ))}
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
              return (
                <td key={s.hour} className="align-bottom p-0 m-0 bg-slate-800/60">
                  <div className="relative h-10 w-full overflow-hidden">
                    <div
                      className="absolute bottom-0 left-0 right-0 flex items-start justify-center pt-0.5 text-[11px] font-semibold leading-none text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.7)]"
                      style={{ height: `${st.heightPct}%`, backgroundColor: st.backgroundColor }}
                    >
                      {fmtNum(h, 1)}
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

          <tr className="border-t border-slate-800">
            <td className="py-2 text-sm">Horaire</td>
            {slots.map((s) => {
              const e = slotByExtremum.get(s.iM);
              return cell(
                e ? (
                  <span className={e.kind === 'PM' ? 'text-emerald-300' : 'text-cyan-300'}>
                    {fmtHourMin(e.time)} {e.kind}
                  </span>
                ) : '—',
              );
            })}
          </tr>

        </tbody>
      </table>
    </div>
  );
}
