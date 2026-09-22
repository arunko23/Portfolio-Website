/**
 * Pixel geometry digitized from AMM Figure 1/3.
 *
 * CG grid lines are NOT vertical and do NOT share one slope. Each millimetre
 * mark has its own top-scale X (1000 kg) and bottom-scale X (1600 kg). The
 * printed line is the straight segment joining those two Xs — slope changes
 * with CG (3350 leans left, 3400 is vertical, 3550+ fan hard to the right).
 *
 * The bottom scale is also non-linear after 3500 mm (3532 / 3550 / 3565).
 */

export const CHART = {
  imageWidth: 1150,
  imageHeight: 910,
  plotLeft: 270,
  plotRight: 1138,
  plotTop: 267,
  plotBottom: 785,
  /** Top millimetre ticks sit just above the 1000 kg axis. */
  tickTopY: 248,
  /** Bottom millimetre ticks sit just below the 1600 kg axis. */
  tickBottomY: 802,
  drawLeft: 268,
  drawRight: 1139,
  drawTop: 240,
  drawBottom: 812,
  weightMin: 1000,
  weightMax: 1600,
  cgMin: 3300,
  cgMax: 3650,
} as const;

/**
 * Top-scale CG: [mm, x px] at plotTop (the 1000 kg line).
 * 10 mm minors 3350–3500 plus labelled majors, snapped to the printed grid.
 */
export const TOP_CG: ReadonlyArray<readonly [number, number]> = [
  [3350, 380],
  [3360, 401],
  [3370, 423],
  [3380, 445],
  [3390, 467],
  [3400, 488],
  [3410, 510],
  [3420, 532],
  [3430, 553],
  [3440, 574],
  [3450, 596],
  [3460, 617],
  [3470, 639],
  [3480, 661],
  [3490, 683],
  [3500, 705],
  [3532, 769],
  [3550, 812],
  [3565, 856],
  [3600, 920],
  [3650, 1029],
];

/**
 * Bottom-scale CG: [mm, x px] at plotBottom (the 1600 kg line).
 * 3600 / 3650 extend past the right edge — used so those lines clip correctly.
 */
export const BOTTOM_CG: ReadonlyArray<readonly [number, number]> = [
  [3350, 313],
  [3360, 349],
  [3370, 383],
  [3380, 418],
  [3390, 453],
  [3400, 488],
  [3410, 523],
  [3420, 557],
  [3430, 592],
  [3440, 628],
  [3450, 662],
  [3460, 698],
  [3470, 732],
  [3480, 767],
  [3490, 800],
  [3500, 837],
  [3532, 940],
  [3550, 1011],
  [3565, 1083],
  [3600, 1186],
  [3650, 1366],
];

/**
 * Weight grid: [kg, y px]. Includes the printed 1119.5 kg construction line
 * so that exact chart callout sits on the ink, not a linear guess.
 */
export const WEIGHT_Y: ReadonlyArray<readonly [number, number]> = [
  [1000, 267],
  [1025, 289],
  [1050, 310],
  [1075, 332],
  [1100, 354],
  [1119.5, 369],
  [1125, 375],
  [1150, 397],
  [1175, 418],
  [1200, 439],
  [1225, 461],
  [1250, 482],
  [1275, 504],
  [1300, 525],
  [1325, 548],
  [1350, 569],
  [1375, 591],
  [1400, 611],
  [1425, 634],
  [1450, 655],
  [1475, 677],
  [1500, 697],
  [1525, 719],
  [1550, 741],
  [1575, 762],
  [1600, 785],
];

export const LB_PER_KG = 2.2046226218;
export const MM_PER_IN = 25.4;

export function kgToLb(kg: number) {
  return kg * LB_PER_KG;
}
export function lbToKg(lb: number) {
  return lb / LB_PER_KG;
}
export function mmToIn(mm: number) {
  return mm / MM_PER_IN;
}
export function inToMm(inches: number) {
  return inches * MM_PER_IN;
}

export function interp(table: ReadonlyArray<readonly [number, number]>, v: number): number {
  if (table.length < 2) return table[0]?.[1] ?? 0;
  if (v <= table[0][0]) {
    const [a, b] = [table[0], table[1]];
    return a[1] + ((v - a[0]) * (b[1] - a[1])) / (b[0] - a[0]);
  }
  for (let i = 0; i < table.length - 1; i++) {
    if (v <= table[i + 1][0]) {
      const a = table[i];
      const b = table[i + 1];
      return a[1] + ((v - a[0]) * (b[1] - a[1])) / (b[0] - a[0]);
    }
  }
  const a = table[table.length - 2];
  const b = table[table.length - 1];
  return a[1] + ((v - a[0]) * (b[1] - a[1])) / (b[0] - a[0]);
}

export function invertInterp(table: ReadonlyArray<readonly [number, number]>, px: number): number {
  const swapped = table.map(([v, p]) => [p, v] as const);
  const increasing = swapped[swapped.length - 1][0] >= swapped[0][0];
  const ordered = increasing ? swapped : [...swapped].reverse();
  return interp(ordered, px);
}

export function topX(cgMm: number) {
  return interp(TOP_CG, cgMm);
}

