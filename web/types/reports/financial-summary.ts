import type { ReportPeriod } from "./common";
import type { ExpenseBreakdownRow } from "./admin-dashboard";
import type { ReportQuery } from "./query";

export interface FinancialSummaryMetrics {
  totalRevenue: number;
  saleRevenue: number;
  posRevenue: number;
  totalUnitsSold: number;
  cogs: number;
  grossProfit: number;
  totalExpenses: number;
  salaries: number;
  netProfit: number;
  grossMarginPercent: number;
  netMarginPercent: number;
  expenseRatio: number;
  payrollRatio: number;
  dailyAvgRevenue: number;
  currentStockValue: number;
  inStockBalance: number;
  lowStockCount: number;
  outOfStockCount: number;
  stockInvestment: number;
}

export interface FinancialBreakdown {
  revenue: number;
  cogs: number;
  grossProfit: number;
  expenses: number;
  salaries: number;
  netProfit: number;
}

export interface FinancialRevenueCogsRow {
  month: string;
  monthKey: string;
  revenue: number;
  cogs: number;
  expenses: number;
}

export interface FinancialNetProfitRow {
  month: string;
  monthKey: string;
  netProfit: number;
}

export interface FinancialMarginTrendRow {
  month: string;
  monthKey: string;
  percent: number;
}

export interface FinancialTopStoreRow {
  storeId: string;
  storeName: string;
  revenue: number;
}

export interface FinancialSummaryCharts {
  revenueCogsExpenses: FinancialRevenueCogsRow[];
  netProfitTrend: FinancialNetProfitRow[];
  grossMarginTrend: FinancialMarginTrendRow[];
  profitMarginTrend: FinancialMarginTrendRow[];
  revenueByBranch: FinancialTopStoreRow[];
  expenseBreakdown: { categoryId: string; categoryName: string; amount: number }[];
}

export interface FinancialSummaryResponse {
  period: ReportPeriod;
  summary: FinancialSummaryMetrics;
  expenseByCategory: ExpenseBreakdownRow[];
  breakdown: FinancialBreakdown;
  charts: FinancialSummaryCharts;
}

export type FinancialSummaryQuery = ReportQuery;
