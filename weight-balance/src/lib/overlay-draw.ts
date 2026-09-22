import {
  CHART,
  cgLineToPoint,
  indexRayFromPoint,
  kgToLb,
  mmToIn,
  pos,
} from "@/lib/chart-geometry";
import type { PlottedPoint } from "@/lib/plot-store";

export const OVERLAY = {
  plot: "#c44536",
  plotInk: "#7a2a22",
  halo: "#ffffff",
  connect: "#222222",
  cross: "#444444",
  read: "#1a6aa3",
  ink: "#111111",
} as const;

export const LEGEND_ROW = 22;
export const LEGEND_PAD = 18;

export type OverlayState = {
  points: PlottedPoint[];
  connect: boolean;
  showCgLine: boolean;
  crosshair: boolean;
  readout: { weightKg: number; cgMm: number; x: number; y: number } | null;
};

export function legendHeight(pointCount: number) {
  if (pointCount === 0) return 0;
  return LEGEND_PAD + 16 + pointCount * LEGEND_ROW + 12;
}

export function formatPointLine(p: PlottedPoint) {
  return `P${p.id}   ${p.weightKg.toFixed(1)} kg   ${kgToLb(p.weightKg).toFixed(1)} lb   ${p.cgMm.toFixed(1)} mm   ${mmToIn(p.cgMm).toFixed(3)} in`;
}

function haloStroke(
  ctx: CanvasRenderingContext2D,
  draw: () => void,
  color: string,
  width: number,
  haloWidth = width + 3.2,
) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = OVERLAY.halo;
  ctx.lineWidth = haloWidth;
  ctx.globalAlpha = 0.92;
  draw();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.globalAlpha = 1;
  draw();
  ctx.restore();
}

function drawCgConstruction(ctx: CanvasRenderingContext2D, weightKg: number, cgMm: number) {
  const pt = pos(weightKg, cgMm);
  const lower = cgLineToPoint(cgMm, pt);
  if (lower) {
    haloStroke(
      ctx,
      () => {
        ctx.beginPath();
        ctx.moveTo(lower.bottom.x, lower.bottom.y);
        ctx.lineTo(lower.top.x, lower.top.y);
        ctx.stroke();
      },
      OVERLAY.plot,
      2.4,
      5.4,
    );
  }
  const upper = indexRayFromPoint(pt);
  if (upper) {
    haloStroke(
      ctx,
      () => {
        ctx.beginPath();
        ctx.moveTo(upper.start.x, upper.start.y);
        ctx.lineTo(upper.end.x, upper.end.y);
        ctx.stroke();
      },
      OVERLAY.plot,
      2.4,
      5.4,
    );
  }
}

function drawPointMarker(ctx: CanvasRenderingContext2D, px: number, py: number, id: number) {
  ctx.save();
  ctx.fillStyle = OVERLAY.halo;
  ctx.strokeStyle = OVERLAY.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(px, py, 6.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = OVERLAY.plot;
  ctx.beginPath();
  ctx.arc(px, py, 2.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = OVERLAY.ink;
  ctx.font = "bold 10px IBM Plex Sans, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(id), px, py - 11);
  ctx.restore();
}

export function drawOverlays(ctx: CanvasRenderingContext2D, state: OverlayState) {
  const { points, connect, crosshair, showCgLine, readout } = state;

  if (connect && points.length > 1) {
    ctx.save();
    ctx.setLineDash([10, 6]);
    haloStroke(
      ctx,
      () => {
        ctx.beginPath();
        const first = pos(points[0].weightKg, points[0].cgMm);
        ctx.moveTo(first.x, first.y);
        for (let i = 1; i < points.length; i++) {
          const p = pos(points[i].weightKg, points[i].cgMm);
          ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      },
      OVERLAY.connect,
      2.4,
      5.4,
    );
    ctx.restore();
  }

  if (showCgLine) {
    for (const p of points) {
      drawCgConstruction(ctx, p.weightKg, p.cgMm);
    }
    for (const p of points) {
      const pt = pos(p.weightKg, p.cgMm);
      haloStroke(
        ctx,
        () => {
          ctx.beginPath();
          ctx.moveTo(CHART.plotLeft, pt.y);
          ctx.lineTo(pt.x, pt.y);
          ctx.stroke();
        },
        OVERLAY.plot,
        1.6,
        4,
      );
    }
  }

  for (const p of points) {
    const pt = pos(p.weightKg, p.cgMm);
    if (crosshair) {
      ctx.save();
      ctx.setLineDash([7, 6]);
      haloStroke(
        ctx,
        () => {
          ctx.beginPath();
          ctx.moveTo(CHART.plotLeft, pt.y);
          ctx.lineTo(pt.x, pt.y);
          ctx.stroke();
        },
        OVERLAY.cross,
        1.4,
        3.6,
      );
      ctx.restore();
    }
    drawPointMarker(ctx, pt.x, pt.y, p.id);
  }

  if (readout) {
    const pt = { x: readout.x, y: readout.y };
    const lower = cgLineToPoint(readout.cgMm, pt);
    const upper = indexRayFromPoint(pt);
    ctx.save();
    ctx.setLineDash([4, 4]);
    if (lower) {
      haloStroke(
        ctx,
        () => {
          ctx.beginPath();
          ctx.moveTo(lower.bottom.x, lower.bottom.y);
          ctx.lineTo(lower.top.x, lower.top.y);
          ctx.stroke();
        },
        OVERLAY.read,
        1.6,
        4,
      );
    }
    if (upper) {
      haloStroke(
        ctx,
        () => {
          ctx.beginPath();
          ctx.moveTo(upper.start.x, upper.start.y);
          ctx.lineTo(upper.end.x, upper.end.y);
          ctx.stroke();
        },
        OVERLAY.read,
        1.6,
        4,
      );
    }
    ctx.restore();
    ctx.fillStyle = OVERLAY.read;
    ctx.strokeStyle = OVERLAY.halo;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(readout.x, readout.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

function drawLegend(ctx: CanvasRenderingContext2D, points: PlottedPoint[], y0: number) {
  const h = legendHeight(points.length);
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, y0, CHART.imageWidth, h);
  ctx.strokeStyle = "#c8c8c8";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(28, y0 + 1);
  ctx.lineTo(CHART.imageWidth - 28, y0 + 1);
  ctx.stroke();

  ctx.fillStyle = "#111111";
  ctx.font = "bold 11px IBM Plex Sans, Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("Plotted points", 36, y0 + 16);

  ctx.font = "13px IBM Plex Mono, ui-monospace, monospace";
  points.forEach((p, i) => {
    const y = y0 + 18 + LEGEND_ROW + i * LEGEND_ROW;
    ctx.fillStyle = OVERLAY.plot;
    ctx.beginPath();
    ctx.arc(42, y, 4.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#111111";
    ctx.fillText(formatPointLine(p), 54, y);
  });
  ctx.restore();
}

export async function rasterizeChart(
  image: HTMLImageElement,
  state: OverlayState,
  pixelRatio = 2,
): Promise<string> {
  const extra = legendHeight(state.points.length);
  const pad = 24;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round((CHART.imageWidth + pad * 2) * pixelRatio);
  canvas.height = Math.round((CHART.imageHeight + extra + pad * 2) * pixelRatio);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create print canvas.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(pixelRatio, pixelRatio);
  ctx.translate(pad, pad);
  ctx.drawImage(image, 0, 0, CHART.imageWidth, CHART.imageHeight);
  drawOverlays(ctx, state);
  if (state.points.length > 0) {
    drawLegend(ctx, state.points, CHART.imageHeight);
  }
  return canvas.toDataURL("image/png");
}
