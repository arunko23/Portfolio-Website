import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Calculator,
  Check,
  Eraser,
  Minus,
  Plus,
  Printer,
  RotateCcw,
  Download,
} from "lucide-react";
import { PlotterCanvas } from "@/components/plotter-canvas";
import {
  RANGES,
  calculatePlot,
  inRange,
  type PlotResult,
} from "@/lib/geometry";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({ component: Home });

const DEFAULTS = { nr: 394, tq: 80, pa: 5000, ng: 97.5, oat: 20 };

type PrintOrient = "portrait" | "landscape";
type PrintPaper = "A4" | "letter";

const PRINT_STYLE_ID = "print-page-rule";

function applyPrintPage(paper: PrintPaper, orient: PrintOrient) {
  document.documentElement.dataset.printPaper = paper;
  document.documentElement.dataset.printOrient = orient;
  let style = document.getElementById(PRINT_STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = PRINT_STYLE_ID;
    document.head.appendChild(style);
  }
  // Browser print dialogs honour @page size. Portrait is the flight-manual format.
  style.textContent = `@page { size: ${paper} ${orient}; margin: 8mm; }`;
}

function Home() {
  const [nr, setNr] = useState(String(DEFAULTS.nr));
  const [tq, setTq] = useState(String(DEFAULTS.tq));
  const [pa, setPa] = useState(String(DEFAULTS.pa));
  const [ng, setNg] = useState(String(DEFAULTS.ng));
  const [oat, setOat] = useState(String(DEFAULTS.oat));
  const [plot, setPlot] = useState<PlotResult | null>(() =>
    calculatePlot(DEFAULTS.nr, DEFAULTS.tq, DEFAULTS.pa, DEFAULTS.ng, DEFAULTS.oat),
  );
  const [error, setError] = useState<string | null>(null);
  const [showLabels, setShowLabels] = useState(true);
  const [readout, setReadout] = useState(false);
  const [pixel, setPixel] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [printOrient, setPrintOrient] = useState<PrintOrient>("portrait");
  const [printPaper, setPrintPaper] = useState<PrintPaper>("A4");
  const printDateRef = useRef<HTMLSpanElement>(null);

  const nums = useMemo(
    () => ({
      nr: Number(nr),
      tq: Number(tq),
      pa: Number(pa),
      ng: Number(ng),
      oat: Number(oat),
    }),
    [nr, tq, pa, ng, oat],
  );

  useEffect(() => {
    const { nr: n, tq: t, pa: p, ng: g, oat: o } = nums;
    if ([n, t, p, g, o].some((v) => !Number.isFinite(v))) return;
    if (!inRange(n, t, p, g, o)) return;
    setError(null);
    setPlot(calculatePlot(n, t, p, g, o));
  }, [nums]);

  useEffect(() => {
    applyPrintPage(printPaper, printOrient);
    const stamp = () => {
      if (printDateRef.current) {
        printDateRef.current.textContent =
          " · " +
          new Date().toLocaleString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
      }
    };
    window.addEventListener("beforeprint", stamp);
    return () => window.removeEventListener("beforeprint", stamp);
  }, [printPaper, printOrient]);

  function runPlot() {
    const { nr: n, tq: t, pa: p, ng: g, oat: o } = nums;
    if ([n, t, p, g, o].some((v) => !Number.isFinite(v))) {
      setError("Enter all five values.");
      return;
    }
    if (!inRange(n, t, p, g, o)) {
      setError(
        "Outside the digitized chart: NR 380–400, TQ 50–95%, PA 0–10,000 ft, NG 90–100%, OAT −30 to +50°C.",
      );
      return;
    }
    setError(null);
    setPlot(calculatePlot(n, t, p, g, o));
  }

  function clearAll() {
    setPlot(null);
    setError(null);
    setPixel(null);
  }

  function exportCsv() {
    const { nr: n, tq: t, pa: pAlt, ng: g, oat: o } = nums;
    let p = plot;
    if (!p) {
      if ([n, t, pAlt, g, o].some((v) => !Number.isFinite(v)) || !inRange(n, t, pAlt, g, o)) {
        runPlot();
        return;
      }
      p = calculatePlot(n, t, pAlt, g, o);
      setPlot(p);
    }
    const rows = [
      ["NR", "TQ", "PA_ft", "NG", "OAT_C", "BottomX_px", "MiddleX_px", "NG_OAT_X_px", "BoundaryY_px", "Final"],
      [p.nr, p.tq, p.pa, p.ng, p.oat, p.bx, p.mx, p.gx, p.fy, p.cls],
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "AS350_B2_Engine_Power_Check.csv";
    a.click();
  }

  function printChart() {
    if (!plot) runPlot();
    applyPrintPage(printPaper, printOrient);
    requestAnimationFrame(() => window.print());
  }

  const result = plot?.cls;
  const ngNote =
    plot && plot.ng !== plot.ngLo && plot.ng !== plot.ngHi
      ? `NG ${plot.ng}% is interpolated between the printed ${plot.ngLo}% and ${plot.ngHi}% curves.`
      : plot
        ? `NG ${plot.ng}% is locked to the printed ${plot.ng}% curve.`
        : null;

  return (
    <div className="app-shell min-h-screen bg-bg text-fg">
      <header className="no-print bg-ink text-paper px-5 py-4 sm:px-7">
        <p className="text-xs font-medium tracking-[0.18em] text-paper/55 uppercase">
          Eurocopter / Airbus Helicopters · Figure 1
        </p>
        <h1 className="mt-1 text-[1.45rem] leading-tight font-semibold tracking-tight sm:text-[1.7rem]">
          AS350 B2 — Engine Power Check Plotter
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-paper/70">
          Construction follows the printed chart: TQ × NR in the bottom graph,
          a family-parallel curve through the middle graph to pressure altitude,
          then OAT × NG in the top graph against the CORRECT / INCORRECT boundary.
        </p>
      </header>

      <main className="print-main mx-auto grid max-w-[1500px] gap-4 p-4 lg:grid-cols-[300px_1fr] lg:items-start">
        <aside className="no-print lg:sticky lg:top-3">
          <section className="rounded-xl border border-border bg-bg-elevated p-4 shadow-(--shadow-panel)">
            <h2 className="mb-3 text-[11px] font-semibold tracking-[0.14em] text-fg-muted uppercase">
              Power-check parameters
            </h2>
            <Field label="NR — Rotor RPM" hint={RANGES.nr.label}>
              <Num value={nr} onChange={setNr} step={0.1} onEnter={runPlot} />
            </Field>
            <Field label="TQ — Torque (%)" hint={RANGES.tq.label}>
              <Num value={tq} onChange={setTq} step={0.1} onEnter={runPlot} />
            </Field>
            <Field label="PA / Hp — Pressure altitude (ft)" hint={RANGES.pa.label}>
              <Num value={pa} onChange={setPa} step={100} onEnter={runPlot} />
            </Field>
            <Field label="NG — Gas generator speed (%)" hint="Printed family 91–98">
              <Num value={ng} onChange={setNg} step={0.1} onEnter={runPlot} />
            </Field>
            <Field label="OAT — Outside air temperature (°C)" hint={RANGES.oat.label}>
              <Num value={oat} onChange={setOat} step={1} onEnter={runPlot} />
            </Field>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={runPlot}
                className="col-span-2 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-accent px-3 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-hover"
              >
                <Calculator className="size-4" strokeWidth={2} />
                Plot power check
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-bg-inset px-3 text-sm font-semibold text-fg transition-colors hover:bg-border"
              >
                <Eraser className="size-3.5" />
                Clear
              </button>
              <button
                type="button"
                onClick={exportCsv}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-bg-inset px-3 text-sm font-semibold text-fg transition-colors hover:bg-border"
              >
                <Download className="size-3.5" />
                CSV
              </button>
            </div>

            <div className="mt-4 rounded-lg border border-border bg-bg px-3 py-3">
              <p className="mb-2 text-[11px] font-semibold tracking-[0.14em] text-fg-muted uppercase">
                Print options
              </p>
              <p className="mb-2 text-[11px] leading-snug text-fg-muted">
                Portrait matches the flight-manual page. The print dialog used to
                lock to landscape — choose orientation here and it will stick.
              </p>
              <p className="mb-1.5 text-[11px] font-semibold text-fg">Orientation</p>
              <div className="mb-3 grid grid-cols-2 gap-1.5">
                <SegBtn
                  active={printOrient === "portrait"}
                  onClick={() => setPrintOrient("portrait")}
                  label="Portrait"
                />
                <SegBtn
                  active={printOrient === "landscape"}
                  onClick={() => setPrintOrient("landscape")}
                  label="Landscape"
                />
              </div>
              <p className="mb-1.5 text-[11px] font-semibold text-fg">Paper</p>
              <div className="mb-3 grid grid-cols-2 gap-1.5">
                <SegBtn
                  active={printPaper === "A4"}
                  onClick={() => setPrintPaper("A4")}
                  label="A4"
                />
                <SegBtn
                  active={printPaper === "letter"}
                  onClick={() => setPrintPaper("letter")}
                  label="Letter"
                />
              </div>
              <button
                type="button"
                onClick={printChart}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent px-3 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-hover"
              >
                <Printer className="size-4" />
                Print {printOrient === "portrait" ? "portrait" : "landscape"}
              </button>
            </div>

            {error ? (
              <p className="mt-3 rounded-md border border-incorrect/30 bg-incorrect-bg px-3 py-2 text-xs font-medium text-incorrect">
                {error}
              </p>
            ) : null}

            <label className="mt-4 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showLabels}
                onChange={(e) => setShowLabels(e.target.checked)}
                className="size-4 accent-accent"
              />
              Show construction labels
            </label>
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={readout}
                onChange={(e) => setReadout(e.target.checked)}
                className="size-4 accent-accent"
              />
              Click chart for pixel readout
            </label>
            {pixel ? (
              <p className="mt-2 font-mono text-xs text-fg-muted">{pixel}</p>
            ) : null}

            <div className="mt-4 rounded-lg border border-border bg-bg px-3 py-3">
              <p className="mb-2 text-[11px] font-semibold tracking-[0.14em] text-fg-muted uppercase">
                Construction
              </p>
              <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 font-mono text-xs">
                <dt className="text-fg-muted">Bottom TQ × NR</dt>
                <dd>{plot ? `x ${plot.bx.toFixed(1)}` : "—"}</dd>
                <dt className="text-fg-muted">PA transfer</dt>
                <dd>{plot ? `x ${plot.mx.toFixed(1)}` : "—"}</dd>
                <dt className="text-fg-muted">OAT × NG</dt>
                <dd>{plot ? `x ${plot.gx.toFixed(1)}` : "—"}</dd>
                <dt className="text-fg-muted">Final point</dt>
                <dd>
                  {plot ? `x ${plot.mx.toFixed(1)}, y ${plot.fy.toFixed(1)}` : "—"}
                </dd>
              </dl>
              <div
                className={cn(
                  "mt-3 rounded-md border px-3 py-2 text-center text-[15px] font-semibold",
                  result === "CORRECT" &&
                    "border-correct/30 bg-correct-bg text-correct",
                  result === "INCORRECT" &&
                    "border-incorrect/30 bg-incorrect-bg text-incorrect",
                  !result && "border-border bg-bg-elevated text-fg-muted",
                )}
              >
                {result === "CORRECT" ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Check className="size-4" /> Power check — CORRECT
                  </span>
                ) : result === "INCORRECT" ? (
                  "Power check — INCORRECT"
                ) : (
                  "Enter values"
                )}
              </div>
              {ngNote ? (
                <p className="mt-2 text-[11px] leading-snug text-fg-muted">{ngNote}</p>
              ) : null}
            </div>

            <p className="mt-3 rounded-md border border-[#ead68a] bg-[#fff8dc] px-3 py-2 text-[11px] leading-relaxed text-[#604f00]">
              Middle-graph construction follows the digitized printed curve family
              (same curvature as the neighbouring PA lines). Top-graph NG is
              interpolated between the printed 91–98% lines, so 96.5% always sits
              between 96% and 97%.
            </p>
          </section>
        </aside>

        <section className="min-w-0">
          <div className="print-chart-panel rounded-xl border border-border bg-bg-elevated p-3 shadow-(--shadow-panel) sm:p-4">
            <div className="print-only print-header">
              <div className="print-header-row">
                <div>
                  <p className="print-kicker">
                    Eurocopter / Airbus Helicopters · Figure 1
                    <span ref={printDateRef} />
                  </p>
                  <h1>AS350 B2 — Engine Power Check</h1>
                </div>
                {plot ? (
                  <div
                    className={cn(
                      "print-result",
                      plot.cls === "CORRECT"
                        ? "print-result-correct"
                        : "print-result-incorrect",
                    )}
                  >
                    {plot.cls}
                  </div>
                ) : null}
              </div>
              <table className="print-params">
                <thead>
                  <tr>
                    <th>NR</th>
                    <th>TQ</th>
                    <th>PA</th>
                    <th>NG</th>
                    <th>OAT</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{plot ? plot.nr : nums.nr}</td>
                    <td>{plot ? `${plot.tq}%` : `${nums.tq}%`}</td>
                    <td>{plot ? `${plot.pa} ft` : `${nums.pa} ft`}</td>
                    <td>{plot ? `${plot.ng}%` : `${nums.ng}%`}</td>
                    <td>
                      {plot
                        ? `${plot.oat >= 0 ? "+" : ""}${plot.oat} °C`
                        : `${nums.oat >= 0 ? "+" : ""}${nums.oat} °C`}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="no-print mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-1.5">
                <IconBtn
                  label="Zoom out"
                  onClick={() => setZoom((z) => Math.max(0.75, z / 1.25))}
                >
                  <Minus className="size-3.5" />
                </IconBtn>
                <IconBtn
                  label="Zoom in"
                  onClick={() => setZoom((z) => Math.min(2.5, z * 1.25))}
                >
                  <Plus className="size-3.5" />
                </IconBtn>
                <IconBtn label="Reset zoom" onClick={() => setZoom(1)}>
                  <RotateCcw className="size-3.5" />
                </IconBtn>
              </div>
              <p className="text-[11px] text-fg-subtle">
                Printed chart is fixed. Coloured lines are the calculation overlay.
              </p>
            </div>
            <div className="print-chart-frame overflow-auto rounded-lg border border-border-strong bg-white">
              <PlotterCanvas
                plot={plot}
                showLabels={showLabels}
                readout={readout}
                zoom={zoom}
                onReadout={(x, y) =>
                  setPixel(`Chart pixel  X ${x.toFixed(1)}  Y ${y.toFixed(1)}`)
                }
              />
            </div>
            <p className="print-only print-disclaimer">
              For engineering / reference use only. Digitized plotting aid — not an
              approved aircraft performance calculation method. Verify against the
              current approved Flight Manual / maintenance documentation.
            </p>
            <div className="no-print mt-2 flex flex-wrap gap-4 text-[11px] text-fg-muted">
              <Legend swatch="bg-line-blue" label="Input / transfer" />
              <Legend swatch="bg-line-red" label="Family-parallel construction" />
              <Legend swatch="bg-correct" label="Final CORRECT indicator" />
            </div>
          </div>

          <div className="no-print mt-4 overflow-x-auto rounded-xl border border-border bg-bg-elevated p-4 shadow-(--shadow-panel)">
            <h2 className="mb-2 text-[11px] font-semibold tracking-[0.14em] text-fg-muted uppercase">
              Current values
            </h2>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[11px] tracking-wide text-fg-muted uppercase">
                  <th className="pb-2 font-semibold">NR</th>
                  <th className="pb-2 font-semibold">TQ</th>
                  <th className="pb-2 font-semibold">PA</th>
                  <th className="pb-2 font-semibold">NG</th>
                  <th className="pb-2 font-semibold">OAT</th>
                  <th className="pb-2 font-semibold">Classification</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                <tr className="border-t border-border">
                  <td className="py-2">{plot ? plot.nr : nums.nr}</td>
                  <td>{plot ? `${plot.tq}%` : `${nums.tq}%`}</td>
                  <td>{plot ? `${plot.pa} ft` : `${nums.pa} ft`}</td>
                  <td>{plot ? `${plot.ng}%` : `${nums.ng}%`}</td>
                  <td>
                    {plot
                      ? `${plot.oat >= 0 ? "+" : ""}${plot.oat} °C`
                      : `${nums.oat >= 0 ? "+" : ""}${nums.oat} °C`}
                  </td>
                  <td
                    className={cn(
                      "font-sans font-semibold",
                      plot?.cls === "CORRECT" && "text-correct",
                      plot?.cls === "INCORRECT" && "text-incorrect",
                    )}
                  >
                    {plot?.cls ?? "—"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <footer className="no-print px-5 pb-8 text-center text-[11px] text-fg-subtle">
        For engineering / reference use only. This is a digitized plotting aid,
        not an approved aircraft performance calculation method. Verify all
        readings and limits against the current approved Flight Manual /
        maintenance documentation.
      </footer>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="mb-2.5 block">
      <span className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-semibold">{label}</span>
        {hint ? <span className="text-[10px] text-fg-subtle">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}

function Num({
  value,
  onChange,
  step,
  onEnter,
}: {
  value: string;
  onChange: (v: string) => void;
  step: number;
  onEnter: () => void;
}) {
  return (
    <input
      type="number"
      step={step}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onEnter();
      }}
      className="h-11 w-full rounded-lg border border-border-strong bg-bg-elevated px-3 font-mono text-[15px] text-fg outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-accent/20"
    />
  );
}

function IconBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="inline-flex size-9 items-center justify-center rounded-md border border-border bg-bg-inset text-fg transition-colors hover:bg-border"
    >
      {children}
    </button>
  );
}

function SegBtn({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center justify-center rounded-md border text-[12px] font-semibold transition-colors",
        active
          ? "border-accent bg-accent text-accent-fg"
          : "border-border bg-bg-elevated text-fg hover:bg-bg-inset",
      )}
    >
      {label}
    </button>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <i className={cn("inline-block h-[3px] w-5 rounded-full", swatch)} />
      {label}
    </span>
  );
}
