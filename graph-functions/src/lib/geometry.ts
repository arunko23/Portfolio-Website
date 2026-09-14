import { MID_CURVES, NG_CURVES, type Polyline } from "@/lib/chart-curves";

export const CHART = {
  width: 596,
  height: 847,
  left: 84,
  right: 507,
  topY: 21,
  topBottom: 284,
  midTop: 295,
  midBottom: 531,
  botTop: 542,
  botBottom: 661,
} as const;

/** Torque-family x at NR ≈ 394, digitized on the printed curves. */
const TQ_AT_394: [number, number][] = [
  [50, 477],
  [55, 447],
  [60, 417],
  [65, 386],
  [70, 356],
  [75, 325],
  [80, 297],
  [85, 264],
  [90, 233],
  [95, 204],
];

export function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

export function yOAT(oat: number) {
  return CHART.topBottom - ((oat + 30) * (CHART.topBottom - CHART.topY)) / 80;
}

export function yNR(nr: number) {
  return CHART.botBottom - ((nr - 380) * (CHART.botBottom - CHART.botTop)) / 20;
}

/** PA 0 → bottom axis; PA 10 000 ft → printed “10” grid. */
export function yPA(pa: number) {
  return CHART.midBottom - (pa / 5000) * 98;
}

function lerpTable(table: [number, number][], v: number) {
  if (v <= table[0][0]) {
    const [v0, x0] = table[0];
    const [v1, x1] = table[1];
    return x0 + ((x1 - x0) * (v - v0)) / (v1 - v0);
  }
  for (let i = 0; i < table.length - 1; i++) {
    if (v <= table[i + 1][0]) {
      const [v0, x0] = table[i];
      const [v1, x1] = table[i + 1];
      return x0 + ((x1 - x0) * (v - v0)) / (v1 - v0);
    }
  }
  const n = table.length;
  const [v0, x0] = table[n - 2];
  const [v1, x1] = table[n - 1];
  return x0 + ((x1 - x0) * (v - v0)) / (v1 - v0);
}

function xTorqueAt394(tq: number) {
  return lerpTable(TQ_AT_394, tq);
}

/** Printed torque curves tilt ~0.24 px in x per 1 px of NR. */
export function xBottom(nr: number, tq: number) {
  const y394 = yNR(394);
  return xTorqueAt394(tq) + 0.24 * (yNR(nr) - y394);
}

function xOnPolyline(p: Polyline, y: number, extrapPx = 0): number | null {
  if (p.x.length < 2) return null;
  if (y < p.y0 - extrapPx || y > p.y1 + extrapPx) return null;
  if (y < p.y0) {
    const dx = p.x[1] - p.x[0];
    return p.x[0] + dx * (y - p.y0);
  }
  if (y > p.y1) {
    const n = p.x.length;
    const dx = p.x[n - 1] - p.x[n - 2];
    return p.x[n - 1] + dx * (y - p.y1);
  }
  const t = y - p.y0;
  const i = Math.floor(t);
  const f = t - i;
  if (i >= p.x.length - 1) return p.x[p.x.length - 1];
  if (i < 0) return p.x[0];
  return p.x[i] * (1 - f) + p.x[i + 1] * f;
}

/** Linear interpolate/extrapolate x against a sorted independent variable. */
function interpolateVs(pts: [number, number][], v: number): number {
  if (pts.length === 0) return CHART.left;
  const sorted = [...pts].sort((a, b) => a[0] - b[0]);
  if (sorted.length === 1) return sorted[0][1];
  if (v <= sorted[0][0]) {
    const [v0, x0] = sorted[0];
    const [v1, x1] = sorted[1];
    const den = v1 - v0 || 1;
    return x0 + ((x1 - x0) * (v - v0)) / den;
  }
  const last = sorted.length - 1;
  if (v >= sorted[last][0]) {
    const [v0, x0] = sorted[last - 1];
    const [v1, x1] = sorted[last];
    const den = v1 - v0 || 1;
    return x0 + ((x1 - x0) * (v - v0)) / den;
  }
  for (let i = 0; i < last; i++) {
    if (v <= sorted[i + 1][0]) {
      const [v0, x0] = sorted[i];
      const [v1, x1] = sorted[i + 1];
      const den = v1 - v0 || 1;
      return x0 + ((x1 - x0) * (v - v0)) / den;
    }
  }
  return sorted[last][1];
}

/**
 * x of the printed NG family at a given OAT.
 * Integer NG (91…98) lands on that printed curve; 96.5 is halfway between 96 and 97.
 */
export function xNG(ng: number, oat: number): number {
  const y = yOAT(oat);
  const pts: [number, number][] = [];
  for (const c of NG_CURVES) {
    const x = xOnPolyline(c, y, 24);
    if (x != null) pts.push([c.ng, x]);
  }
  return interpolateVs(pts, ng);
}

/** Which two printed NG lines a value sits between. */
export function ngBracket(ng: number): { lo: number; hi: number } {
  const ngs = NG_CURVES.map((c) => c.ng).sort((a, b) => a - b);
  if (ng <= ngs[0]) return { lo: ngs[0], hi: ngs[1] };
  if (ng >= ngs[ngs.length - 1])
    return { lo: ngs[ngs.length - 2], hi: ngs[ngs.length - 1] };
  for (let i = 0; i < ngs.length - 1; i++) {
    if (ng >= ngs[i] && ng <= ngs[i + 1]) return { lo: ngs[i], hi: ngs[i + 1] };
  }
  return { lo: 96, hi: 97 };
}

