export type LiveWindSource =
  | { type: 'weameter'; url: string; credit: { name: string; href: string } }
  | { type: 'clientraw'; url: string; credit: { name: string; href: string } };

export interface Spot {
  slug: string;
  name: string;
  lat: number;
  lon: number;
  /**
   * Mean spring-tide range (m) at this location.
   * Used to approximate the SHOM-style tidal coefficient:
   *   coef ≈ 100 × (daily_range / springRange)
   */
  springRange: number;
  /** Optional live weather-station feed. */
  liveWind?: LiveWindSource;
}

// Live-station configurations. Adding a new station is one line here.
const RIVEDOUX_WEAMETER: LiveWindSource = {
  type: 'weameter',
  url: 'https://weameter.com/stations/ilederekitesurf/windrt.json',
  credit: {
    name: 'weameter.com · Île de Ré Kitesurf',
    href: 'https://weameter.com/stations/ilederekitesurf/windrt/',
  },
};

const CHATELAILLON_CLIENTRAW: LiveWindSource = {
  type: 'clientraw',
  url: 'https://www.meteolarochelle.fr/wdlchatel/clientraw.txt',
  credit: {
    name: 'meteo-la-rochelle.fr · Port Châtelaillon-Plage',
    href: 'https://www.meteo-la-rochelle.fr/live-chatelaillon.php',
  },
};

// Charente-Maritime spots. Tidal reference port for all of them:
// La Rochelle-Pallice, mean spring range ≈ 6.0 m.
export const SPOTS: Spot[] = [
  {
    slug: 'rivedoux-nord',
    name: 'Rivedoux Nord (Île de Ré)',
    lat: 46.1690,
    lon: -1.2650,
    springRange: 6.0,
    liveWind: RIVEDOUX_WEAMETER,
  },
  {
    slug: 'rivedoux-sud',
    name: 'Rivedoux Sud (Île de Ré)',
    lat: 46.1555,
    lon: -1.2780,
    springRange: 6.0,
  },
  {
    slug: 'chatelaillon',
    name: 'Châtelaillon-Plage',
    lat: 46.0729,
    lon: -1.0885,
    springRange: 6.0,
    liveWind: CHATELAILLON_CLIENTRAW,
  },
  {
    slug: 'aytre',
    name: 'Aytré',
    lat: 46.1342,
    lon: -1.1183,
    springRange: 6.0,
  },
];
