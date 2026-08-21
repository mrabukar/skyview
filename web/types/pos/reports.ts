/**
 * POS report response types.
 * Mirrors the shapes returned by:
 *   GET /reports/pos-summary
 *   GET /reports/pos-items
 *   GET /reports/pos-cashier-performance
 *
 * Note on bridge: `branchId`/`branchName` in byBranch rows become
 * `storeId`/`storeName` after the apiFetch bridge renames them.
 */

// ── Shared ─────────────────────────────────────────────────────────────────────

export interface ReportPeriod {
  from: string;
  to: string;
  timezone: string;
}

export interface PosReportQuery {
  fromDate?: string;
  toDate?: string;
  /** Bridge renames storeId → branchId on the way out. */
  storeId?: string;
}

// ── POS Summary (/reports/pos-summary) ────────────────────────────────────────

export interface PosSummary {
  totalRevenue: number;
  orderCount: number;
  avgOrderValue: number;
  totalDiscount: number;
}

/** byBranch row — bridge renames branchId/branchName → storeId/storeName */
export interface PosByBranchRow {
  storeId: string;
  storeName: string;
  revenue: number;
  orderCount: number;
  avgOrderValue: number;
}

export interface PosByPaymentMethodRow {
  method: string;
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
  summary: PosSummary;
  byBranch: PosByBranchRow[];
  byPaymentMethod: PosByPaymentMethodRow[];
  dailyTrend: PosDailyTrendRow[];
}

// ── POS Item Sales (/reports/pos-items) ───────────────────────────────────────

export interface PosItemRow {
  menuItemId: string;
  itemName: string;
  quantitySold: number;
  revenue: number;
  percentOfTotal: number;
}

export interface PosItemSalesResponse {
  period: ReportPeriod;
  totalRevenue: number;
  itemCount: number;
  items: PosItemRow[];
}

// ── POS Cashier Performance (/reports/pos-cashier-performance) ────────────────

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
  cashiers: PosCashierRow[];
}
