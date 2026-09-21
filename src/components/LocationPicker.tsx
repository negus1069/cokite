import { SPOTS, type Spot } from '../data/spots';
import { useEffect, useRef, useState } from 'react';
import { geocode, type GeocodeHit } from '../api/geocoding';

interface Props {
  value: Spot;
  onChange: (spot: Spot) => void;
}

export default function LocationPicker({ value, onChange }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodeHit[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current);
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    timer.current = window.setTimeout(async () => {
      try {
        setResults(await geocode(query));
        setOpen(true);
      } catch {
        setResults([]);
      }
    }, 300);
  }, [query]);

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm text-slate-400">Spot</label>
      <div className="flex flex-wrap gap-2">
        <select
          className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
          value={value.slug}
          onChange={(e) => {
            const s = SPOTS.find((x) => x.slug === e.target.value);
            if (s) onChange(s);
          }}
        >
          {SPOTS.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.name}
            </option>
          ))}
        </select>
        <div className="relative">
          <input
            className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm w-64"
            placeholder="Chercher une ville / plage…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
          />
          {open && results.length > 0 && (
            <ul className="absolute z-10 mt-1 w-72 bg-slate-800 border border-slate-700 rounded shadow-lg max-h-64 overflow-auto">
              {results.map((r) => (
                <li
                  key={r.id}
                  className="px-3 py-2 text-sm hover:bg-slate-700 cursor-pointer"
                  onMouseDown={() => {
                    onChange({
                      slug: `custom-${r.id}`,
                      name: `${r.name}${r.admin1 ? ' — ' + r.admin1 : ''}${r.country ? ' (' + r.country + ')' : ''}`,
                      lat: r.latitude,
                      lon: r.longitude,
                      springRange: 6.0, // default; user can pick a preset for accuracy
                    });
                    setQuery('');
                    setResults([]);
                    setOpen(false);
                  }}
                >
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-slate-400">
                    {r.admin1 ? r.admin1 + ' — ' : ''}
                    {r.country ?? ''} · {r.latitude.toFixed(3)}, {r.longitude.toFixed(3)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
