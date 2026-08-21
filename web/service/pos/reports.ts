import { apiFetch } from "@/service/client";
import type {
  PosReportQuery,
  PosSummaryResponse,
  PosItemSalesResponse,
  PosCashierPerformanceResponse,
} from "@/types/pos/reports";

function toQs(params: PosReportQuery): string {
  const s = new URLSearchParams();
  if (params.fromDate) s.set("fromDate", params.fromDate);
  if (params.toDate) s.set("toDate", params.toDate);
  // Bridge renames storeId → branchId on the way out.
  if (params.storeId) s.set("storeId", params.storeId);
  const qs = s.toString();
  return qs ? `?${qs}` : "";
}

/**
 * GET /reports/pos-summary
 * Aggregate POS revenue: totals, by-branch breakdown, payment-method mix,
 * and daily trend. Scoped to posEnabled branches only.
 */
export function getPosSummary(
  params: PosReportQuery = {},
): Promise<PosSummaryResponse> {
  return apiFetch<PosSummaryResponse>(
    `/api/reports/pos-summary${toQs(params)}`,
  );
}

/**
 * GET /reports/pos-items
 * Per-menu-item sales: quantity sold, revenue, and % of total.
 * Scoped to posEnabled branches only.
 */
export function getPosItemSales(
  params: PosReportQuery = {},
): Promise<PosItemSalesResponse> {
  return apiFetch<PosItemSalesResponse>(
    `/api/reports/pos-items${toQs(params)}`,
  );
}

/**
 * GET /reports/pos-cashier-performance
 * Per-cashier summary: orders, revenue, avg order value, discounts, void count.
 * Scoped to posEnabled branches only.
 */
export function getPosCashierPerformance(
  params: PosReportQuery = {},
): Promise<PosCashierPerformanceResponse> {
  return apiFetch<PosCashierPerformanceResponse>(
    `/api/reports/pos-cashier-performance${toQs(params)}`,
  );
}
