export function degToCardinal(deg: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(((deg % 360) / 22.5)) % 16];
}

export function fmtNum(v: number | null | undefined, digits = 0): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return v.toFixed(digits);
}

/**
 * Continuous wind-speed gradient (knots) → inline style.
 *   0..12  kts : blue (hue 220 → 200)
 *  12..20  kts : green (hue 140 → 100)
 *  20..30  kts : orange (hue 40 → 20)
 *  30+     kts : red (hue 10 → 0)
 * Saturation & lightness are tuned so text stays readable on the dark UI.
 */
export function windStyle(kts: number): { backgroundColor: string; color: string } {
  const v = Number.isFinite(kts) ? Math.max(0, kts) : 0;
  let hue: number;
  let sat = 75;
  let light = 45;

  if (v <= 12) {
    // blue segment
    const t = v / 12;
    hue = 220 - 20 * t; // 220 → 200
    light = 38 + 12 * t; // 38 → 50 (get slightly brighter approaching 12)
  } else if (v <= 20) {
    const t = (v - 12) / 8;
    hue = 140 - 40 * t; // 140 → 100 (green → yellow-green)
    light = 42 + 6 * t;
  } else if (v <= 30) {
    const t = (v - 20) / 10;
    hue = 40 - 20 * t; // 40 → 20 (orange → deep orange)
    sat = 85;
    light = 48 - 2 * t;
  } else {
    const t = Math.min(1, (v - 30) / 20);
    hue = 10 - 10 * t; // 10 → 0 (red → pure red)
    sat = 85;
    light = 46 - 8 * t; // darken as it gets extreme
  }

  return {
    backgroundColor: `hsl(${hue.toFixed(0)} ${sat}% ${light.toFixed(0)}%)`,
    color: light < 55 ? '#fff' : '#0f172a', // white text on dark bg, slate-900 on light
  };
}

/** Tailwind classes for temperature (°C) heat map. */
export function tempColor(c: number): string {
  if (c < 0) return 'bg-blue-800 text-white';
  if (c < 8) return 'bg-blue-500 text-white';
  if (c < 15) return 'bg-cyan-500 text-white';
  if (c < 20) return 'bg-yellow-400 text-slate-900';
  if (c < 25) return 'bg-orange-500 text-white';
  if (c < 30) return 'bg-red-500 text-white';
  return 'bg-fuchsia-700 text-white';
}

/**
 * Continuous temperature gradient (°C) → inline style, matching windStyle().
 *   < 0°C   : deep blue
 *   0..10   : blue → cyan
 *  10..20   : cyan → yellow
 *  20..30   : yellow → orange
 *  30..40   : orange → red
 *   > 40    : deep red
 * Bar height is proportional to (t + 5) / 45.
 */
export function tempStyle(c: number): { backgroundColor: string; heightPct: number } {
  const v = Number.isFinite(c) ? c : 0;
  let hue: number;
  let sat = 78;
  let light = 48;

  if (v < 0) {
    hue = 220;
    light = 40;
  } else if (v <= 10) {
    const t = v / 10;
    hue = 210 - 30 * t; // 210 → 180 (blue → cyan)
    light = 42 + 4 * t;
  } else if (v <= 20) {
    const t = (v - 10) / 10;
    hue = 180 - 120 * t; // 180 → 60 (cyan → yellow)
    light = 46 + 4 * t;
  } else if (v <= 30) {
    const t = (v - 20) / 10;
    hue = 60 - 30 * t; // 60 → 30 (yellow → orange)
    sat = 85;
    light = 50 - 2 * t;
  } else {
    const t = Math.min(1, (v - 30) / 10);
    hue = 30 - 30 * t; // 30 → 0 (orange → red)
    sat = 85;
    light = 48 - 8 * t;
  }

  // Height: bar fills more as it gets warmer.
  // 0°C ≈ 10 %, 20°C ≈ 55 %, 40°C ≈ 100 %.
  const heightPct = Math.max(15, Math.min(100, ((v + 5) / 45) * 100));

  return {
    backgroundColor: `hsl(${hue.toFixed(0)} ${sat}% ${light.toFixed(0)}%)`,
    heightPct,
  };
}

/**
 * Continuous wave-height gradient (m) → inline style.
 *   0..1 m : cyan / teal (petite mer)
 *   1..2 m : green (mer vivable)
 *   2..3 m : orange (gros)
 *    >3 m  : red (très gros)
 * Bar height scales linearly, 0..4 m mapped to 0..100 %.
 */
export function waveStyle(m: number): { backgroundColor: string; heightPct: number } {
  const v = Number.isFinite(m) ? Math.max(0, m) : 0;
  let hue: number;
  let sat = 75;
  let light = 45;

  if (v <= 1) {
    const t = v / 1;
    hue = 195 - 15 * t; // 195 → 180 (cyan → teal)
    light = 42 + 6 * t;
  } else if (v <= 2) {
    const t = (v - 1) / 1;
    hue = 160 - 30 * t; // 160 → 130 (teal → green)
    light = 46 + 2 * t;
  } else if (v <= 3) {
    const t = (v - 2) / 1;
    hue = 45 - 15 * t; // 45 → 30 (yellow-orange → orange)
    sat = 85;
    light = 48 - 2 * t;
  } else {
    const t = Math.min(1, (v - 3) / 3);
    hue = 15 - 15 * t; // 15 → 0 (deep orange → red)
    sat = 85;
    light = 46 - 6 * t;
  }

  const heightPct = Math.max(15, Math.min(100, (v / 4) * 100));

  return {
    backgroundColor: `hsl(${hue.toFixed(0)} ${sat}% ${light.toFixed(0)}%)`,
    heightPct,
  };
}

/** Format a local ISO datetime ('2026-09-21T14:00') to 'HH'h'MM'. */
export function fmtHourMin(iso: string): string {
  const [, hm] = iso.split('T');
  const [h, m] = hm.split(':');
  return `${h}h${m}`;
}
