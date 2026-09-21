export interface GeocodeHit {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
}

interface GeocodeResponse {
  results?: GeocodeHit[];
}

export async function geocode(query: string, lang = 'fr'): Promise<GeocodeHit[]> {
  if (!query || query.trim().length < 2) return [];
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    query,
  )}&count=5&language=${lang}&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Geocoding error: ${res.status}`);
  const data: GeocodeResponse = await res.json();
  return data.results ?? [];
}
