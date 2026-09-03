import { cn } from "@/lib/utils";

function SkeletonBar({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={cn("dt-skeleton", className)}
      aria-hidden="true"
      style={style}
    />
  );
}

/** Mirrors KpiCard's anatomy — label first, icon right, sparkline track —
 *  so the grid does not jump when real data replaces the skeleton. */
function KpiCardSkeleton() {
  return (
    <div className="kpi-card">
      <div className="kpi-head">
        <SkeletonBar style={{ width: 72, height: 10, maxWidth: 72 }} />
        <SkeletonBar
          style={{ width: 15, height: 15, borderRadius: 3, maxWidth: 15 }}
        />
      </div>
      <div className="kpi-inner">
        <div className="kpi-valrow">
          <SkeletonBar style={{ width: "70%", height: 18, maxWidth: 96 }} />
        </div>
        <div className="kpi-footer">
          <SkeletonBar style={{ width: 60, height: 10, maxWidth: 60 }} />
        </div>
      </div>
      <div className="kpi-spark" aria-hidden />
    </div>
  );
}

function PnlBreakdownSkeleton() {
  return (
    <div className="card">
      <div className="card-head">
        <SkeletonBar style={{ width: 140, height: 14, maxWidth: 140 }} />
      </div>
      <div className="card-pad">
        <ul className="pnl">
          {Array.from({ length: 6 }).map((_, index) => (
            <li className="pnl-row" key={`pnl-row-${index}`}>
              <SkeletonBar style={{ width: "70%", height: 12, maxWidth: 150 }} />
              <SkeletonBar style={{ width: "100%", height: 8, maxWidth: "none" }} />
              <SkeletonBar style={{ width: 68, height: 12, maxWidth: 68 }} />
              <SkeletonBar style={{ width: 34, height: 10, maxWidth: 34 }} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ChartCardSkeleton({ height = 220 }: { height?: number }) {
  return (
    <div className="card">
      <div className="card-head">
        <SkeletonBar style={{ width: 220, height: 16, maxWidth: 220 }} />
      </div>
      <div className="card-pad">
        <SkeletonBar style={{ width: "100%", height, maxWidth: "none" }} />
      </div>
    </div>
  );
}

export function FinancialLoadingSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading financial summary">
      <div className="mb-16 space-y-3">
        <div className="stat-grid gap-3 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <KpiCardSkeleton key={`stat-top-${index}`} />
          ))}
        </div>
        <div className="stat-grid gap-3 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <KpiCardSkeleton key={`stat-mid-${index}`} />
          ))}
        </div>
      </div>

      <div className="mb-3">
        <PnlBreakdownSkeleton />
      </div>

      <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        <ChartCardSkeleton height={200} />
        <ChartCardSkeleton height={180} />
        <ChartCardSkeleton height={180} />
      </div>

      <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        <ChartCardSkeleton height={180} />
        <ChartCardSkeleton height={180} />
        <ChartCardSkeleton height={180} />
      </div>

      <div className="mb-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <ChartCardSkeleton height={180} />
        <ChartCardSkeleton height={180} />
      </div>

      <div className="rounded-[10px] border border-border bg-muted p-1 pt-0">
        <div className="px-2 py-1.5">
          <SkeletonBar style={{ width: 48, height: 10, maxWidth: 48 }} />
        </div>
        <div className="grid grid-cols-2 gap-1.5 md:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={`health-${index}`}
              className="flex min-w-0 flex-col gap-1.5 rounded-lg border border-border bg-card px-3 py-2.5"
            >
              <SkeletonBar style={{ width: 88, height: 10, maxWidth: 88 }} />
              <SkeletonBar style={{ width: "55%", height: 18, maxWidth: 80 }} />
              <SkeletonBar style={{ width: "100%", height: 4, maxWidth: "none" }} />
              <SkeletonBar style={{ width: 64, height: 10, maxWidth: 64 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
