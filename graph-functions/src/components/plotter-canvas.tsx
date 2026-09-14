import { useEffect, useRef } from "react";
import { CHART, type PlotResult } from "@/lib/geometry";

const BLUE = "#1457d9";
const RED = "#c41212";
const GREEN = "#138a4a";

type Props = {
  plot: PlotResult | null;
  showLabels: boolean;
  readout: boolean;
  zoom: number;
  onReadout?: (x: number, y: number) => void;
};

export function PlotterCanvas({ plot, showLabels, readout, zoom, onReadout }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!plot) return;
    draw(ctx, plot, showLabels);
  }, [plot, showLabels]);

  return (
    <div
      id="plot-stage"
      className="relative"
      style={{ width: CHART.width * zoom, height: CHART.height * zoom }}
    >
      <img
        src="/chart.png"
        alt="AS350 B2 Figure 1 engine power check chart"
        width={CHART.width}
        height={CHART.height}
        className="block"
        style={{ width: CHART.width * zoom, height: CHART.height * zoom }}
        draggable={false}
      />
      <canvas
        ref={canvasRef}
        width={CHART.width}
        height={CHART.height}
        className="absolute top-0 left-0"
        style={{
          width: CHART.width * zoom,
          height: CHART.height * zoom,
          cursor: readout ? "crosshair" : "default",
        }}
        onClick={(e) => {
          if (!readout || !onReadout) return;
          const canvas = canvasRef.current;
          if (!canvas) return;
          const r = canvas.getBoundingClientRect();
          const x = ((e.clientX - r.left) * canvas.width) / r.width;
          const y = ((e.clientY - r.top) * canvas.height) / r.height;
          onReadout(x, y);
        }}
      />
    </div>
  );
}

function line(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  w = 2.5,
  dash: number[] = [],
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.setLineDash(dash);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

function dot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  fill = true,
) {
  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = color;
  ctx.fillStyle = fill ? color : "#fff";
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fill();
  if (!fill) ctx.stroke();
  ctx.restore();
}

function txt(
  ctx: CanvasRenderingContext2D,
  s: string,
  x: number,
  y: number,
  color = "#111",
  size = 13,
  align: CanvasTextAlign = "left",
) {
  ctx.save();
  ctx.font = `600 ${size}px Barlow, Arial, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.strokeStyle = "rgba(255,255,255,.86)";
  ctx.lineWidth = 3;
  ctx.strokeText(s, x, y);
  ctx.fillText(s, x, y);
  ctx.restore();
}

function draw(ctx: CanvasRenderingContext2D, p: PlotResult, showLabels: boolean) {
  const { nr, tq, pa, ng, oat, bx, by, mx, my, gx, oy, fy, cls, midPath } = p;
  const good = cls === "CORRECT";

  line(ctx, CHART.left, by, bx, by, BLUE, 2.4, [9, 6]);
  line(ctx, bx, by, bx, CHART.midBottom, RED, 2.8);

  if (midPath.length > 1) {
    ctx.save();
    ctx.strokeStyle = RED;
    ctx.lineWidth = 2.8;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(midPath[0].x, midPath[0].y);
    for (let i = 1; i < midPath.length; i++) ctx.lineTo(midPath[i].x, midPath[i].y);
    ctx.stroke();
    ctx.restore();
  }

  line(ctx, CHART.left, my, mx, my, BLUE, 2.4, [9, 6]);
  line(ctx, mx, my, mx, CHART.topY, RED, 2.8);

  line(ctx, CHART.left, oy, gx, oy, BLUE, 2.4, [9, 6]);
  line(ctx, gx, oy, gx, fy, BLUE, 2.8);
  line(ctx, gx, fy, mx, fy, good ? GREEN : RED, 3.0);

  dot(ctx, bx, by, RED);
  dot(ctx, mx, my, RED);
  dot(ctx, gx, oy, BLUE);
  dot(ctx, gx, fy, good ? GREEN : RED);
  dot(ctx, mx, fy, good ? GREEN : RED, false);

  if (!showLabels) return;
  txt(ctx, String(nr), CHART.left - 10, by - 4, BLUE, 22, "right");
  txt(ctx, String(tq), bx + 8, CHART.botBottom + 18, RED, 20, "left");
  txt(ctx, String(pa), CHART.left - 10, my, BLUE, 22, "right");
  txt(ctx, String(ng), gx + 14, oy - 22, BLUE, 22, "left");
  txt(ctx, (oat >= 0 ? "+" : "") + String(oat), CHART.left - 10, oy, BLUE, 22, "right");
  txt(ctx, cls, CHART.right - 8, fy - 12, good ? GREEN : RED, 14, "right");
}
