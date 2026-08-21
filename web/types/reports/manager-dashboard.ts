import type {
  DailyRevenueRow,
  DashboardRecentSale,
  ManagerPeriodComparison,
  StockByCategoryRow,
} from "./common";

export interface ManagerDashboardSummary {
  todayRevenue: number;
  todayUnitsSold: number;
  monthRevenue: number;
  monthSaleRevenue: number;
  monthPosRevenue: number;
  monthPurchases: number;
  monthExpenses: number;
  netProfit: number;
  grossMarginPercent: number;
  expenseRatio: number;
  inStockBalance: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export interface ManagerDashboardCharts {
  salesTrend: DailyRevenueRow[];
  expenseBreakdown: { categoryId: string; categoryName: string; amount: number }[];
  stockByCategory: StockByCategoryRow[];
}

export interface ManagerDashboardResponse {
  storeId: string;
  summary: ManagerDashboardSummary;
  comparison: ManagerPeriodComparison;
  charts: ManagerDashboardCharts;
  recentSales: DashboardRecentSale[];
}

export type {
  DailyRevenueRow,
  DashboardRecentSale,
  ManagerPeriodComparison,
  StockByCategoryRow,
} from "./common";
