import {
  Banknote,
  CreditCard,
  Nfc,
  ShoppingBag,
  Smartphone,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { KpiCard } from "../kpi-card";
import { formatExpenseTrend, formatPeriodTrend } from "@/lib/reports/format";
import { fmt } from "@/lib/utils";
import type { AdminPeriodComparison } from "@/types/reports/common";
import type {
  AdminDashboardCharts,
  AdminDashboardSummary,
} from "@/types/reports/admin-dashboard";

interface Props {
  summary: AdminDashboardSummary;
  comparison: AdminPeriodComparison;
  charts: AdminDashboardCharts;
}

export function AdminStatGrid({ summary: s, comparison, charts }: Props) {
  // Monthly series driving each card's micro sparkline. Payment-method
  // revenue has no monthly breakdown in the report, so those cards get an
  // empty series — the card renders a blank track and keeps its height
  // rather than inventing a trend.
  const months = charts.revenueCogsExpenses;
  const revenueSeries = months.map((m) => m.revenue);
  const cogsSeries = months.map((m) => m.cogs);
  const expenseSeries = months.map((m) => m.expenses);
  const netProfitSeries = months.map((m) => m.netProfit);
  const none: number[] = [];

  return (
    <div className="mb-16 space-y-3">
      <div className="stat-grid gap-3 grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Banknote}
          color="teal"
          value={fmt(s.cashRevenue)}
          label="Cash"
          sublabel="POS cash payments"
          spark={none}
        />
        <KpiCard
          icon={Smartphone}
          color="emerald"
          value={fmt(s.mpesaRevenue)}
          label="M-Pesa"
          sublabel="POS M-Pesa payments"
          spark={none}
        />
        <KpiCard
          icon={Nfc}
          color="violet"
          value={fmt(s.cardDigitalRevenue)}
          label="Card & digital"
          sublabel="PDQ, card, and Pesapal"
          spark={none}
        />
        <KpiCard
          icon={TrendingUp}
          color="indigo"
          value={fmt(s.totalRevenue)}
          label="Total Sales"
          sublabel="Daily sales + POS"
          spark={revenueSeries}
          {...formatPeriodTrend(comparison.totalRevenue)}
        />
      </div>

      <div className="stat-grid gap-3 grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={ShoppingBag}
          color="violet"
          value={fmt(s.cogs)}
          label="Purchases"
          sublabel="Cost of goods sold"
          spark={cogsSeries}
          {...formatExpenseTrend(comparison.cogs)}
        />
        <KpiCard
          icon={CreditCard}
          color="amber"
          value={fmt(s.totalExpenses)}
          label="Expenses"
          sublabel="Operating costs"
          spark={expenseSeries}
          {...formatExpenseTrend(comparison.totalExpenses)}
        />
        <KpiCard
          icon={Wallet}
          color="teal"
          value={fmt(s.salaries)}
          label="Salaries"
          sublabel="Payroll & wages"
          spark={none}
          {...formatExpenseTrend(comparison.salaries)}
        />
        <KpiCard
          icon={TrendingUp}
          color={s.netProfit < 0 ? "rose" : "emerald"}
          value={fmt(s.netProfit)}
          label="Net Profit"
          sublabel="After all expenses"
          valueColor={s.netProfit < 0 ? "var(--status-rose)" : undefined}
          spark={netProfitSeries}
          {...formatPeriodTrend(comparison.netProfit)}
        />
      </div>
    </div>
  );
}
