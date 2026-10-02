// WMO Weather interpretation codes → icon + French label + precipitation type
// https://open-meteo.com/en/docs (see "Weather variable documentation")

export interface WeatherInfo {
  icon: string;  // filename in /icons/ (without .svg)
  label: string;
  precip: string; // "Pluie", "Averses", "Neige", "", ...
}

export function weatherCodeInfo(code: number, isNight = false): WeatherInfo {
  const clearIcon = isNight ? 'night' : 'sunny';
  const partlyIcon = isNight ? 'cloudy' : 'partly-cloudy';
  switch (code) {
    case 0: return { icon: clearIcon,      label: 'Ciel clair', precip: '' };
    case 1: return { icon: clearIcon,      label: 'Ensoleillé', precip: '' };
    case 2: return { icon: partlyIcon,     label: 'Partiellement nuageux', precip: '' };
    case 3: return { icon: 'cloudy',       label: 'Couvert', precip: '' };
    case 45:
    case 48: return { icon: 'fog',         label: 'Brouillard', precip: '' };
    case 51:
    case 53:
    case 55: return { icon: 'drizzle',     label: 'Bruine', precip: 'Bruine' };
    case 56:
    case 57: return { icon: 'drizzle',     label: 'Bruine verglaçante', precip: 'Bruine verglaçante' };
    case 61:
    case 63:
    case 65: return { icon: 'rain',        label: 'Pluie', precip: 'Pluie' };
    case 66:
    case 67: return { icon: 'sleet',       label: 'Pluie verglaçante', precip: 'Pluie verglaçante' };
    case 71:
    case 73:
    case 75: return { icon: 'snow',        label: 'Neige', precip: 'Neige' };
    case 77: return { icon: 'snow',        label: 'Grains de neige', precip: 'Neige' };
    case 80:
    case 81:
    case 82: return { icon: 'rain',        label: 'Averses', precip: 'Averses' };
    case 85:
    case 86: return { icon: 'snow',        label: 'Averses de neige', precip: 'Neige' };
    case 95: return { icon: 'thunderstorm', label: 'Orage', precip: 'Orage' };
    case 96:
    case 99: return { icon: 'thunderstorm', label: 'Orage avec grêle', precip: 'Orage / grêle' };
    default: return { icon: 'cloudy',      label: `Code ${code}`, precip: '' };
  }
}

/** Rough day/night flag from a local ISO hour and month (approx sunrise/sunset). */
export function isNightHour(iso: string): boolean {
  const [, hm] = iso.split('T');
  const h = Number(hm.slice(0, 2));
  return h < 7 || h >= 21;
}

/** Icon name for cloud cover percentage. */
export function cloudIcon(pct: number, isNight = false): string {
  if (pct < 20) return isNight ? 'night' : 'sunny';
  if (pct < 60) return isNight ? 'cloudy' : 'partly-cloudy';
  return 'overcast';
}
