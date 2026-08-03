import { ClipboardList, ShoppingCart, TrendingUp } from "lucide-react";
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
    <div className="stat-grid grid-3 mb-16">
      <StatCard
        icon={ShoppingCart}
        color="indigo"
        value={fmt(s.todayRevenue)}
        label="Today's Sales"
        {...formatPeriodTrend(comparison.todayRevenue)}
      />
      <StatCard
        icon={TrendingUp}
        color="teal"
        value={fmt(s.monthRevenue)}
        label="This Month's Sales"
        {...formatPeriodTrend(comparison.monthRevenue)}
      />
      <StatCard
        icon={ClipboardList}
        color="violet"
        value={s.todayUnitsSold > 0 ? "Recorded" : "Not yet"}
        label="Today's Entry"
        valueColor={s.todayUnitsSold > 0 ? undefined : "var(--status-amber)"}
      />
    </div>
  );
}
