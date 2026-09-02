import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LineArea } from "@/components/charts/line-area";
import type { AdminDashboardCharts } from "@/types/reports/admin-dashboard";

const fmtPct = (v: number) => `${v.toFixed(1)}%`;

interface Props {
  charts: AdminDashboardCharts;
}

export function AdminPerformanceCharts({ charts }: Props) {
  return (
    <div className="mb-3 grid grid-cols-1 items-stretch gap-3 lg:grid-cols-2">
      <Card title="Gross Margin Trend" pad className="h-full min-w-0">
        {charts.grossMarginTrend.length > 0 ? (
          <LineArea
            values={charts.grossMarginTrend.map((r) => r.percent)}
            labels={charts.grossMarginTrend.map((r) => r.month)}
            height={160}
            color="var(--brand-violet)"
            valueLabel="Gross Margin"
            formatValue={fmtPct}
            target={40}
            targetLabel="target 40%"
          />
        ) : (
          <EmptyState title="No margin data" sub="Not enough data for this period." />
        )}
      </Card>
      <Card title="Net Margin Trend" pad className="h-full min-w-0">
        {charts.profitMarginTrend.length > 0 ? (
          <LineArea
            values={charts.profitMarginTrend.map((r) => r.percent)}
            labels={charts.profitMarginTrend.map((r) => r.month)}
            height={160}
            color="var(--status-rose)"
            valueLabel="Net Margin"
            formatValue={fmtPct}
            target={10}
            targetLabel="target 10%"
          />
        ) : (
          <EmptyState title="No margin data" sub="Not enough data for this period." />
        )}
      </Card>
    </div>
  );
}
