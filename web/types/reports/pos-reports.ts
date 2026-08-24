/**
 * POS report response types.
 *
 * NOTE ON BRIDGE RENAMING
 * The apiFetch client renames response body keys:
 *   branchId  → storeId
 *   branchName → storeName
 * Types below reflect the post-bridge shape the frontend actually receives.
 */

import type { ReportQuery } from "./query";

/** Re-export for convenience — POS reports accept the same query params. */
export type PosReportQuery = ReportQuery;

// ── Shared ────────────────────────────────────────────────────────────────────

export interface ReportPeriod {
  from: string;
  to: string;
  timezone: string;
}

// ── GET /api/reports/pos-summary ──────────────────────────────────────────────

export interface PosSummaryStats {
  totalRevenue: number;
  orderCount: number;
  avgOrderValue: number;
  totalDiscount: number;
}

/** byBranch row — branchId/branchName already renamed by bridge */
export interface PosBranchRow {
  storeId: string;
  storeName: string;
  revenue: number;
  orderCount: number;
  avgOrderValue: number;
}

export interface PosPaymentMethodRow {
  method: "cash" | "mpesa" | "card" | "pesapal" | "pdq" | null;
  revenue: number;
  orderCount: number;
}

export interface PosDailyTrendRow {
  date: string;
  revenue: number;
  orderCount: number;
}

export interface PosSummaryResponse {
  period: ReportPeriod;
  summary: PosSummaryStats;
  byBranch: PosBranchRow[];
  byPaymentMethod: PosPaymentMethodRow[];
  dailyTrend: PosDailyTrendRow[];
}

// ── GET /api/reports/pos-items ────────────────────────────────────────────────

export interface PosItemRow {
  menuItemId: string;
  itemName: string;
  quantitySold: number;
  revenue: number;
  percentOfTotal: number;
}

export interface PosItemsResponse {
  period: ReportPeriod;
  totalRevenue: number;
  itemCount: number;
  items: PosItemRow[];
}

// ── GET /api/reports/pos-cashier-performance ──────────────────────────────────

export interface PosCashierRow {
  cashierId: string;
  cashierName: string;
  orderCount: number;
  revenue: number;
  avgOrderValue: number;
  totalDiscountGiven: number;
  voidedCount: number;
}

export interface PosCashierPerformanceResponse {
  period: ReportPeriod;
  cashierCount: number;
  cashiers: PosCashierRow[];
}
