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
          icon={Banknote}
          color="teal"
          value={fmt(s.cashRevenue)}
          label="Cash"
          sublabel="POS cash payments"
        />
        <KpiCard
          icon={Smartphone}
          color="emerald"
          value={fmt(s.mpesaRevenue)}
          label="M-Pesa"
          sublabel="POS M-Pesa payments"
        />
        <KpiCard
          icon={Nfc}
          color="violet"
          value={fmt(s.cardDigitalRevenue)}
          label="Card & digital"
          sublabel="PDQ, card, and Pesapal"
        />
        <KpiCard
          icon={TrendingUp}
          color="indigo"
          value={fmt(s.totalRevenue)}
          label="Total Sales"
          sublabel="Daily sales + POS"
          {...formatPeriodTrend(comparison.totalRevenue)}
        />
      </div>

      <div className="stat-grid gap-3 grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={ShoppingBag}
          color="slate"
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
          color="teal"
          value={fmt(s.salaries)}
          label="Salaries"
          sublabel="Payroll & wages"
          {...formatExpenseTrend(comparison.salaries)}
        />
        <KpiCard
          icon={TrendingUp}
          color="violet"
          value={fmt(s.netProfit)}
          label="Net Profit"
          sublabel="After all expenses"
          valueColor={s.netProfit < 0 ? "var(--status-rose)" : undefined}
          {...formatPeriodTrend(comparison.netProfit)}
        />
      </div>
    </div>
  );
}
