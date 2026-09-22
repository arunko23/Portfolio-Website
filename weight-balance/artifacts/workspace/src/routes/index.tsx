import { createFileRoute } from "@tanstack/react-router";
import { ControlPanel } from "@/components/control-panel";
import { PlotCanvas } from "@/components/plot-canvas";
import { PointsTable } from "@/components/points-table";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <div className="app-screen min-h-dvh bg-bg text-fg">
      <header className="no-print border-b border-border bg-surface px-5 py-4 sm:px-8">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink">
          Airbus Helicopters · AMM Figure 1/3
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          AS350 B3e Weight & Balance
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Exact page-9 graph. Enter a CG and the overlay follows the printed millimetre line
          from the bottom scale to the top scale — including values that fall between marks.
        </p>
      </header>

      <main className="app-main mx-auto max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8">
        <div className="app-grid grid items-start gap-5 lg:grid-cols-[minmax(16.5rem,20rem)_1fr]">
          <div className="no-print">
            <ControlPanel />
          </div>
          <div className="app-chart-col flex min-w-0 flex-col gap-4">
            <section className="chart-panel rounded-xl border border-border bg-surface p-3 sm:p-4">
              <PlotCanvas />
            </section>
            <div className="no-print">
              <PointsTable />
            </div>
          </div>
        </div>
      </main>

      <footer className="no-print px-6 pb-8 text-center text-xs text-subtle">
        For engineering and reference use only. Verify against the current approved aircraft
        Weight & Balance documentation before operational use.
      </footer>
    </div>
  );
}
