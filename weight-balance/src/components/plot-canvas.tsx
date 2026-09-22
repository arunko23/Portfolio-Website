import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  CHART,
  cgLineToPoint,
  inPlotBox,
  indexRayFromPoint,
  kgToLb,
  mmToIn,
  pointZone,
  pos,
  reverse,
} from "@/lib/chart-geometry";
import { formatPointLine, OVERLAY, rasterizeChart } from "@/lib/overlay-draw";
import { usePlotStore } from "@/lib/plot-store";
import { cn } from "@/lib/utils";

const IMAGE_SRC = "/as350-figure-1-3.png";

type Readout = { weightKg: number; cgMm: number; x: number; y: number } | null;

export function PlotCanvas() {
  const svgRef = useRef<SVGSVGElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const points = usePlotStore((s) => s.points);
  const connect = usePlotStore((s) => s.connect);
  const crosshair = usePlotStore((s) => s.crosshair);
  const showCgLine = usePlotStore((s) => s.showCgLine);
  const readMode = usePlotStore((s) => s.readMode);
  const zoom = usePlotStore((s) => s.zoom);
  const printRequest = usePlotStore((s) => s.printRequest);
  const requestPrint = usePlotStore((s) => s.requestPrint);
  const [readout, setReadout] = useState<Readout>(null);
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);
  const [fit, setFit] = useState(1);
  const [printUrl, setPrintUrl] = useState<string | null>(null);
  const printSeq = useRef(0);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => {
      const w = Math.max(320, el.clientWidth - 2);
      setFit(w / CHART.imageWidth);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (printRequest === 0) return;
    let cancelled = false;
    const seq = ++printSeq.current;

    async function run() {
      const img = imgRef.current;
      if (!img) return;
      if (!img.complete) {
        await new Promise<void>((resolve, reject) => {
          img.addEventListener("load", () => resolve(), { once: true });
          img.addEventListener("error", () => reject(new Error("Chart image failed to load")), {
            once: true,
          });
        });
      }
      const state = usePlotStore.getState();
      try {
        const url = await rasterizeChart(img, {
          points: state.points,
          connect: state.connect,
          crosshair: state.crosshair,
          showCgLine: state.showCgLine,
          readout,
        });
        if (cancelled || seq !== printSeq.current) return;
        document.body.classList.add("is-printing");
        setPrintUrl(url);
      } catch {
        if (cancelled || seq !== printSeq.current) return;
        window.print();
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [printRequest, readout]);

  useEffect(() => {
    const after = () => {
      document.body.classList.remove("is-printing");
      setPrintUrl(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        requestPrint();
      }
    };
    window.addEventListener("afterprint", after);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("afterprint", after);
      window.removeEventListener("keydown", onKey);
    };
  }, [requestPrint]);

  const scale = fit * zoom;

  function graphCoords(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return null;
    const r = svg.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return null;
    return {
      x: ((e.clientX - r.left) / r.width) * CHART.imageWidth,
      y: ((e.clientY - r.top) / r.height) * CHART.imageHeight,
    };
  }

  function onClick(e: React.MouseEvent<SVGSVGElement>) {
    if (!readMode) return;
    const c = graphCoords(e);
    if (!c || !inPlotBox(c.x, c.y)) return;
    const q = reverse(c.x, c.y);
    setReadout({ ...q, x: c.x, y: c.y });
  }

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const c = graphCoords(e);
    if (!c || !inPlotBox(c.x, c.y)) {
      setTip(null);
      return;
    }
    const q = reverse(c.x, c.y);
    setTip({
      x: e.clientX,
      y: e.clientY,
      text: `${q.weightKg.toFixed(1)} kg · ${q.cgMm.toFixed(1)} mm`,
    });
  }

  const last = points[points.length - 1];
  const lastZone = last ? pointZone(pos(last.weightKg, last.cgMm)) : null;

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <ZoomButtons />
        </div>
        <p className="text-xs text-muted">
          Overlay — millimetre line from the bottom to the point only. After
          the intersection the only line is parallel to 12 / 14 / 16 … 40,
          stopping at the top of the graph.
        </p>
      </div>

      <div
        ref={wrapRef}
        className="chart-wrap max-h-[min(78vh,920px)] overflow-auto rounded-lg border border-border bg-white"
      >
        <div
          className="chart-stage relative origin-top-left"
          style={{
            width: CHART.imageWidth * scale,
            height: CHART.imageHeight * scale,
          }}
        >
          <img
            ref={imgRef}
            src={IMAGE_SRC}
            alt="AS350 B3e AMM page 9 Figure 1/3 weight and balance graph"
            width={CHART.imageWidth}
            height={CHART.imageHeight}
            crossOrigin="anonymous"
            className="block select-none"
            style={{
              width: CHART.imageWidth * scale,
              height: CHART.imageHeight * scale,
            }}
            draggable={false}
          />
          <svg
            ref={svgRef}
            viewBox={`0 0 ${CHART.imageWidth} ${CHART.imageHeight}`}
            width={CHART.imageWidth}
            height={CHART.imageHeight}
            onClick={onClick}
            onMouseMove={onMove}
            onMouseLeave={() => setTip(null)}
            className={cn(
              "chart-overlay absolute inset-0 size-full",
              readMode ? "cursor-crosshair" : "cursor-default",
            )}
            aria-label="Plotted weight and balance overlay"
          >
            <defs>
              <clipPath id="plot-clip">
                <rect
                  x={CHART.drawLeft}
                  y={CHART.drawTop}
                  width={CHART.drawRight - CHART.drawLeft}
                  height={CHART.drawBottom - CHART.drawTop}
                />
              </clipPath>
            </defs>

            <g clipPath="url(#plot-clip)">
              {connect && points.length > 1 ? (
                <HaloPolyline
                  points={points
                    .map((p) => {
                      const q = pos(p.weightKg, p.cgMm);
                      return `${q.x},${q.y}`;
                    })
                    .join(" ")}
                  color={OVERLAY.connect}
                  width={2.8}
                  dash="10 6"
                />
              ) : null}

              {showCgLine
                ? points.map((p) => {
                    const pt = pos(p.weightKg, p.cgMm);
                    return <CgConstruction key={`cg-${p.id}`} cgMm={p.cgMm} point={pt} />;
                  })
                : null}

              {showCgLine
                ? points.map((p) => {
                    const pt = pos(p.weightKg, p.cgMm);
                    return (
                      <HaloLine
                        key={`h-${p.id}`}
                        x1={CHART.plotLeft}
                        y1={pt.y}
                        x2={pt.x}
                        y2={pt.y}
                        color={OVERLAY.plot}
                        width={1.6}
                      />
                    );
                  })
                : null}

              {points.map((p) => {
                const pt = pos(p.weightKg, p.cgMm);
                return (
                  <g key={`pt-${p.id}`}>
                    {crosshair ? (
                      <HaloLine
                        x1={CHART.plotLeft}
                        y1={pt.y}
                        x2={pt.x}
                        y2={pt.y}
                        color={OVERLAY.cross}
                        width={1.6}
                        dash="7 6"
                      />
                    ) : null}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={6.2}
                      fill={OVERLAY.halo}
                      stroke={OVERLAY.ink}
                      strokeWidth={2}
                      vectorEffect="non-scaling-stroke"
                    />
                    <circle cx={pt.x} cy={pt.y} r={2.3} fill={OVERLAY.plot} />
                    <text
                      x={pt.x}
                      y={pt.y - 12}
                      textAnchor="middle"
                      fill={OVERLAY.ink}
                      stroke={OVERLAY.halo}
                      strokeWidth={3}
                      paintOrder="stroke"
                      fontSize={11}
                      fontWeight="bold"
                      fontFamily="IBM Plex Sans, Arial, sans-serif"
                    >
                      {p.id}
                    </text>
                  </g>
                );
              })}

              {readout ? (
                <g>
                  {(() => {
                    const pt = { x: readout.x, y: readout.y };
                    const lower = cgLineToPoint(readout.cgMm, pt);
                    const upper = indexRayFromPoint(pt);
                    return (
                      <>
                        {lower ? (
                          <HaloLine
                            x1={lower.bottom.x}
                            y1={lower.bottom.y}
                            x2={lower.top.x}
                            y2={lower.top.y}
                            color={OVERLAY.read}
                            width={1.6}
                            dash="4 4"
                          />
                        ) : null}
                        {upper ? (
                          <HaloLine
                            x1={upper.start.x}
                            y1={upper.start.y}
                            x2={upper.end.x}
                            y2={upper.end.y}
                            color={OVERLAY.read}
                            width={1.6}
                            dash="4 4"
                          />
                        ) : null}
                      </>
                    );
                  })()}
                  <circle
                    cx={readout.x}
                    cy={readout.y}
                    r={4}
                    fill={OVERLAY.read}
                    stroke={OVERLAY.halo}
                    strokeWidth={2}
                    vectorEffect="non-scaling-stroke"
                  />
                </g>
              ) : null}
            </g>
          </svg>
        </div>

        {points.length > 0 ? (
          <div className="chart-legend border-t border-black/10 bg-white px-4 py-3 text-black">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-black/55">
              Plotted points
            </p>
            <ul className="mt-2 space-y-1 font-mono text-[13px] tabular-nums">
              {points.map((p) => (
                <li key={p.id}>{formatPointLine(p)}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {readout ? (
        <div className="no-print rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-fg">
          Graph readout:{" "}
          <span className="font-mono tabular-nums">
            {readout.weightKg.toFixed(2)} kg ({kgToLb(readout.weightKg).toFixed(1)} lb) ·{" "}
            {readout.cgMm.toFixed(1)} mm ({mmToIn(readout.cgMm).toFixed(3)} in)
          </span>
          <span className="ml-2 text-muted">Approximate graph reading.</span>
        </div>
      ) : null}

      {lastZone ? <p className="sr-only">Last point is in the {lastZone} zone.</p> : null}

      {tip ? (
        <div
          className="pointer-events-none fixed z-30 rounded-md bg-fg px-2.5 py-1.5 font-mono text-xs text-bg shadow-lg"
          style={{ left: tip.x + 12, top: tip.y + 12 }}
        >
          {tip.text}
        </div>
      ) : null}

      {printUrl ? createPortal(<PrintSheet url={printUrl} />, document.body) : null}
    </div>
  );
}

function PrintSheet({ url }: { url: string }) {
  const imgRef = useRef<HTMLImageElement>(null);
  const printed = useRef(false);

  useEffect(() => {
    printed.current = false;
    const img = imgRef.current;
    if (!img) return;

    const go = () => {
      if (printed.current) return;
      printed.current = true;
      window.print();
    };

    if (img.complete && img.naturalWidth > 0) {
      const id = window.requestAnimationFrame(go);
      return () => window.cancelAnimationFrame(id);
    }
    img.addEventListener("load", go);
    return () => img.removeEventListener("load", go);
  }, [url]);

  return (
    <div className="print-sheet">
      <img ref={imgRef} src={url} alt="AS350 B3e Figure 1/3 with plotted points" />
    </div>
  );
}

function HaloLine({
  x1,
  y1,
  x2,
  y2,
  color,
  width,
  dash,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  width: number;
  dash?: string;
}) {
  const common = {
    x1,
    y1,
    x2,
    y2,
    fill: "none" as const,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    vectorEffect: "non-scaling-stroke" as const,
    strokeDasharray: dash,
  };
  return (
    <g>
      <line {...common} stroke={OVERLAY.halo} strokeWidth={width + 3.4} />
      <line {...common} stroke={color} strokeWidth={width} />
    </g>
  );
}

function HaloPolyline({
  points,
  color,
  width,
  dash,
}: {
  points: string;
  color: string;
  width: number;
  dash?: string;
}) {
  const common = {
    points,
    fill: "none" as const,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    vectorEffect: "non-scaling-stroke" as const,
    strokeDasharray: dash,
  };
  return (
    <g>
      <polyline {...common} stroke={OVERLAY.halo} strokeWidth={width + 3.4} />
      <polyline {...common} stroke={color} strokeWidth={width} />
    </g>
  );
}

function CgConstruction({ cgMm, point }: { cgMm: number; point: { x: number; y: number } }) {
  const lower = cgLineToPoint(cgMm, point);
  const upper = indexRayFromPoint(point);
  return (
    <g>
      {lower ? (
        <HaloLine
          x1={lower.bottom.x}
          y1={lower.bottom.y}
          x2={lower.top.x}
          y2={lower.top.y}
          color={OVERLAY.plot}
          width={2.4}
        />
      ) : null}
      {upper ? (
        <HaloLine
          x1={upper.start.x}
          y1={upper.start.y}
          x2={upper.end.x}
          y2={upper.end.y}
          color={OVERLAY.plot}
          width={2.4}
        />
      ) : null}
    </g>
  );
}

function ZoomButtons() {
  const zoom = usePlotStore((s) => s.zoom);
  const setZoom = usePlotStore((s) => s.setZoom);
  return (
    <>
      <button
        type="button"
        className="h-9 rounded-sm border border-border bg-surface-2 px-3 text-sm text-fg hover:bg-surface"
        onClick={() => setZoom(zoom / 1.25)}
      >
        Zoom −
      </button>
      <button
        type="button"
        className="h-9 rounded-sm border border-border bg-surface-2 px-3 text-sm text-fg hover:bg-surface"
        onClick={() => setZoom(zoom * 1.25)}
      >
        Zoom +
      </button>
      <button
        type="button"
        className="h-9 rounded-sm border border-border bg-surface-2 px-3 text-sm text-fg hover:bg-surface"
        onClick={() => setZoom(1)}
      >
        Reset
      </button>
    </>
  );
}
