import { CreditCard, ShoppingBag, ShoppingCart, TrendingUp } from "lucide-react";
import { formatPeriodTrend } from "@/lib/reports/format";
import { fmt } from "@/lib/utils";
import type { ManagerPeriodComparison } from "@/types/reports/common";
import type { ManagerDashboardSummary } from "@/types/reports/manager-dashboard";
import { StatCard } from "../stat-card";

interface Props {
  summary: ManagerDashboardSummary;
  comparison: ManagerPeriodComparison;
}

export function ManagerStatGrid({ summary: s, comparison }: Props) {
  return (
    <div className="stat-grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 mb-16">
      <StatCard
        icon={ShoppingCart}
        color="indigo"
        value={fmt(s.todayRevenue)}
        label="Today's Sales"
        {...formatPeriodTrend(comparison.todayRevenue)}
      />
      <StatCard
        icon={TrendingUp}
        color="indigo"
        value={fmt(s.monthRevenue)}
        label="This Month's Sales"
        {...formatPeriodTrend(comparison.monthRevenue)}
      />
      <StatCard
        icon={ShoppingBag}
        color="teal"
        value={fmt(s.monthPurchases)}
        label="Purchases (This Month)"
      />
      <StatCard
        icon={CreditCard}
        color="amber"
        value={fmt(s.monthExpenses)}
        label="Expenses (This Month)"
      />
      <StatCard
        icon={TrendingUp}
        color="violet"
        value={fmt(s.netProfit)}
        label="Net Profit (This Month)"
        valueColor={s.netProfit < 0 ? "var(--status-rose)" : undefined}
      />
    </div>
  );
}
