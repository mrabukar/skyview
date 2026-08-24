"use client";

import { useMemo } from "react";
import {
  BadgePercent,
  ShoppingCart,
  TrendingUp,
  Wallet,
  XCircle,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Donut } from "@/components/charts/donut";
import { LineArea } from "@/components/charts/line-area";
import { StatCard } from "@/app/(app)/dashboard/components/stat-card";
import { usePosSummary } from "@/hooks/reports/use-pos-reports";
import { paymentLabel } from "@/lib/pos/invoice";
import { fmt } from "@/lib/utils";
import type { PosReportQuery } from "@/types/reports/pos-reports";

// ── Helpers ────────────────────────────────────────────────────────────────────

const PAYMENT_COLORS: Record<string, string> = {
  mpesa: "var(--status-emerald)",
  cash: "var(--brand-teal)",
  card: "var(--brand-indigo)",
  pesapal: "var(--brand-violet)",
  pdq: "var(--status-rose)",
};

function shortDate(ymd: string): string {
  const [year, month, day] = ymd.split("-").map(Number);
  return new Intl.DateTimeFormat("en-KE", {
    month: "short",
    day: "numeric",
  }).format(new Date(year, month - 1, day));
}

// ── Component ──────────────────────────────────────────────────────────────────

interface Props {
  query: PosReportQuery;
}

export function PosSummaryTab({ query }: Props) {
  const { data, isPending, isError, error } = usePosSummary(query);

  // ── Derived chart data ──────────────────────────────────────────────────────

  const trendData = useMemo(
    () => ({
      values: (data?.dailyTrend ?? []).map((d) => d.revenue),
      labels: (data?.dailyTrend ?? []).map((d) => shortDate(d.date)),
    }),
    [data?.dailyTrend],
  );

  const donutData = useMemo(
    () =>
      (data?.byPaymentMethod ?? [])
        .filter((row) => row.revenue > 0)
        .map((row) => ({
          label: row.method ? paymentLabel(row.method) : "Not recorded",
          value: row.revenue,
          color: row.method ? (PAYMENT_COLORS[row.method] ?? "var(--cost-slate)") : "var(--cost-slate)",
        })),
    [data?.byPaymentMethod],
  );

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────────

  if (isError || !data) {
    return (
      <div className="alert-error" style={{ marginTop: 16 }}>
        <XCircle size={16} />
        {error instanceof Error
          ? error.message
          : "Failed to load POS summary."}
      </div>
    );
  }

  // ── Empty ───────────────────────────────────────────────────────────────────

  if (data.summary.orderCount === 0) {
    return (
      <p className="muted" style={{ padding: "48px 0", textAlign: "center" }}>
        No POS orders in this period.
      </p>
    );
  }

  const { summary: s } = data;

  return (
    <div className="space-y-8">
      {/* ── KPI cards ───────────────────────────────────────────────────── */}
      <div className="stat-grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={TrendingUp}
          color="indigo"
          colorful
          value={fmt(s.totalRevenue)}
          label="Total Revenue"
        />
        <StatCard
          icon={ShoppingCart}
          color="teal"
          colorful
          value={s.orderCount.toLocaleString()}
          label="Orders"
        />
        <StatCard
          icon={Wallet}
          color="violet"
          colorful
          value={fmt(s.avgOrderValue)}
          label="Avg Order Value"
        />
        <StatCard
          icon={BadgePercent}
          color="amber"
          colorful
          value={fmt(s.totalDiscount)}
          label="Total Discount"
        />
      </div>

      {/* ── Charts row ──────────────────────────────────────────────────── */}
      <div className="grid-2">
        <Card title="Daily Revenue Trend" pad>
          {trendData.values.length > 0 ? (
            <LineArea
              values={trendData.values}
              labels={trendData.labels}
              valueLabel="Revenue"
              formatValue={fmt}
              color="var(--brand-indigo)"
            />
          ) : (
            <p className="muted" style={{ padding: "24px 0" }}>
              No daily data available.
            </p>
          )}
        </Card>

        <Card title="Payment Method Mix" pad>
          {donutData.length > 0 ? (
            <Donut
              data={donutData}
              centerLabel="Revenue"
              centerValue={data.byPaymentMethod.length > 0 ? fmt(s.totalRevenue) : undefined}
              height={220}
            />
          ) : (
            <p className="muted" style={{ padding: "24px 0" }}>
              No payment data.
            </p>
          )}
        </Card>
      </div>

      {/* ── Branch breakdown table ───────────────────────────────────────── */}
      {data.byBranch.length > 0 ? (
        <Card title="By Branch" pad>
          <div className="overflow-x-auto">
            <table className="dt-table" style={{ minWidth: 480 }}>
              <thead>
                <tr>
                  <th>Branch</th>
                  <th className="text-right">Revenue</th>
                  <th className="text-right">Orders</th>
                  <th className="text-right">Avg Order</th>
                </tr>
              </thead>
              <tbody>
                {data.byBranch.map((row) => (
                  <tr key={row.storeId}>
                    <td className="strong">{row.storeName}</td>
                    <td className="text-right num">{fmt(row.revenue)}</td>
                    <td className="text-right">{row.orderCount.toLocaleString()}</td>
                    <td className="text-right num">{fmt(row.avgOrderValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
