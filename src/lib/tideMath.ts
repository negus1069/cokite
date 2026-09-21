// Utilities to detect tide extrema and estimate the SHOM-style coefficient
// from Open-Meteo's hourly `sea_level_height_msl` series.

export type TideKind = 'PM' | 'BM'; // Pleine Mer (high) / Basse Mer (low)

export interface TideExtremum {
  index: number;       // index in hourly arrays
  time: string;        // ISO local time (as returned by API with timezone=auto)
  height: number;      // meters (relative to MSL)
  kind: TideKind;
}

/**
 * Find local maxima/minima in a 1-D series with a ±window neighborhood.
 * Robust to flat plateaus by using strict comparison on one side.
 */
export function findExtrema(times: string[], heights: number[], window = 3): TideExtremum[] {
  const out: TideExtremum[] = [];
  for (let i = window; i < heights.length - window; i++) {
    let isMax = true;
    let isMin = true;
    for (let k = 1; k <= window; k++) {
      if (!(heights[i] > heights[i - k]) || !(heights[i] >= heights[i + k])) isMax = false;
      if (!(heights[i] < heights[i - k]) || !(heights[i] <= heights[i + k])) isMin = false;
    }
    if (isMax) out.push({ index: i, time: times[i], height: heights[i], kind: 'PM' });
    else if (isMin) out.push({ index: i, time: times[i], height: heights[i], kind: 'BM' });
  }
  return out;
}

/**
 * Sign of the tide trend at hour index i: +1 rising (montante), -1 falling (descendante).
 */
export function tideTrend(heights: number[], i: number): 1 | -1 | 0 {
  const prev = heights[Math.max(0, i - 1)];
  const next = heights[Math.min(heights.length - 1, i + 1)];
  if (next > prev) return 1;
  if (next < prev) return -1;
  return 0;
}

/**
 * Approximate the SHOM tidal coefficient (French scale ~20..120) from
 * the tidal range of a given local day, calibrated against the location's
 * mean spring-tide range.
 *
 *   coef ≈ round(100 * dailyRange / springRange)
 *
 * `springRange` should be the mean vives-eaux (spring) marnage for the port
 * in meters (e.g. ~6.0 m for La Rochelle-Pallice). Clamped to [20, 120].
 */
export function coefficientForDay(
  times: string[],
  heights: number[],
  isoDate: string, // 'YYYY-MM-DD' in local time
  springRange: number,
): number | null {
  const day = heights
    .map((h, i) => ({ h, t: times[i] }))
    .filter(({ t }) => t.startsWith(isoDate));
  if (day.length === 0) return null;
  const min = Math.min(...day.map((d) => d.h));
  const max = Math.max(...day.map((d) => d.h));
  const range = max - min;
  const coef = Math.round((100 * range) / Math.max(springRange, 0.1));
  return Math.max(20, Math.min(120, coef));
}

/**
 * Return the extremum nearest to a given hour index, within +/- windowHours.
 * Used to attach a PM/BM tag to a display column (e.g. the 05h slot picks
 * up a 03h37 low tide).
 */
export function nearestExtremum(
  extrema: TideExtremum[],
  targetIndex: number,
  windowHours = 2,
): TideExtremum | null {
  let best: TideExtremum | null = null;
  let bestDist = Infinity;
  for (const e of extrema) {
    const d = Math.abs(e.index - targetIndex);
    if (d <= windowHours && d < bestDist) {
      best = e;
      bestDist = d;
    }
  }
  return best;
}

/**
 * Map each extremum to the *single* slot (from a provided list of hourly indices)
 * that is closest to it. Returns a Map<slotIndex, TideExtremum>.
 *
 * This gives us a "one label per tide event" behaviour: instead of tagging
 * every column within ±2h of a PM/BM (which would repeat 07h00 BM on 5 hours),
 * we tag only the column whose local hour is nearest to the actual PM/BM time.
 */
export function extremaBySlot(
  extrema: TideExtremum[],
  slotIndices: number[],
): Map<number, TideExtremum> {
  const out = new Map<number, TideExtremum>();
  for (const e of extrema) {
    let best = -1;
    let bestDist = Infinity;
    for (const si of slotIndices) {
      if (si < 0) continue;
      const d = Math.abs(si - e.index);
      if (d < bestDist) {
        best = si;
        bestDist = d;
      }
    }
    if (best >= 0) {
      // If two extrema map to the same slot (rare), keep the closest one.
      const prev = out.get(best);
      if (!prev || Math.abs(prev.index - best) > bestDist) {
        out.set(best, e);
      }
    }
  }
  return out;
}
