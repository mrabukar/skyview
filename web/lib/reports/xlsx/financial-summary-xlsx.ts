import ExcelJS from "exceljs";

import type { ExpenseBreakdownRow } from "@/types/reports/admin-dashboard";
import type { FinancialBreakdown, FinancialSummaryMetrics } from "@/types/reports/financial-summary";

import { XLSX_COLORS, addXlsxReportHeader, addXlsxTable } from "./theme";

export interface FinancialSummaryXlsxData {
  orgName: string;
  periodLabel: string;
  branchLabel: string;
  summary: FinancialSummaryMetrics;
  breakdown: FinancialBreakdown;
  expenseByCategory: ExpenseBreakdownRow[];
}

export function buildFinancialSummaryWorkbook(data: FinancialSummaryXlsxData): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Skyview";
  wb.created = new Date();

  const sheet = wb.addWorksheet("Financial Summary", { views: [{ showGridLines: false }] });
  sheet.columns = [{ width: 32 }, { width: 20 }];

  let row = addXlsxReportHeader(sheet, {
    orgName: data.orgName,
    title: "Financial Summary",
    desc: "Revenue, cost, and profit for the selected period",
    periodLabel: data.periodLabel,
    branchLabel: data.branchLabel,
    lastCol: "B",
  });

  row = addXlsxTable(sheet, row, {
    heading: "Summary",
    columns: ["Metric", "Amount"],
    rows: [
      { label: "Total Revenue", value: data.summary.totalRevenue },
      { label: "Purchases", value: data.summary.cogs },
      {
        label: "Gross Profit",
        value: data.summary.grossProfit,
        color: data.summary.grossProfit < 0 ? XLSX_COLORS.rose : XLSX_COLORS.emerald,
      },
      { label: "Total Expenses", value: data.summary.totalExpenses },
      {
        label: "Net Profit",
        value: data.summary.netProfit,
        bold: true,
        color: data.summary.netProfit < 0 ? XLSX_COLORS.rose : XLSX_COLORS.emerald,
      },
    ],
  });

  row = addXlsxTable(sheet, row, {
    heading: "P&L Breakdown",
    columns: ["Line item", "Amount"],
    rows: [
      { label: "Revenue", value: data.breakdown.revenue },
      { label: "− Cost of Goods Sold", value: data.breakdown.cogs },
      { label: "= Gross Profit", value: data.breakdown.grossProfit },
      { label: "− Operating Expenses", value: data.breakdown.expenses },
      {
        label: "= Net Profit",
        value: data.breakdown.netProfit,
        bold: true,
        color: data.breakdown.netProfit < 0 ? XLSX_COLORS.rose : XLSX_COLORS.emerald,
      },
    ],
  });

  const expenseTotal = data.expenseByCategory.reduce((sum, r) => sum + r.amount, 0);
  addXlsxTable(sheet, row, {
    heading: "Expense Breakdown",
    columns: ["Category", "Amount"],
    rows: [
      ...data.expenseByCategory.map((r) => ({ label: r.categoryName, value: r.amount })),
      { label: "Total", value: expenseTotal, bold: true },
    ],
  });

  return wb;
}
