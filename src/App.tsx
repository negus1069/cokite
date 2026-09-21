import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SPOTS, type Spot } from './data/spots';
import { fetchMarine, fetchWeather } from './api/openMeteo';
import LocationPicker from './components/LocationPicker';
import DatePicker from './components/DatePicker';
import ForecastTable from './components/ForecastTable';
import RawDataPanel from './components/RawDataPanel';
import LiveWindBadge from './components/LiveWindBadge';

function todayISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function App() {
  const [spot, setSpot] = useState<Spot>(SPOTS[0]);
  const [date, setDate] = useState<string>(todayISO());

  const weatherQ = useQuery({
    queryKey: ['weather', spot.lat, spot.lon],
    queryFn: () => fetchWeather(spot.lat, spot.lon, 7),
  });
  const marineQ = useQuery({
    queryKey: ['marine', spot.lat, spot.lon],
    queryFn: () => fetchMarine(spot.lat, spot.lon, 7),
  });

  const minDate = todayISO();
  // We display date + next 2 days → keep 3 tables inside the 7-day forecast window.
  const maxDate = useMemo(() => addDaysISO(minDate, 4), [minDate]);

  const loading = weatherQ.isLoading || marineQ.isLoading;
  const error = weatherQ.error || marineQ.error;

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur">
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center gap-3">
          <span className="text-2xl">🪁</span>
          <h1 className="text-xl font-bold">Kite Forecast</h1>
          <span className="text-sm text-slate-400">
            — vent, vagues & marées, sourcé Open-Meteo
          </span>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-6 space-y-6">
        <section className="flex flex-wrap gap-6 items-end">
          <LocationPicker value={spot} onChange={setSpot} />
          <DatePicker value={date} onChange={setDate} min={minDate} max={maxDate} />
          <div className="text-sm text-slate-400">
            <div>{spot.name}</div>
            <div>
              {spot.lat.toFixed(4)}, {spot.lon.toFixed(4)} — marnage réf.{' '}
              {spot.springRange} m
            </div>
          </div>
          {spot.liveWind && (
            <div className="ml-auto">
              <LiveWindBadge source={spot.liveWind} stationName={spot.name} />
              <div className="text-[10px] text-slate-500 mt-1 text-right">
                source :{' '}
                <a
                  href={spot.liveWind.credit.href}
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-slate-300"
                >
                  {spot.liveWind.credit.name}
                </a>
              </div>
            </div>
          )}
        </section>

        {loading && (
          <div className="text-slate-400">Chargement des prévisions…</div>
        )}
        {error && (
          <div className="text-red-400">
            Erreur : {(error as Error).message}
          </div>
        )}

        {weatherQ.data && marineQ.data && (
          <>
            <div className="bg-slate-900/50 border border-slate-800 rounded-lg overflow-hidden divide-y divide-slate-800">
              {[0, 1, 2].map((offset) => {
                const d = addDaysISO(date, offset);
                return (
                  <section key={d} className="px-4 py-3">
                    <ForecastTable
                      spot={spot}
                      date={d}
                      weather={weatherQ.data!}
                      marine={marineQ.data!}
                    />
                  </section>
                );
              })}
            </div>

            <section className="grid md:grid-cols-2 gap-4">
              <RawDataPanel title="Open-Meteo Weather" data={weatherQ.data} />
              <RawDataPanel title="Open-Meteo Marine" data={marineQ.data} />
            </section>
          </>
        )}

        <footer className="text-xs text-slate-500 pt-4 border-t border-slate-800">
          Données brutes : <a className="underline" href="https://open-meteo.com" target="_blank" rel="noreferrer">Open-Meteo</a> · Coefficient de marée approximé à partir du marnage journalier (référence marnage vives-eaux configurable par spot dans <code>src/data/spots.ts</code>).
        </footer>
      </main>
    </div>
  );
}
