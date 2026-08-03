"use client";

import { PageHeader } from "@/components/ui/page-header";
import type { AppUser } from "@/lib/types";
import { useManagerDashboard } from "@/hooks/reports/manager-dashboard";
import { DashboardError, DashboardLoading } from "./components/admin/status";
import { ManagerChartsSection } from "./components/manager/charts-section";
import { ManagerRecentSalesTable } from "./components/manager/recent-sales-table";
import { ManagerStatGrid } from "./components/manager/stat-grid";

export function ManagerDashboard({ user }: { user: AppUser }) {
  const label = user.store?.split(" — ")[0] ?? "My Branch";
  const { data, isLoading, isError, error } = useManagerDashboard();

  const header = (
    <PageHeader
      className="page-head--band"
      title={`Dashboard — ${label}`}
      desc="Your branch at a glance"
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

  return (
    <>
      {header}

      <ManagerStatGrid summary={summary} comparison={comparison} />
      <ManagerChartsSection charts={charts} />
      <ManagerRecentSalesTable sales={recentSales} />
    </>
  );
}
