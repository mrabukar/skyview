import { apiFetch } from "@/service/client";
import type {
  PosReportQuery,
  PosSummaryResponse,
  PosItemsResponse,
  PosCashierPerformanceResponse,
} from "@/types/reports/pos-reports";

function toQs(params: PosReportQuery): string {
  const search = new URLSearchParams();
  search.set("fromDate", params.fromDate);
  search.set("toDate", params.toDate);
  // `storeId=` is renamed to `branchId=` by the apiFetch bridge.
  if (params.storeId) search.set("storeId", params.storeId);
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function getPosSummary(
  params: PosReportQuery,
): Promise<PosSummaryResponse> {
  return apiFetch<PosSummaryResponse>(
    `/api/reports/pos-summary${toQs(params)}`,
  );
}

export function getPosItems(
  params: PosReportQuery,
): Promise<PosItemsResponse> {
  return apiFetch<PosItemsResponse>(
    `/api/reports/pos-items${toQs(params)}`,
  );
}

export function getPosCashierPerformance(
  params: PosReportQuery,
): Promise<PosCashierPerformanceResponse> {
  return apiFetch<PosCashierPerformanceResponse>(
    `/api/reports/pos-cashier-performance${toQs(params)}`,
  );
}
