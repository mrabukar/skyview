"use client";

import { PageHeader } from "@/components/ui/page-header";
import type { AppUser } from "@/lib/types";
import { useManagerDashboard } from "@/hooks/reports/manager-dashboard";
import { getCurrentMonthRange } from "@/lib/filters/dates";
import { DashboardError, DashboardLoading } from "./components/admin/status";
import { ManagerChartsSection } from "./components/manager/charts-section";
import { ManagerRecentSalesTable } from "./components/manager/recent-sales-table";
import { ManagerStatGrid } from "./components/manager/stat-grid";
import { TopVendorsCard } from "./components/top-vendors-card";

export function ManagerDashboard({ user }: { user: AppUser }) {
  const label =
    (user.storeIds?.length ?? 0) > 1
      ? "Your branches"
      : (user.store?.split(" — ")[0] ?? "My Branch");
  const { data, isLoading, isError, error } = useManagerDashboard();

  const header = (
    <PageHeader
      className="page-head--band"
      title={`Dashboard — ${label}`}
      desc={
        (user.storeIds?.length ?? 0) > 1
          ? "All assigned branches at a glance"
          : "Your branch at a glance"
      }
    />
  );

  if (isLoading) {
    return (
      <>
        {header}
        <DashboardLoading />
      </>
    );
  }

  if (isError || !data) {
    return (
      <>
        {header}
        <DashboardError
          message={error instanceof Error ? error.message : "Failed to load dashboard."}
        />
      </>
    );
  }

  const { summary, comparison, charts, recentSales } = data;
  const monthRange = getCurrentMonthRange();

  return (
    <>
      {header}

      <ManagerStatGrid summary={summary} comparison={comparison} />
      <ManagerChartsSection charts={charts} />
      <ManagerRecentSalesTable sales={recentSales} />
      <div className="mt-6">
        <TopVendorsCard
          fromDate={monthRange.fromDate}
          toDate={monthRange.toDate}
        />
      </div>
    </>
  );
}
