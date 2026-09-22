import { useMemo, useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  inChartRange,
  kgToLb,
  lbToKg,
  mmToIn,
  inToMm,
  neighbouringMarks,
  pointZone,
  pos,
} from "@/lib/chart-geometry";
import { usePlotStore, type CgUnit, type WeightUnit } from "@/lib/plot-store";

function exportCsv() {
  const points = usePlotStore.getState().points;
  const rows = [
    [
      "Point",
      "Weight entered",
      "Weight unit",
      "Weight kg",
      "Weight lb",
      "CG entered",
      "CG unit",
      "CG mm",
      "CG inch",
    ],
  ];
  for (const p of points) {
    rows.push([
      String(p.id),
      String(p.rawWeight),
      p.weightUnit,
      String(p.weightKg),
      String(kgToLb(p.weightKg)),
      String(p.rawCg),
      p.cgUnit,
      String(p.cgMm),
      String(mmToIn(p.cgMm)),
    ]);
  }
  const csv = rows.map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = "AS350_B3E_Page9_Points.csv";
  a.click();
}

export function ControlPanel() {
  const addPoint = usePlotStore((s) => s.addPoint);
  const clearLast = usePlotStore((s) => s.clearLast);
  const clearAll = usePlotStore((s) => s.clearAll);
  const requestPrint = usePlotStore((s) => s.requestPrint);
  const points = usePlotStore((s) => s.points);
  const connect = usePlotStore((s) => s.connect);
  const crosshair = usePlotStore((s) => s.crosshair);
  const showCgLine = usePlotStore((s) => s.showCgLine);
  const readMode = usePlotStore((s) => s.readMode);
  const setConnect = usePlotStore((s) => s.setConnect);
  const setCrosshair = usePlotStore((s) => s.setCrosshair);
  const setShowCgLine = usePlotStore((s) => s.setShowCgLine);
  const setReadMode = usePlotStore((s) => s.setReadMode);

  const [weight, setWeight] = useState("1200");
  const [weightUnit, setWeightUnit] = useState<WeightUnit>("kg");
  const [cg, setCg] = useState("3550");
  const [cgUnit, setCgUnit] = useState<CgUnit>("mm");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const w0 = parseFloat(weight);
    const c0 = parseFloat(cg);
    if (!Number.isFinite(w0) || !Number.isFinite(c0)) {
      setError("Enter valid weight and CG values.");
      return;
    }
    const weightKg = weightUnit === "lb" ? lbToKg(w0) : w0;
    const cgMm = cgUnit === "in" ? inToMm(c0) : c0;
    if (!inChartRange(weightKg, cgMm)) {
      setError("That position is outside the plotted page-9 chart range.");
      return;
    }
    setError(null);
    addPoint({
      rawWeight: w0,
      weightUnit,
      rawCg: c0,
      cgUnit,
      weightKg,
      cgMm,
    });
  }

  const last = points[points.length - 1];
  const lastPt = last ? pos(last.weightKg, last.cgMm) : null;
  const zone = lastPt ? pointZone(lastPt) : null;
  const neighbours = last ? neighbouringMarks(last.cgMm) : null;

  const status = useMemo(() => {
    if (!last || !zone) return { label: "No point plotted", tone: "neutral" as const };
    if (zone === "BALLAST") {
      return { label: "Ballast zone", tone: "good" as const };
    }
    return { label: "No-ballast zone", tone: "warn" as const };
  }, [last, zone]);

  return (
    <aside className="flex flex-col gap-5 rounded-xl border border-border bg-surface p-5 lg:sticky lg:top-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink">Plot a point</p>
        <h2 className="mt-1 font-display text-lg font-semibold tracking-tight text-fg">
          Weight & CG
        </h2>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="weight">Weight</Label>
          <div className="grid grid-cols-[1fr_4.75rem] gap-1.5">
            <Input
              id="weight"
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="e.g. 1200"
            />
            <select
              aria-label="Weight unit"
              value={weightUnit}
              onChange={(e) => setWeightUnit(e.target.value as WeightUnit)}
              className="h-11 rounded-md border border-border bg-surface px-2 text-sm text-fg"
            >
              <option value="kg">kg</option>
              <option value="lb">lb</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="cg">CG / Balance</Label>
          <div className="grid grid-cols-[1fr_4.75rem] gap-1.5">
            <Input
              id="cg"
              inputMode="decimal"
              value={cg}
              onChange={(e) => setCg(e.target.value)}
              placeholder="e.g. 3550"
            />
            <select
              aria-label="CG unit"
              value={cgUnit}
              onChange={(e) => setCgUnit(e.target.value as CgUnit)}
              className="h-11 rounded-md border border-border bg-surface px-2 text-sm text-fg"
            >
              <option value="mm">mm</option>
              <option value="in">inch</option>
            </select>
          </div>
        </div>

        {error ? <p className="text-sm text-bad">{error}</p> : null}

        <div className="grid grid-cols-2 gap-2">
          <Button type="submit" variant="primary" className="col-span-2">
            Plot point
          </Button>
          <Button type="button" onClick={clearLast}>
            Clear last
          </Button>
          <Button type="button" variant="danger" onClick={clearAll}>
            Clear all
          </Button>
          <Button type="button" onClick={requestPrint}>
            Print graph
          </Button>
          <Button type="button" onClick={exportCsv}>
            Export CSV
          </Button>
        </div>
      </form>

      <div className="flex flex-col gap-2.5 border-t border-border pt-4">
        <CheckRow
          id="connect"
          checked={connect}
          onChange={setConnect}
          label="Connect plotted points"
        />
        <CheckRow
          id="crosshair"
          checked={crosshair}
          onChange={setCrosshair}
          label="Show crosshair"
        />
        <CheckRow
          id="cgline"
          checked={showCgLine}
          onChange={setShowCgLine}
          label="Show CG line (bottom → point → 12–40 family)"
        />
        <CheckRow
          id="read"
          checked={readMode}
          onChange={setReadMode}
          label="Click graph to read position"
        />
      </div>

      <div className="rounded-lg border border-border bg-surface-2 p-4">
        <p className="text-xs font-medium uppercase tracking-[0.1em] text-muted">Current point</p>
        {last ? (
          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
            <dt className="text-muted">Weight</dt>
            <dd className="text-right font-mono tabular-nums">
              {last.rawWeight} {last.weightUnit}
            </dd>
            <dt className="text-muted">Weight kg</dt>
            <dd className="text-right font-mono tabular-nums">{last.weightKg.toFixed(2)} kg</dd>
            <dt className="text-muted">CG</dt>
            <dd className="text-right font-mono tabular-nums">
              {last.rawCg} {last.cgUnit}
            </dd>
            <dt className="text-muted">CG inch</dt>
            <dd className="text-right font-mono tabular-nums">{mmToIn(last.cgMm).toFixed(3)} in</dd>
          </dl>
        ) : (
          <p className="mt-3 text-sm text-muted">No point plotted</p>
        )}
        <div className="mt-3">
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>
        {neighbours && last ? (
          <p className="mt-3 text-xs leading-relaxed text-muted">
            Line sits between the printed <span className="text-fg">{neighbours.left}</span> and{" "}
            <span className="text-fg">{neighbours.right}</span> millimetre marks, at{" "}
            {(
              ((last.cgMm - neighbours.left) / (neighbours.right - neighbours.left)) *
              100
            ).toFixed(1)}
            % of that span.
          </p>
        ) : last ? (
          <p className="mt-3 text-xs leading-relaxed text-muted">
            Line locked to the printed {last.cgMm} mm mark from the bottom
            scale up to the point, then parallel to the 12–40 family.
          </p>
        ) : null}
      </div>

      <p className="text-xs leading-relaxed text-subtle">
        Plotted lines follow the printed millimetre mark up to the weight, then
        run parallel to the numbered 12 / 14 / 16 … 40 family. Use Print graph
        for a clean A4 landscape sheet.
      </p>
    </aside>
  );
}

function CheckRow({
  id,
  checked,
  onChange,
  label,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-2.5 text-sm text-fg">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 accent-fg"
        suppressHydrationWarning
      />
      {label}
    </label>
  );
}
