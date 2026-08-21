import {
  CreditCard,
  ReceiptText,
  ShoppingBag,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import { KpiCard } from "../kpi-card";
import { formatPeriodTrend } from "@/lib/reports/format";
import { cn, fmt } from "@/lib/utils";
import type { ManagerPeriodComparison } from "@/types/reports/common";
import type { ManagerDashboardSummary } from "@/types/reports/manager-dashboard";

interface Props {
  summary: ManagerDashboardSummary;
  comparison: ManagerPeriodComparison;
  posOrderCount?: number;
  posOrdersPending?: boolean;
}

function KpiSlotSkeleton() {
  return (
    <div className="kpi-card">
      <div className="kpi-head">
        <span
          className="dt-skeleton"
          aria-hidden
          style={{ width: 12, height: 12, borderRadius: 3, maxWidth: 12 }}
        />
        <span
          className={cn("dt-skeleton")}
          aria-hidden
          style={{ width: 72, height: 10, maxWidth: 72 }}
        />
      </div>
      <div className="kpi-inner">
        <div className="kpi-valrow">
          <span
            className="dt-skeleton"
            aria-hidden
            style={{ width: "70%", height: 20, maxWidth: 100 }}
          />
        </div>
        <div className="kpi-footer">
          <span
            className="dt-skeleton"
            aria-hidden
            style={{ width: 60, height: 11, maxWidth: 60 }}
          />
        </div>
      </div>
    </div>
  );
}

export function ManagerStatGrid({
  summary: s,
  comparison,
  posOrderCount,
  posOrdersPending,
}: Props) {
  return (
    <div className="mb-16 space-y-3">
      <div className="stat-grid gap-3 grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={ShoppingCart}
          color="indigo"
          value={fmt(s.todayRevenue)}
          label="Today's Sales"
          sublabel="Vs yesterday"
          {...formatPeriodTrend(comparison.todayRevenue)}
        />
        <KpiCard
          icon={TrendingUp}
          color="teal"
          value={fmt(s.monthRevenue)}
          label="This Month's Sales"
          sublabel="Vs last month"
          {...formatPeriodTrend(comparison.monthRevenue)}
        />
        <KpiCard
          icon={ShoppingBag}
          color="slate"
          value={fmt(s.monthPurchases)}
          label="Purchases"
          sublabel="This month"
        />
        <KpiCard
          icon={CreditCard}
          color="amber"
          value={fmt(s.monthExpenses)}
          label="Expenses"
          sublabel="This month"
        />
      </div>

      <div className="stat-grid gap-3 grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={TrendingUp}
          color="violet"
          value={fmt(s.netProfit)}
          label="Net Profit"
          sublabel="This month"
          valueColor={s.netProfit < 0 ? "var(--status-rose)" : undefined}
        />
        <KpiCard
          icon={ReceiptText}
          color="indigo"
          value={fmt(s.monthSaleRevenue)}
          label="Daily Sales"
          sublabel="Daily-entry revenue"
        />
        <KpiCard
          icon={ReceiptText}
          color="teal"
          value={fmt(s.monthPosRevenue)}
          label="POS Revenue"
          sublabel="From the POS terminal"
        />
        {posOrdersPending ? (
          <KpiSlotSkeleton />
        ) : (
          <KpiCard
            icon={ShoppingCart}
            color="emerald"
            value={(posOrderCount ?? 0).toLocaleString()}
            label="POS Orders"
            sublabel="This month"
          />
        )}
      </div>
    </div>
  );
}
