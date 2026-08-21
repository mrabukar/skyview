import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Donut } from "@/components/charts/donut";
import { LineArea } from "@/components/charts/line-area";
import { DONUT_COLORS } from "../donut-colors";
import { fmt } from "@/lib/utils";
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
  const { salesTrend, expenseBreakdown, stockByCategory } = charts;

  const expenseDonut = (expenseBreakdown ?? []).map((row, i) => ({
    label: row.categoryName,
    value: row.amount,
    color: DONUT_COLORS[i % DONUT_COLORS.length],
  }));

  const expenseTotal = (expenseBreakdown ?? []).reduce(
    (sum, row) => sum + row.amount,
    0,
  );

  const stockDonut = (stockByCategory ?? []).map((row, i) => ({
    label: row.categoryName,
    value: row.units,
    color: DONUT_COLORS[i % DONUT_COLORS.length],
  }));

  const stockTotal = (stockByCategory ?? []).reduce(
    (sum, row) => sum + row.units,
    0,
  );

  return (
    <div className="mb-3 grid grid-cols-1 items-stretch gap-3 md:grid-cols-2 lg:grid-cols-3">
      <Card title="Sales Trend (14 days)" pad className="h-full min-w-0">
        {salesTrend.length > 0 ? (
          <LineArea
            values={salesTrend.map((row) => row.revenue)}
            labels={thinDateLabels(salesTrend.map((row) => row.date))}
            height={160}
            color="var(--brand-indigo)"
            valueLabel="Sales"
          />
        ) : (
          <EmptyState title="No sales trend" sub="No sales recorded in the last 14 days." />
        )}
      </Card>
      <Card title="Expense Breakdown" pad className="h-full min-w-0">
        {expenseDonut.length > 0 ? (
          <Donut
            data={expenseDonut}
            centerLabel="Total"
            centerValue={fmt(expenseTotal)}
            height={160}
          />
        ) : (
          <EmptyState title="No expenses" sub="No expenses recorded this month." />
        )}
      </Card>
      <Card title="Stock by Category" pad className="h-full min-w-0">
        {stockDonut.length > 0 ? (
          <Donut
            data={stockDonut}
            centerLabel="Units"
            centerValue={stockTotal.toLocaleString()}
            height={160}
          />
        ) : (
          <EmptyState title="No stock data" sub="No in-stock items to break down." />
        )}
      </Card>
    </div>
  );
}
