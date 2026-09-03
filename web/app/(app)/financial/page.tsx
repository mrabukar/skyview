"use client";

import { useMemo, useState } from "react";
import {
  Banknote,
  CreditCard,
  Percent,
  ReceiptText,
  ShoppingBag,
  TrendingUp,
  Wallet,
  XCircle,
} from "lucide-react";

import { FinancialLoadingSkeleton } from "./components/loading-skeleton";
import { PnlBreakdown } from "./components/pnl-breakdown";
import { Donut } from "@/components/charts/donut";
import { GroupedBar } from "@/components/charts/grouped-bar";
import { HBars } from "@/components/charts/h-bars";
import { LineArea } from "@/components/charts/line-area";
import { ReportFilterBar } from "@/components/filters/report-filter-bar";
import { ReportExportMenu } from "@/components/reports/report-export-menu";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiCard } from "@/app/(app)/dashboard/components/kpi-card";
import { AdminKpiStrip } from "@/app/(app)/dashboard/components/admin/kpi-strip";
import { DONUT_COLORS } from "@/app/(app)/dashboard/components/donut-colors";
import { Card } from "@/components/ui/card";
import { useReportFilters } from "@/hooks/filters/use-report-filters";
import { useFinancialSummary } from "@/hooks/reports/use-financial-summary";
import { getLastSixMonthsRange } from "@/lib/filters/dates";
import { fmt } from "@/lib/utils";

const defaultRange = getLastSixMonthsRange();
const fmtPct = (v: number) => `${v.toFixed(1)}%`;
const NO_SERIES: number[] = [];

