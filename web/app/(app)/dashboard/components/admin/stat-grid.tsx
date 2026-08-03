import { CreditCard, ShoppingBag, TrendingUp } from "lucide-react";
import { StatCard } from "../stat-card";
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
    <div className="stat-grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 mb-16">
      <StatCard
        icon={TrendingUp}
        color="indigo"
        value={fmt(s.totalRevenue)}
        label="Total Sales"
        {...formatPeriodTrend(comparison.totalRevenue)}
      />
      <StatCard
        icon={ShoppingBag}
        color="teal"
        value={fmt(s.cogs)}
        label="Purchases"
      />
      <StatCard
        icon={CreditCard}
        color="amber"
        value={fmt(s.totalExpenses)}
        label="Expenses"
        {...formatExpenseTrend(comparison.totalExpenses)}
      />
      <StatCard
        icon={TrendingUp}
        color="teal"
        value={fmt(s.grossProfit)}
        label="Sales − Purchases"
        {...formatPeriodTrend(comparison.grossProfit)}
      />
      <StatCard
        icon={TrendingUp}
        color="violet"
        value={fmt(s.netProfit)}
        label="Net Profit"
        valueColor={s.netProfit < 0 ? "var(--status-rose)" : undefined}
        {...formatPeriodTrend(comparison.netProfit)}
      />
    </div>
  );
}
