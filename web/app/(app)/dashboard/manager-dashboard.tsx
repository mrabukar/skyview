"use client";

import { useState } from "react";

import { Combobox } from "@/components/ui/combobox";
import { PageHeader } from "@/components/ui/page-header";
import type { AppUser } from "@/lib/types";
import { useManagerDashboard } from "@/hooks/reports/manager-dashboard";
import { usePosSummary } from "@/hooks/reports/use-pos-reports";
import { getCurrentMonthRange } from "@/lib/filters/dates";
import { DashboardError, DashboardLoading } from "./components/admin/status";
import { ManagerChartsSection } from "./components/manager/charts-section";
import { ManagerHealthStrip } from "./components/manager/health-strip";
import { ManagerRecentSalesTable } from "./components/manager/recent-sales-table";
import { ManagerStatGrid } from "./components/manager/stat-grid";
import { TopVendorsCard } from "./components/top-vendors-card";

export function ManagerDashboard({ user }: { user: AppUser }) {
  const isMulti = (user.storeIds?.length ?? 0) > 1;
  const [storeId, setStoreId] = useState<string | undefined>(undefined);
  const selectedBranchName = storeId
    ? user.stores.find((s) => s.id === storeId)?.name
    : undefined;

  const label = isMulti
    ? "Your branches"
    : (user.store?.split(" — ")[0] ?? "My Branch");
  const { data, isLoading, isError, error } = useManagerDashboard(storeId);

  const monthRange = getCurrentMonthRange();
  const posQuery = {
    fromDate: monthRange.fromDate,
    toDate: monthRange.toDate,
    ...(storeId ? { storeId } : {}),
  };
  const { data: posData, isPending: posPending } = usePosSummary(posQuery);

  const header = (
    <PageHeader
      className="page-head--band"
      title={`Dashboard — ${label}`}
      desc={
        isMulti
          ? selectedBranchName
            ? `Showing ${selectedBranchName}`
            : "All assigned branches at a glance"
          : "Your branch at a glance"
      }
      action={
        isMulti ? (
          <Combobox
            value={storeId}
            onValueChange={setStoreId}
            items={user.stores.map((s) => ({ value: s.id, label: s.name }))}
            clearOption={{ label: "All branches" }}
            placeholder="All branches"
            searchPlaceholder="Search branches…"
            emptyText="No branches found."
          />
        ) : null
      }
    />
  );

  if (isLoading) {
    return (
      <div className="dash-page">
        {header}
        <DashboardLoading />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="dash-page">
        {header}
        <DashboardError
          message={error instanceof Error ? error.message : "Failed to load dashboard."}
        />
      </div>
    );
  }

  const { summary, comparison, charts, recentSales } = data;

  return (
    <div className="dash-page">
      {header}

      <ManagerStatGrid
        summary={summary}
        comparison={comparison}
        posOrderCount={posData?.summary.orderCount}
        posOrdersPending={posPending}
      />
      <ManagerChartsSection charts={charts} />
      <div className="mb-3 grid gap-3 lg:grid-cols-2">
        <ManagerRecentSalesTable sales={recentSales} />
        <TopVendorsCard
          fromDate={monthRange.fromDate}
          toDate={monthRange.toDate}
          storeId={storeId}
        />
      </div>
      <ManagerHealthStrip summary={summary} />
    </div>
  );
}