export function bottomX(cgMm: number) {
  return interp(BOTTOM_CG, cgMm);
}

export function yOfWeight(weightKg: number) {
  return interp(WEIGHT_Y, weightKg);
}

export function weightOfY(y: number) {
  return invertInterp(WEIGHT_Y, y);
}

export type ChartPoint = { x: number; y: number };

/** X of a CG line at an arbitrary image Y (straight line, unique slope per CG). */
export function xAtY(cgMm: number, y: number) {
  const t = (y - CHART.plotTop) / (CHART.plotBottom - CHART.plotTop);
  return topX(cgMm) + t * (bottomX(cgMm) - topX(cgMm));
}

/** Pixel position of a (weight, CG) pair on the printed grid. */
export function pos(weightKg: number, cgMm: number): ChartPoint {
  const y = yOfWeight(weightKg);
  return { x: xAtY(cgMm, y), y };
}

/** Full CG line from the top millimetre tick down to the bottom millimetre tick. */
export function cgLine(cgMm: number): { top: ChartPoint; bottom: ChartPoint } {
  return {
    top: { x: xAtY(cgMm, CHART.tickTopY), y: CHART.tickTopY },
    bottom: { x: xAtY(cgMm, CHART.tickBottomY), y: CHART.tickBottomY },
  };
}

export function cgLineClipped(cgMm: number): { top: ChartPoint; bottom: ChartPoint } | null {
  const raw = cgLine(cgMm);
  return clipSegment(
    raw.top,
    raw.bottom,
    CHART.drawLeft,
    CHART.drawRight,
    CHART.drawTop,
    CHART.drawBottom,
  );
}

export function clipSegmentToPlot(a: ChartPoint, b: ChartPoint) {
  return clipSegment(a, b, CHART.plotLeft, CHART.plotRight, CHART.plotTop, CHART.plotBottom);
}

export function clipSegment(
  a: ChartPoint,
  b: ChartPoint,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
): { top: ChartPoint; bottom: ChartPoint } | null {
  let t0 = 0;
  let t1 = 1;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const clip = (p: number, q: number) => {
    if (p === 0) return q >= 0;
    const r = q / p;
    if (p < 0) {
      if (r > t1) return false;
      if (r > t0) t0 = r;
    } else {
      if (r < t0) return false;
      if (r < t1) t1 = r;
    }
    return true;
  };
  if (
    clip(-dx, a.x - xMin) &&
    clip(dx, xMax - a.x) &&
    clip(-dy, a.y - yMin) &&
    clip(dy, yMax - a.y)
  ) {
    const p0 = { x: a.x + t0 * dx, y: a.y + t0 * dy };
    const p1 = { x: a.x + t1 * dx, y: a.y + t1 * dy };
    return p0.y <= p1.y ? { top: p0, bottom: p1 } : { top: p1, bottom: p0 };
  }
  return null;
}

/** Recover weight/CG from a click on the graph (binary search on CG). */
export function reverse(x: number, y: number): { weightKg: number; cgMm: number } {
  const weightKg = weightOfY(y);
  let lo: number = CHART.cgMin;
  let hi: number = CHART.cgMax;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (pos(weightKg, mid).x < x) lo = mid;
    else hi = mid;
  }
  return { weightKg, cgMm: (lo + hi) / 2 };
}

export function inPlotBox(x: number, y: number) {
  return (
    x >= CHART.plotLeft &&
    x <= CHART.plotRight &&
    y >= CHART.plotTop &&
    y <= CHART.plotBottom
  );
}

export function inChartRange(weightKg: number, cgMm: number) {
  const p = pos(weightKg, cgMm);
  return (
    weightKg >= CHART.weightMin &&
    weightKg <= CHART.weightMax &&
    inPlotBox(p.x, p.y)
  );
}

export function noBallastLeftX(y: number) {
  const t = Math.max(0, Math.min(1, (y - 350) / (700 - 350)));
  return 813 + 99 * t + 10 * t * (1 - t);
}
export function noBallastRightX(y: number) {
  const t = Math.max(0, Math.min(1, (y - 350) / (700 - 350)));
  return 850 + 220 * t + 7 * t * (1 - t);
}
export function isNoBallast(x: number, y: number) {
  return x >= noBallastLeftX(y) && x <= noBallastRightX(y);
}

export type Zone = "NO BALLAST" | "BALLAST";

export function pointZone(p: ChartPoint): Zone {
  return isNoBallast(p.x, p.y) ? "NO BALLAST" : "BALLAST";
}

export function neighbouringMarks(cgMm: number): { left: number; right: number } | null {
  const marks = [
    ...new Set([...TOP_CG.map(([v]) => v), ...BOTTOM_CG.map(([v]) => v)]),
  ].sort((a, b) => a - b);
  if (marks.some((m) => Math.abs(m - cgMm) < 1e-6)) return null;
  if (cgMm <= marks[0] || cgMm >= marks[marks.length - 1]) return null;
  for (let i = 0; i < marks.length - 1; i++) {
    if (cgMm > marks[i] && cgMm < marks[i + 1]) {
      return { left: marks[i], right: marks[i + 1] };
    }
  }
  return null;
}
