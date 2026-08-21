"use client";

import { ReceiptText } from "lucide-react";

import { StatCard } from "@/app/(app)/dashboard/components/stat-card";
import { usePosSummary } from "@/hooks/reports/use-pos-reports";
import { fmt } from "@/lib/utils";
import type { PosReportQuery } from "@/types/reports/pos-reports";

interface Props {
  query: PosReportQuery;
}

/**
 * Optional POS KPI strip for dashboards.
 * Total Sales already includes POS revenue; this surfaces POS-only volume.
 */
export function PosDashboardCards({ query }: Props) {
  const { data, isPending, isError } = usePosSummary(query);

  if (isPending) {
    return (
      <div className="stat-grid grid-cols-2 md:grid-cols-2 lg:grid-cols-2 mb-16">
        <div className="h-[88px] animate-pulse rounded-lg bg-muted/40" />
        <div className="h-[88px] animate-pulse rounded-lg bg-muted/40" />
      </div>
    );
  }

  if (isError || !data) return null;

  const { summary } = data;

  return (
    <div className="stat-grid grid-cols-2 md:grid-cols-2 lg:grid-cols-2 mb-16">
      <StatCard
        icon={ReceiptText}
        color="indigo"
        value={fmt(summary.totalRevenue)}
        label="POS Revenue"
      />
      <StatCard
        icon={ReceiptText}
        color="teal"
        value={summary.orderCount.toLocaleString()}
        label="POS Orders"
      />
    </div>
  );
}
