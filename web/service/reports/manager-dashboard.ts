import { apiFetch } from "@/service/client";
import type { ManagerDashboardResponse } from "@/types/reports/manager-dashboard";

export function getManagerDashboard(
  storeId?: string,
): Promise<ManagerDashboardResponse> {
  // `storeId` is bridged to `branchId` on the wire. Omit for "all branches".
  const qs = storeId ? `?storeId=${encodeURIComponent(storeId)}` : "";
  return apiFetch<ManagerDashboardResponse>(
    `/api/reports/manager-dashboard${qs}`,
  );
}
