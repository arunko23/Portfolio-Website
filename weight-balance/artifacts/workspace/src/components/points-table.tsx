import { Button } from "@/components/ui/button";
import { kgToLb, mmToIn, pointZone, pos } from "@/lib/chart-geometry";
import { usePlotStore } from "@/lib/plot-store";

export function PointsTable() {
  const points = usePlotStore((s) => s.points);
  const removePoint = usePlotStore((s) => s.removePoint);

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-muted">
        Plotted points
      </h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-[0.08em] text-muted">
              <th className="py-2 pr-3 font-medium">Point</th>
              <th className="py-2 pr-3 font-medium">Weight</th>
              <th className="py-2 pr-3 font-medium">kg</th>
              <th className="py-2 pr-3 font-medium">lb</th>
              <th className="py-2 pr-3 font-medium">CG mm</th>
              <th className="py-2 pr-3 font-medium">CG inch</th>
              <th className="py-2 pr-3 font-medium">Zone</th>
              <th className="py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {points.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-6 text-muted">
                  No points plotted.
                </td>
              </tr>
            ) : (
              points.map((p) => {
                const zone = pointZone(pos(p.weightKg, p.cgMm));
                return (
                  <tr key={p.id} className="border-b border-border/70">
                    <td className="py-2.5 pr-3 font-medium">P{p.id}</td>
                    <td className="py-2.5 pr-3 font-mono tabular-nums">
                      {p.rawWeight} {p.weightUnit}
                    </td>
                    <td className="py-2.5 pr-3 font-mono tabular-nums">{p.weightKg.toFixed(3)}</td>
                    <td className="py-2.5 pr-3 font-mono tabular-nums">
                      {kgToLb(p.weightKg).toFixed(3)}
                    </td>
                    <td className="py-2.5 pr-3 font-mono tabular-nums">{p.cgMm.toFixed(3)}</td>
                    <td className="py-2.5 pr-3 font-mono tabular-nums">
                      {mmToIn(p.cgMm).toFixed(4)}
                    </td>
                    <td className="py-2.5 pr-3">
                      <span className={zone === "BALLAST" ? "text-good" : "text-warn"}>
                        {zone}
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => removePoint(p.id)}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