export default function FinancialPage() {
  const filters = useReportFilters(defaultRange);
  const [exportBusy, setExportBusy] = useState(false);
  const { data, isLoading, isError, error } = useFinancialSummary(filters.query);

  const revenueChart = useMemo(
    () =>
      (data?.charts.revenueCogsExpenses ?? []).map((row) => ({
        m: row.month,
        rev: row.revenue,
        cogs: row.cogs,
        exp: row.expenses,
      })),
    [data?.charts.revenueCogsExpenses],
  );

  const netProfitChart = useMemo(
    () => ({
      values: (data?.charts.netProfitTrend ?? []).map((row) => row.netProfit),
      labels: (data?.charts.netProfitTrend ?? []).map((row) => row.month),
    }),
    [data?.charts.netProfitTrend],
  );

  // Monthly series behind each KPI card micro sparkline, matching the admin
  // dashboard. Salaries, POS revenue and daily average have no monthly
  // breakdown in this report, so those cards get an empty series — the card
  // keeps its height with a blank track rather than inventing a trend.
  const sparks = useMemo(() => {
    const months = data?.charts.revenueCogsExpenses ?? [];
    return {
      revenue: months.map((m) => m.revenue),
      cogs: months.map((m) => m.cogs),
      expenses: months.map((m) => m.expenses),
      grossProfit: months.map((m) => m.revenue - m.cogs),
      netProfit: (data?.charts.netProfitTrend ?? []).map((m) => m.netProfit),
    };
  }, [data?.charts.revenueCogsExpenses, data?.charts.netProfitTrend]);

  const header = (
    <PageHeader
      className="page-head--band"
      title="Financial Summary"
      desc="Revenue, cost, and profit for the selected period"
      action={
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <ReportFilterBar filters={filters} disabled={exportBusy} />
          <ReportExportMenu
            report="financial-summary"
            params={filters.query}
            disabled={exportBusy}
            onBusyChange={setExportBusy}
          />
        </div>
      }
    />
  );

  if (isLoading) {
    return (
      <div className="dash-page">
        {header}
        <FinancialLoadingSkeleton />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="dash-page">
        {header}
        <div className="alert-error" style={{ marginTop: 16 }}>
          <XCircle size={16} />
          {error instanceof Error
            ? error.message
            : "Failed to load financial summary."}
        </div>
      </div>
    );
  }

  const { summary: s, breakdown, charts } = data;

  const revenueSourceDonut =
    s.saleRevenue > 0 || s.posRevenue > 0
      ? [
          { label: "Daily Sales", value: s.saleRevenue, color: "var(--brand-indigo)" },
          { label: "POS Sales", value: s.posRevenue, color: "var(--brand-teal)" },
        ]
      : [];

  const expenseDonut = (charts.expenseBreakdown ?? []).map((row, i) => ({
    label: row.categoryName,
    value: row.amount,
    color: DONUT_COLORS[i % DONUT_COLORS.length],
  }));
  const expenseTotal = (charts.expenseBreakdown ?? []).reduce(
    (sum, row) => sum + row.amount,
    0,
  );

  return (
    <div className="dash-page">
      {header}

      <div className="mb-16 space-y-3">
        <div className="stat-grid gap-3 grid-cols-2 lg:grid-cols-4">
          <KpiCard
            icon={TrendingUp}
            color="indigo"
            value={fmt(s.totalRevenue)}
            label="Total Revenue"
            sublabel="All revenue this period"
            spark={sparks.revenue}
          />
          <KpiCard
            icon={ShoppingBag}
            color="slate"
            value={fmt(s.cogs)}
            label="Purchases"
            sublabel="Cost of goods sold"
            spark={sparks.cogs}
          />
          <KpiCard
            icon={CreditCard}
            color="amber"
            value={fmt(s.totalExpenses)}
            label="Expenses"
            sublabel="Operating costs"
            spark={sparks.expenses}
          />
          <KpiCard
            icon={Wallet}
            color="teal"
            value={fmt(s.salaries)}
            label="Salaries"
            sublabel="Payroll & wages"
            spark={NO_SERIES}
          />
        </div>
        <div className="stat-grid gap-3 grid-cols-2 lg:grid-cols-4">
          <KpiCard
            icon={TrendingUp}
            color="emerald"
            value={fmt(s.grossProfit)}
            label="Gross Profit"
            sublabel="Revenue minus COGS"
            valueColor={s.grossProfit < 0 ? "var(--status-rose)" : undefined}
            spark={sparks.grossProfit}
          />
          <KpiCard
            icon={Percent}
            color="violet"
            value={fmt(s.netProfit)}
            label="Net Profit"
            sublabel="After all expenses"
            valueColor={s.netProfit < 0 ? "var(--status-rose)" : undefined}
            spark={sparks.netProfit}
          />
          <KpiCard
            icon={ReceiptText}
            color="indigo"
            value={fmt(s.posRevenue)}
            label="POS Revenue"
            sublabel="From the POS terminal"
            spark={NO_SERIES}
          />
          <KpiCard
            icon={Banknote}
            color="teal"
            value={fmt(s.dailyAvgRevenue)}
            label="Daily Avg Revenue"
            sublabel="Per day in range"
            spark={NO_SERIES}
          />
        </div>
      </div>

      <div className="mb-3">
        <PnlBreakdown breakdown={breakdown} />
      </div>

      <div className="mb-3 grid grid-cols-1 items-stretch gap-3 md:grid-cols-2 lg:grid-cols-3">
        <Card title="Sales vs Purchases vs Expenses" pad className="h-full min-w-0">
          {revenueChart.length > 0 ? (
            <GroupedBar data={revenueChart} height={200} />
          ) : (
            <EmptyState
              title="No sales data"
              sub="No sales or expenses in this period."
            />
          )}
        </Card>
        <Card title="Net Profit Trend" pad className="h-full min-w-0">
          {netProfitChart.values.length > 0 ? (
            <LineArea
              values={netProfitChart.values}
              labels={netProfitChart.labels}
              height={180}
            />
          ) : (
            <EmptyState
              title="No profit trend"
              sub="Not enough data for a trend chart."
            />
          )}
        </Card>
        <Card title="Revenue by Branch" pad className="h-full min-w-0">
          {(charts.revenueByBranch?.length ?? 0) > 0 ? (
            <Donut
              data={charts.revenueByBranch.map((r, i) => ({
                label: r.storeName,
                value: r.revenue,
                color: DONUT_COLORS[i % DONUT_COLORS.length],
              }))}
              centerLabel="Total"
              centerValue={fmt(s.totalRevenue)}
              height={180}
            />
          ) : (
            <EmptyState
              title="No branch data"
              sub="Branch breakdown appears when viewing all branches."
            />
          )}
        </Card>
      </div>

      <div className="mb-3 grid grid-cols-1 items-stretch gap-3 md:grid-cols-2 lg:grid-cols-3">
        <Card title="Revenue Sources" pad className="h-full min-w-0">
          {revenueSourceDonut.length > 0 ? (
            <Donut
              data={revenueSourceDonut}
              centerLabel="Total"
              centerValue={fmt(s.totalRevenue)}
              height={180}
            />
          ) : (
            <EmptyState title="No revenue" sub="No revenue in the selected period." />
          )}
        </Card>
        <Card title="Expense Breakdown" pad className="h-full min-w-0">
          {expenseDonut.length > 0 ? (
            <Donut
              data={expenseDonut}
              centerLabel="Total"
              centerValue={fmt(expenseTotal)}
              height={180}
            />
          ) : (
            <EmptyState title="No expenses" sub="No expenses in the selected period." />
          )}
        </Card>
        <Card title="Top Performing Branches" pad className="h-full min-w-0">
          {(charts.revenueByBranch?.length ?? 0) > 0 ? (
            <HBars
              data={charts.revenueByBranch.map((row) => ({
                name: row.storeName,
                revenue: row.revenue,
              }))}
              valueKey="revenue"
              labelKey="name"
              colors={DONUT_COLORS}
              format={fmt}
              shareLabel="of all revenue"
            />
          ) : (
            <EmptyState
              title="No branch rankings"
              sub="Branch rankings appear when viewing all branches."
            />
          )}
        </Card>
      </div>

      <div className="mb-3 grid grid-cols-1 items-stretch gap-3 lg:grid-cols-2">
        <Card title="Gross Margin Trend" pad className="h-full min-w-0">
          {(charts.grossMarginTrend?.length ?? 0) > 0 ? (
            <LineArea
              values={charts.grossMarginTrend.map((r) => r.percent)}
              labels={charts.grossMarginTrend.map((r) => r.month)}
              height={180}
              color="var(--brand-teal)"
              valueLabel="Gross Margin"
              formatValue={fmtPct}
            />
          ) : (
            <EmptyState title="No margin data" sub="Not enough data for this period." />
          )}
        </Card>
        <Card title="Net Margin Trend" pad className="h-full min-w-0">
          {(charts.profitMarginTrend?.length ?? 0) > 0 ? (
            <LineArea
              values={charts.profitMarginTrend.map((r) => r.percent)}
              labels={charts.profitMarginTrend.map((r) => r.month)}
              height={180}
              color="var(--status-amber)"
              valueLabel="Net Margin"
              formatValue={fmtPct}
            />
          ) : (
            <EmptyState title="No margin data" sub="Not enough data for this period." />
          )}
        </Card>
      </div>

      <AdminKpiStrip summary={s} />
    </div>
  );
}
