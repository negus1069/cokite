// ---------- Types ----------

export interface WeatherHourly {
  time: string[];
  temperature_2m: number[];
  precipitation: number[];
  cloud_cover: number[];
  pressure_msl: number[];
  wind_speed_10m: number[];
  wind_gusts_10m: number[];
  wind_direction_10m: number[];
  weather_code: number[];
}

export interface WeatherDaily {
  time: string[];
  sunrise: string[];
  sunset: string[];
}

export interface MarineHourly {
  time: string[];
  wave_height: number[];
  wave_direction: number[];
  wave_period: number[];
  sea_level_height_msl: number[];
}

export interface WeatherResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  hourly_units: Record<string, string>;
  hourly: WeatherHourly;
  daily: WeatherDaily;
}

export interface MarineResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  hourly_units: Record<string, string>;
  hourly: MarineHourly;
}

// ---------- Fetchers ----------

const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast';
const MARINE_URL = 'https://marine-api.open-meteo.com/v1/marine';

export async function fetchWeather(lat: number, lon: number, days = 7): Promise<WeatherResponse> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    hourly: [
      'temperature_2m',
      'precipitation',
      'cloud_cover',
      'pressure_msl',
      'wind_speed_10m',
      'wind_gusts_10m',
      'wind_direction_10m',
      'weather_code',
    ].join(','),
    daily: 'sunrise,sunset',
    wind_speed_unit: 'kn',
    timezone: 'auto',
    forecast_days: String(days),
  });
  const res = await fetch(`${WEATHER_URL}?${params}`);
  if (!res.ok) throw new Error(`Weather API error: ${res.status}`);
  return res.json();
}

export async function fetchMarine(lat: number, lon: number, days = 7): Promise<MarineResponse> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    hourly: ['wave_height', 'wave_direction', 'wave_period', 'sea_level_height_msl'].join(','),
    timezone: 'auto',
    forecast_days: String(days),
  });
  const res = await fetch(`${MARINE_URL}?${params}`);
  if (!res.ok) throw new Error(`Marine API error: ${res.status}`);
  return res.json();
}
