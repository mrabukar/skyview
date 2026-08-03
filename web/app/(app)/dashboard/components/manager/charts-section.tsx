import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LineArea } from "@/components/charts/line-area";
import type { ManagerDashboardCharts } from "@/types/reports/manager-dashboard";

interface Props {
  charts: ManagerDashboardCharts;
}

function thinDateLabels(dates: string[], step = 2): string[] {
  return dates.map((date, i) => {
    if (i === 0 || i === dates.length - 1 || i % step === 0) {
      return date.slice(5);
    }
    return "";
  });
}

export function ManagerChartsSection({ charts }: Props) {
  const { salesTrend } = charts;

  return (
    <div className="mb-16">
      <Card title="Sales Trend (14 days)" pad>
        {salesTrend.length > 0 ? (
          <LineArea
            values={salesTrend.map((row) => row.revenue)}
            labels={thinDateLabels(salesTrend.map((row) => row.date))}
            height={200}
            color="var(--brand-indigo)"
            valueLabel="Sales"
          />
        ) : (
          <EmptyState title="No sales trend" sub="No sales recorded in the last 14 days." />
        )}
      </Card>
    </div>
  );
}
