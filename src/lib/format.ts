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
  let sat = 70;
  let light = 80;

  if (v <= 12) {
    const t = v / 12;
    hue = 200 - 40 * t; // 200 → 160 (light blue → light green)
    light = 88 - 8 * t; // 88 → 80
  } else if (v <= 20) {
    const t = (v - 12) / 8;
    hue = 130 - 50 * t; // 130 → 80 (green → yellow-green)
    light = 80 - 10 * t; // 80 → 70
  } else if (v <= 30) {
    const t = (v - 20) / 10;
    hue = 50 - 20 * t; // 50 → 30 (yellow → orange)
    sat = 80;
    light = 72 - 12 * t; // 72 → 60
  } else {
    const t = Math.min(1, (v - 30) / 20);
    hue = 20 - 20 * t; // 20 → 0 (orange → red)
    sat = 80;
    light = 60 - 15 * t; // 60 → 45
  }

  return {
    backgroundColor: `hsl(${hue.toFixed(0)} ${sat}% ${light.toFixed(0)}%)`,
    color: light < 60 ? '#fff' : '#1e293b',
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
  let sat = 65;
  let light = 80;

  if (v < 0) {
    hue = 220; light = 75;
  } else if (v <= 10) {
    const t = v / 10;
    hue = 210 - 30 * t; // 210 → 180
    light = 80 + 5 * t;  // 80 → 85
  } else if (v <= 20) {
    const t = (v - 10) / 10;
    hue = 180 - 120 * t; // 180 → 60 (cyan → yellow)
    light = 85 - 5 * t;  // 85 → 80
  } else if (v <= 30) {
    const t = (v - 20) / 10;
    hue = 60 - 30 * t;   // 60 → 30 (yellow → orange)
    sat = 75;
    light = 78 - 15 * t; // 78 → 63
  } else {
    const t = Math.min(1, (v - 30) / 10);
    hue = 30 - 30 * t;
    sat = 75;
    light = 63 - 18 * t; // 63 → 45
  }

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
  let sat = 65;
  let light = 82;

  if (v <= 1) {
    const t = v / 1;
    hue = 195 - 15 * t; // 195 → 180 (light cyan → light teal)
    light = 88 - 6 * t; // 88 → 82
  } else if (v <= 2) {
    const t = (v - 1) / 1;
    hue = 160 - 30 * t; // 160 → 130 (teal → green)
    light = 82 - 8 * t; // 82 → 74
  } else if (v <= 3) {
    const t = (v - 2) / 1;
    hue = 45 - 15 * t;  // 45 → 30 (yellow-orange → orange)
    sat = 75;
    light = 74 - 14 * t; // 74 → 60
  } else {
    const t = Math.min(1, (v - 3) / 3);
    hue = 15 - 15 * t;
    sat = 75;
    light = 60 - 15 * t; // 60 → 45
  }

  const heightPct = Math.max(15, Math.min(100, (v / 4) * 100));
  return {
    backgroundColor: `hsl(${hue.toFixed(0)} ${sat}% ${light.toFixed(0)}%)`,
    heightPct,
  };
}

/** Format a local ISO datetime ('2026-09-21T14:00') to 'HH'h'MM'. */
/**
 * Wave period colour scale (seconds).
 *  <6s  : grey (wind chop)
 *  6–10 : light blue → blue (short swell)
 * 10–16 : blue → indigo (medium swell)
 * >16   : deep indigo (long swell)
 */
export function periodStyle(s: number): { backgroundColor: string; color: string } {
  const v = Number.isFinite(s) ? Math.max(0, s) : 0;
  let hue: number;
  let sat: number;
  let light: number;

  if (v <= 6) {
    // flat near-white — very short period
    return { backgroundColor: 'hsl(20 10% 93%)', color: '#94a3b8' };
  } else if (v <= 10) {
    // 6–10s: near-white → very light salmon
    const t = (v - 6) / 4;
    hue = 20;
    sat = 10 + 30 * t;   // 10 → 40
    light = 93 - 8 * t;  // 93 → 85
  } else if (v <= 14) {
    // 10–14s: light salmon → salmon
    const t = (v - 10) / 4;
    hue = 20 - 5 * t;    // 20 → 15
    sat = 40 + 30 * t;   // 40 → 70
    light = 85 - 12 * t; // 85 → 73
  } else if (v <= 18) {
    // 14–18s: salmon → coral/orange-red
    const t = (v - 14) / 4;
    hue = 15 - 5 * t;    // 15 → 10
    sat = 70 + 10 * t;   // 70 → 80
    light = 73 - 18 * t; // 73 → 55
  } else {
    // 18s+: deep red-orange
    const t = Math.min(1, (v - 18) / 6);
    hue = 10;
    sat = 80;
    light = 55 - 15 * t; // 55 → 40
  }

  return {
    backgroundColor: `hsl(${hue.toFixed(0)} ${sat.toFixed(0)}% ${light.toFixed(0)}%)`,
    color: light < 70 ? '#fff' : '#1e293b',
  };
}

export function fmtHourMin(iso: string): string {
  const [, hm] = iso.split('T');
  const [h, m] = hm.split(':');
  return `${h}h${m}`;
}