/** Fractional family index at the bottom of the middle chart. */
export function midFamilyIndex(bottomX: number): number {
  const pts: [number, number][] = [];
  MID_CURVES.forEach((c, i) => {
    const x = xOnPolyline(c, CHART.midBottom, 4);
    if (x != null) pts.push([i, x]);
  });
  const sorted = [...pts].sort((a, b) => a[1] - b[1]);
  if (sorted.length < 2) return 0;
  if (bottomX <= sorted[0][1]) {
    const [i0, x0] = sorted[0];
    const [i1, x1] = sorted[1];
    return i0 + ((i1 - i0) * (bottomX - x0)) / (x1 - x0 || 1);
  }
  if (bottomX >= sorted[sorted.length - 1][1]) {
    const [i0, x0] = sorted[sorted.length - 2];
    const [i1, x1] = sorted[sorted.length - 1];
    return i0 + ((i1 - i0) * (bottomX - x0)) / (x1 - x0 || 1);
  }
  for (let k = 0; k < sorted.length - 1; k++) {
    if (bottomX <= sorted[k + 1][1]) {
      const [i0, x0] = sorted[k];
      const [i1, x1] = sorted[k + 1];
      return i0 + ((i1 - i0) * (bottomX - x0)) / (x1 - x0 || 1);
    }
  }
  return sorted[sorted.length - 1][0];
}

export function xMiddleAtY(familyIndex: number, y: number): number {
  const pts: [number, number][] = [];
  MID_CURVES.forEach((c, i) => {
    const x = xOnPolyline(c, y, 0);
    if (x != null && x > 86) pts.push([i, x]);
  });
  return interpolateVs(pts, familyIndex);
}

export function xMiddle(bottomX: number, pa: number): number {
  return xMiddleAtY(midFamilyIndex(bottomX), yPA(pa));
}

/** Construction polyline from the bottom transfer up to the selected PA. */
export function middleConstructionPath(
  bottomX: number,
  pa: number,
): { x: number; y: number }[] {
  const s = midFamilyIndex(bottomX);
  const yTop = yPA(pa);
  const pts: { x: number; y: number }[] = [];
  const y0 = CHART.midBottom;
  const y1 = Math.min(y0, Math.max(CHART.midTop, yTop));
  const step = y1 <= y0 ? -1 : 1;
  for (let y = y0; step < 0 ? y >= y1 : y <= y1; y += step) {
    pts.push({ x: xMiddleAtY(s, y), y });
  }
  if (pts.length === 0 || pts[pts.length - 1].y !== yTop) {
    pts.push({ x: xMiddleAtY(s, yTop), y: yTop });
  }
  return pts;
}

/** Thick printed CORRECT / INCORRECT dividing line. */
export function boundaryY(x: number) {
  return 72 + 0.5 * (x - CHART.left);
}

export function finalClass(mx: number, fy: number): "CORRECT" | "INCORRECT" {
  return fy >= boundaryY(mx) ? "CORRECT" : "INCORRECT";
}

export const RANGES = {
  nr: { min: 380, max: 400, label: "NR 380–400" },
  tq: { min: 50, max: 95, label: "TQ 50–95%" },
  pa: { min: 0, max: 10000, label: "PA 0–10,000 ft" },
  ng: { min: 91, max: 98, label: "NG 91–98%" },
  oat: { min: -30, max: 50, label: "OAT −30 to +50°C" },
} as const;

export function inRange(nr: number, tq: number, pa: number, ng: number, oat: number) {
  return (
    nr >= RANGES.nr.min &&
    nr <= RANGES.nr.max &&
    tq >= RANGES.tq.min &&
    tq <= RANGES.tq.max &&
    pa >= RANGES.pa.min &&
    pa <= RANGES.pa.max &&
    ng >= 90 &&
    ng <= 100 &&
    oat >= RANGES.oat.min &&
    oat <= RANGES.oat.max
  );
}

export type PlotResult = {
  nr: number;
  tq: number;
  pa: number;
  ng: number;
  oat: number;
  bx: number;
  by: number;
  mx: number;
  my: number;
  gx: number;
  oy: number;
  fy: number;
  cls: "CORRECT" | "INCORRECT";
  midPath: { x: number; y: number }[];
  ngLo: number;
  ngHi: number;
};

export function calculatePlot(
  nr: number,
  tq: number,
  pa: number,
  ng: number,
  oat: number,
): PlotResult {
  const by = yNR(nr);
  const bx = xBottom(nr, tq);
  const my = yPA(pa);
  const midPath = middleConstructionPath(bx, pa);
  const mx = midPath.length ? midPath[midPath.length - 1].x : xMiddle(bx, pa);
  const oy = yOAT(oat);
  const gx = xNG(ng, oat);
  const fy = boundaryY(gx);
  const cls = finalClass(mx, fy);
  const { lo: ngLo, hi: ngHi } = ngBracket(ng);
  return { nr, tq, pa, ng, oat, bx, by, mx, my, gx, oy, fy, cls, midPath, ngLo, ngHi };
}
