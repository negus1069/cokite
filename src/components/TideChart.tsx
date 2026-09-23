import { findExtrema } from '../lib/tideMath';

interface Props {
  times: string[];
  heights: number[];
  date: string;
  /** Ordered list of integer hours that correspond to table columns */
  hours: number[];
  /** Width of each column in SVG units — chart total width = hours.length * colWidth */
  colWidth: number;
  /** Extra hours of context to show before first and after last column (greyed out) */
  context?: number;
  svgHeight?: number;
}

function catmullRomPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return '';
  let d = `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

export default function TideChart({
  times,
  heights,
  date,
  hours,
  colWidth,
  context = 2,
  svgHeight = 40,
}: Props) {
  if (hours.length === 0) return null;

  const firstHour = hours[0];
  const lastHour = hours[hours.length - 1];

  const totalWidth = hours.length * colWidth;

  // Each integer hour maps to the left edge of its column.
  // hour `firstHour` → x=0, hour `lastHour + 1` → x=totalWidth
  // So x = (h - firstHour) * colWidth
  function xForHour(h: number): number {
    return (h - firstHour) * colWidth;
  }

  // Centre of column at index ci
  function xForCol(colIndex: number): number {
    return (colIndex + 0.5) * colWidth;
  }

  // Context window for data collection (hours beyond visible columns)
  const windowStartHour = firstHour - context;
  const windowEndHour = lastHour + 1 + context;

  // Collect hourly data points in the window
  const prevDateStr = (() => {
    const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  })();
  const nextDateStr = (() => {
    const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  })();

  const pts: { x: number; y: number; h: number }[] = [];

  times.forEach((t, i) => {
    let absHour: number | null = null;
    const hh = parseInt(t.slice(11, 13), 10);
    if (t.startsWith(date)) absHour = hh;
    else if (t.startsWith(prevDateStr)) absHour = hh - 24;
    else if (t.startsWith(nextDateStr)) absHour = hh + 24;
    if (absHour === null) return;
    if (absHour < windowStartHour || absHour > windowEndHour) return;
    pts.push({ x: xForHour(absHour), y: 0, h: heights[i] });
  });

  if (pts.length < 2) return null;
  pts.sort((a, b) => a.x - b.x);

  const minH = Math.min(...pts.map((p) => p.h));
  const maxH = Math.max(...pts.map((p) => p.h));
  const range = maxH - minH || 1;
  const meanH = (minH + maxH) / 2;

  const PAD_TOP = 12;
  const PAD_BOTTOM = 4;
  const chartH = svgHeight - PAD_TOP - PAD_BOTTOM;

  function yFor(h: number): number {
    return PAD_TOP + chartH - ((h - minH) / range) * chartH;
  }

  const plotPts = pts.map((p) => ({ x: p.x, y: yFor(p.h) }));
  const meanY = yFor(meanH);

  const linePath = catmullRomPath(plotPts);
  const firstX = plotPts[0].x.toFixed(1);
  const lastX = plotPts[plotPts.length - 1].x.toFixed(1);
  const bottomY = (PAD_TOP + chartH).toFixed(1);
  const fillPath = `${linePath} L ${lastX},${bottomY} L ${firstX},${bottomY} Z`;

  // x bounds of the "today columns" region (first col left edge to last col right edge)
  const colsStartX = 0;
  const colsEndX = hours.length * colWidth;

  const uid = `tc-${date}`;

  // Extrema labels — only those within the visible column range
  const allExtrema = findExtrema(times, heights, 3);
  const visibleExtrema = allExtrema.filter((e) => {
    if (!e.time.startsWith(date)) return false;
    const hh = parseInt(e.time.slice(11, 13), 10);
    const mm = parseInt(e.time.slice(14, 16), 10);
    const x = xForHour(hh + mm / 60);
    return x >= 0 && x <= totalWidth;
  });

  return (
    <svg
      viewBox={`0 0 ${totalWidth} ${svgHeight}`}
      width="100%"
      height={svgHeight}
      preserveAspectRatio="none"
      style={{ display: 'block', overflow: 'visible' }}
      aria-label="Courbe de marée"
    >
      <defs>
        <clipPath id={`cols-${uid}`}>
          <rect x={colsStartX} y={0} width={colsEndX - colsStartX} height={svgHeight} />
        </clipPath>
        <clipPath id={`above-${uid}`}>
          <rect x={0} y={0} width={totalWidth} height={meanY} />
        </clipPath>
        <clipPath id={`below-${uid}`}>
          <rect x={0} y={meanY} width={totalWidth} height={svgHeight - meanY} />
        </clipPath>
      </defs>

      {/* Faded fill for context area */}
      <path d={fillPath} fill="currentColor" opacity={0.06} />

      {/* Colored fill clipped to columns range */}
      <g clipPath={`url(#cols-${uid})`}>
        <path d={fillPath} fill="rgb(34 197 94)" opacity={0.30} clipPath={`url(#above-${uid})`} />
        <path d={fillPath} fill="rgb(239 68 68)" opacity={0.30} clipPath={`url(#below-${uid})`} />
      </g>

      {/* Mean line */}
      <line x1={0} y1={meanY} x2={totalWidth} y2={meanY}
        stroke="currentColor" strokeOpacity={0.12} strokeWidth={1} strokeDasharray="3 3" />

      {/* Column separator lines */}
      {hours.map((_, ci) => {
        const x = ci * colWidth;
        return <line key={ci} x1={x} y1={PAD_TOP} x2={x} y2={PAD_TOP + chartH}
          stroke="currentColor" strokeOpacity={0.07} strokeWidth={1} />;
      })}

      {/* Curve */}
      <path d={linePath} fill="none" stroke="currentColor" strokeWidth={1.5} strokeOpacity={0.75} />

      {/* Extrema labels — only for today, within visible range */}
      {visibleExtrema.map((e) => {
        const hh = parseInt(e.time.slice(11, 13), 10);
        const mm = parseInt(e.time.slice(14, 16), 10);
        const absH = hh + mm / 60;
        const x = xForHour(absH);
        const y = yFor(e.height);
        const isPM = e.kind === 'PM';
        const color = isPM ? 'rgb(22 101 52)' : 'rgb(153 27 27)';
        const heightTxt = `${e.height.toFixed(1)}m`;
        const timeTxt = `${String(hh).padStart(2,'0')}h${String(mm).padStart(2,'0')}`;
        // For PM: labels above the dot; for BM: labels below
        const baseY = isPM ? Math.max(10, y - 5) : Math.min(svgHeight - 2, y + 9);
        return (
          <g key={e.index}>
            <circle cx={x} cy={y} r={2.5} fill={color} />
            <text x={x} y={baseY} textAnchor="middle" fontSize={8}
              fill={color} fontFamily="Inter,system-ui,sans-serif" fontWeight={700}>
              {heightTxt}
            </text>
            <text x={x} y={isPM ? baseY - 9 : baseY + 9} textAnchor="middle" fontSize={7}
              fill={color} fontFamily="Inter,system-ui,sans-serif" fontWeight={500} opacity={0.8}>
              {timeTxt}
            </text>
          </g>
        );
      })}

      {/* Hour tick marks aligned to column centres */}
      {hours.map((h, ci) => {
        const x = xForCol(ci);
        return (
          <line key={h} x1={x} y1={PAD_TOP + chartH} x2={x} y2={PAD_TOP + chartH + 3}
            stroke="currentColor" strokeOpacity={0.2} strokeWidth={1} />
        );
      })}
    </svg>
  );
}
