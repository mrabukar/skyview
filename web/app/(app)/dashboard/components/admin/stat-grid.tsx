import {
  CreditCard,
  Percent,
  ReceiptText,
  ShoppingBag,
  ShoppingCart,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { KpiCard } from "../kpi-card";
import { formatExpenseTrend, formatPeriodTrend } from "@/lib/reports/format";
import { fmt } from "@/lib/utils";
import type { AdminPeriodComparison } from "@/types/reports/common";
import type { AdminDashboardSummary } from "@/types/reports/admin-dashboard";

interface Props {
  summary: AdminDashboardSummary;
  comparison: AdminPeriodComparison;
}

export function AdminStatGrid({ summary: s, comparison }: Props) {
  return (
    <div className="mb-16 space-y-3">
      <div className="stat-grid gap-3 grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={TrendingUp}
          color="indigo"
          value={fmt(s.totalRevenue)}
          label="Total Sales"
          sublabel="All revenue this period"
          {...formatPeriodTrend(comparison.totalRevenue)}
        />
        <KpiCard
          icon={ShoppingBag}
          color="teal"
          value={fmt(s.cogs)}
          label="Purchases"
          sublabel="Cost of goods sold"
          {...formatExpenseTrend(comparison.cogs)}
        />
        <KpiCard
          icon={CreditCard}
          color="amber"
          value={fmt(s.totalExpenses)}
          label="Expenses"
          sublabel="Operating costs"
          {...formatExpenseTrend(comparison.totalExpenses)}
        />
        <KpiCard
          icon={Wallet}
          color="slate"
          value={fmt(s.salaries)}
          label="Salaries"
          sublabel="Payroll & wages"
          {...formatExpenseTrend(comparison.salaries)}
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
          {...formatPeriodTrend(comparison.grossProfit)}
        />
        <KpiCard
          icon={Percent}
          color="violet"
          value={fmt(s.netProfit)}
          label="Net Profit"
          sublabel="After all expenses"
          valueColor={s.netProfit < 0 ? "var(--status-rose)" : undefined}
          {...formatPeriodTrend(comparison.netProfit)}
        />
        <KpiCard
          icon={ReceiptText}
          color="indigo"
          value={fmt(s.posRevenue)}
          label="POS Revenue"
          sublabel="From the POS terminal"
        />
        <KpiCard
          icon={ShoppingCart}
          color="teal"
          value={s.posOrderCount.toLocaleString()}
          label="POS Orders"
          sublabel="Orders this period"
        />
      </div>
    </div>
  );
}
