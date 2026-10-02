export type LiveWindSource =
  | { type: 'weameter'; url: string; credit: { name: string; href: string } }
  | { type: 'clientraw'; url: string; credit: { name: string; href: string } };

export interface Spot {
  slug: string;
  name: string;
  lat: number;
  lon: number;
  springRange: number;
  /** Direction the spot faces (toward the sea), in degrees. Used to detect offshore wind. */
  facingDeg: number;
  liveWind?: LiveWindSource;
}

// Charente-Maritime spots. Tidal reference port for all of them:
// La Rochelle-Pallice, mean spring range ≈ 6.0 m.
export const SPOTS: Spot[] = [
  {
    slug: 'rivedoux-nord',
    name: 'Rivedoux Nord (Île de Ré)',
    lat: 46.1690,
    lon: -1.2650,
    springRange: 6.0,
    facingDeg: 0,    // N — faces the sea to the north
  },
  {
    slug: 'rivedoux-sud',
    name: 'Rivedoux Sud (Île de Ré)',
    lat: 46.1555,
    lon: -1.2780,
    springRange: 6.0,
    facingDeg: 180,  // S
  },
  {
    slug: 'chatelaillon',
    name: 'Châtelaillon-Plage',
    lat: 46.0729,
    lon: -1.0885,
    springRange: 6.0,
    facingDeg: 270,  // W
  },
  {
    slug: 'aytre',
    name: 'Aytré',
    lat: 46.1342,
    lon: -1.1183,
    springRange: 6.0,
    facingDeg: 270,  // W
  },
];
