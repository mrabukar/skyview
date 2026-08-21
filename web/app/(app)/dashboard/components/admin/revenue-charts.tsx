import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { GroupedBar } from "@/components/charts/grouped-bar";
import { Donut } from "@/components/charts/donut";
import { LineArea } from "@/components/charts/line-area";
import { HBars } from "@/components/charts/h-bars";
import { DONUT_COLORS } from "../donut-colors";
import { fmt } from "@/lib/utils";
import type { AdminDashboardCharts } from "@/types/reports/admin-dashboard";
import type { AdminDashboardSummary } from "@/types/reports/admin-dashboard";

interface Props {
  charts: AdminDashboardCharts;
  summary: AdminDashboardSummary;
}

export function AdminRevenueCharts({ charts, summary }: Props) {
  const revenueChart = charts.revenueCogsExpenses.map((row) => ({
    m: row.month,
    rev: row.revenue,
    cogs: row.cogs,
    exp: row.expenses,
  }));

  const expenseDonut = charts.expenseBreakdown.map((row, i) => ({
    label: row.categoryName,
    value: row.amount,
    color: DONUT_COLORS[i % DONUT_COLORS.length],
  }));

  const expenseTotal = charts.expenseBreakdown.reduce(
    (sum, row) => sum + row.amount,
    0,
  );

  const revenueSourceDonut =
    summary.saleRevenue > 0 || summary.posRevenue > 0
      ? [
          { label: "Daily Sales", value: summary.saleRevenue, color: "var(--brand-indigo)" },
          { label: "POS Sales", value: summary.posRevenue, color: "var(--brand-teal)" },
        ]
      : [];

  return (
    <>
      <div className="mb-3 grid grid-cols-1 items-stretch gap-3 md:grid-cols-2 lg:grid-cols-3">
        <Card title="Sales vs Purchases vs Expenses" pad className="h-full min-w-0">
          {revenueChart.length > 0 ? (
            <GroupedBar data={revenueChart} height={180} />
          ) : (
            <EmptyState
              title="No sales data"
              sub="No revenue in the selected period."
            />
          )}
        </Card>
        <Card title="Top Performing Branches" pad className="h-full min-w-0">
          {charts.topStores.length > 0 ? (
            <HBars
              data={charts.topStores.map((row) => ({
                name: row.storeName,
                revenue: row.revenue,
              }))}
              valueKey="revenue"
              labelKey="name"
              color="var(--brand-indigo)"
              format={fmt}
            />
          ) : (
            <EmptyState title="No branch rankings" sub="Branch rankings appear when viewing all branches." />
          )}
        </Card>
        <Card title="Net Profit Trend" pad className="h-full min-w-0">
          {charts.netProfitTrend.length > 0 ? (
            <LineArea
              values={charts.netProfitTrend.map((row) => row.netProfit)}
              labels={charts.netProfitTrend.map((row) => row.month)}
              height={160}
            />
          ) : (
            <EmptyState title="No profit trend" sub="Not enough data for this period." />
          )}
        </Card>
      </div>

      <div className="mb-3 grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card title="Expense Breakdown" pad className="h-full min-w-0">
          {expenseDonut.length > 0 ? (
            <Donut
              data={expenseDonut}
              centerLabel="Total"
              centerValue={fmt(expenseTotal)}
              height={160}
            />
          ) : (
            <EmptyState
              title="No expenses"
              sub="No expenses recorded in the selected period."
            />
          )}
        </Card>
        <Card title="Revenue Sources" pad className="h-full min-w-0">
          {revenueSourceDonut.length > 0 ? (
            <Donut
              data={revenueSourceDonut}
              centerLabel="Total"
              centerValue={fmt(summary.totalRevenue)}
              height={160}
            />
          ) : (
            <EmptyState title="No revenue" sub="No revenue in the selected period." />
          )}
        </Card>
        <Card title="Revenue by Branch" pad className="h-full min-w-0">
          {charts.revenueByBranch.length > 0 ? (
            <Donut
              data={charts.revenueByBranch.map((r, i) => ({
                label: r.storeName,
                value: r.revenue,
                color: DONUT_COLORS[i % DONUT_COLORS.length],
              }))}
              centerLabel="Total"
              centerValue={fmt(summary.totalRevenue)}
              height={160}
            />
          ) : (
            <EmptyState title="No branch data" sub="Branch breakdown appears when viewing all branches." />
          )}
        </Card>
      </div>
    </>
  );
}
