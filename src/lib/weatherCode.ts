// WMO Weather interpretation codes → emoji + French label + precipitation type
// https://open-meteo.com/en/docs (see "Weather variable documentation")

export interface WeatherInfo {
  emoji: string;
  label: string;
  precip: string; // "Pluie", "Averses", "Neige", "", ...
}

export function weatherCodeInfo(code: number, isNight = false): WeatherInfo {
  const clearSun = isNight ? '🌙' : '☀️';
  const partly = isNight ? '☁️' : '⛅';
  switch (code) {
    case 0: return { emoji: clearSun, label: 'Ciel clair', precip: '' };
    case 1: return { emoji: clearSun, label: 'Ensoleillé', precip: '' };
    case 2: return { emoji: partly,   label: 'Partiellement nuageux', precip: '' };
    case 3: return { emoji: '☁️',     label: 'Couvert', precip: '' };
    case 45:
    case 48: return { emoji: '🌫️', label: 'Brouillard', precip: '' };
    case 51:
    case 53:
    case 55: return { emoji: '🌦️', label: 'Bruine', precip: 'Bruine' };
    case 56:
    case 57: return { emoji: '🌧️', label: 'Bruine verglaçante', precip: 'Bruine verglaçante' };
    case 61:
    case 63:
    case 65: return { emoji: '🌧️', label: 'Pluie', precip: 'Pluie' };
    case 66:
    case 67: return { emoji: '🌧️', label: 'Pluie verglaçante', precip: 'Pluie verglaçante' };
    case 71:
    case 73:
    case 75: return { emoji: '❄️', label: 'Neige', precip: 'Neige' };
    case 77: return { emoji: '🌨️', label: 'Grains de neige', precip: 'Neige' };
    case 80:
    case 81:
    case 82: return { emoji: '🌦️', label: 'Averses', precip: 'Averses' };
    case 85:
    case 86: return { emoji: '🌨️', label: 'Averses de neige', precip: 'Neige' };
    case 95: return { emoji: '⛈️', label: 'Orage', precip: 'Orage' };
    case 96:
    case 99: return { emoji: '⛈️', label: 'Orage avec grêle', precip: 'Orage / grêle' };
    default: return { emoji: '❔', label: `Code ${code}`, precip: '' };
  }
}

/** Rough day/night flag from a local ISO hour and month (approx sunrise/sunset). */
export function isNightHour(iso: string): boolean {
  const [, hm] = iso.split('T');
  const h = Number(hm.slice(0, 2));
  return h < 7 || h >= 21;
}

/** Icon for cloud cover percentage. */
export function cloudEmoji(pct: number, isNight = false): string {
  if (pct < 20) return isNight ? '🌙' : '☀️';
  if (pct < 60) return isNight ? '☁️' : '⛅';
  return '☁️';
}
