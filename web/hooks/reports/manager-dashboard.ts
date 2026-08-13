"use client";

import { useQuery } from "@tanstack/react-query";
import { getManagerDashboard } from "@/service/reports/manager-dashboard";

export const managerDashboardQueryKey = (storeId?: string) =>
  ["reports", "manager-dashboard", storeId ?? "all"] as const;

export function useManagerDashboard(storeId?: string) {
  return useQuery({
    queryKey: managerDashboardQueryKey(storeId),
    queryFn: () => getManagerDashboard(storeId),
  });
}
