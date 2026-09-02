"use client";

import { useMemo } from "react";

import { useAdminDashboard } from "@/hooks/reports/admin-dashboard";
import { useReportFilters } from "@/hooks/filters/use-report-filters";
import { AdminPerformanceCharts } from "./components/admin/performance-charts";
import { AdminRecentSalesTable } from "./components/admin/recent-sales-table";
import { AdminRevenueCharts } from "./components/admin/revenue-charts";
import { AdminKpiStrip } from "./components/admin/kpi-strip";
import { AdminStatGrid } from "./components/admin/stat-grid";
import { DashboardError, DashboardLoading } from "./components/admin/status";
import { DashboardPageHeader } from "./components/admin/page-header";
import { TopVendorsCard } from "./components/top-vendors-card";
import { Card } from "@/components/ui/card";

export function AdminDashboard() {
  const filters = useReportFilters();
  const dashboardQuery = useMemo(
    () => ({
      fromDate: filters.query.fromDate,
      toDate: filters.query.toDate,
      storeId: filters.query.storeId,
    }),
    [filters.query.fromDate, filters.query.toDate, filters.query.storeId],
  );
  const { data, isLoading, isError, error } = useAdminDashboard(dashboardQuery);

  const header = <DashboardPageHeader filters={filters} />;

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
        <DashboardError message={error instanceof Error ? error.message : "Failed to load dashboard."} />
      </div>
    );
  }

  const { summary, comparison, charts, recentSales } = data;

  return (
    <div className="dash-page">
      {header}

      <AdminStatGrid summary={summary} comparison={comparison} charts={charts} />
      <AdminRevenueCharts charts={charts} summary={summary} />
      <AdminPerformanceCharts charts={charts} />
      <div className="mb-3 grid gap-3 lg:grid-cols-2">
        <Card title="Recent Daily Sales" pad>
          <AdminRecentSalesTable sales={recentSales} />
        </Card>
        <TopVendorsCard
          fromDate={dashboardQuery.fromDate}
          toDate={dashboardQuery.toDate}
          storeId={dashboardQuery.storeId}
        />
      </div>
      <AdminKpiStrip summary={summary} />
    </div>
  );
}
