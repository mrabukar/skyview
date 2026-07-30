/**
 * DEMO MODE — report "exports" generate a small CSV locally so the
 * download buttons still work without a backend.
 */
import { apiFetch } from "@/service/client";
import type { ReportQuery } from "@/types/reports/query";
import type { FinancialSummaryResponse } from "@/types/reports/financial-summary";
import type { StockReportResponse } from "@/types/reports/stock-report";

export type ReportExportKind = "financial-summary" | "stock-report";
export type ReportExportFormat = "xlsx" | "pdf";

function toQueryString(params: ReportQuery): string {
  const search = new URLSearchParams();
  search.set("fromDate", params.fromDate);
  search.set("toDate", params.toDate);
  if (params.storeId) search.set("storeId", params.storeId);
  if (params.categoryId != null) search.set("categoryId", String(params.categoryId));
  return search.toString();
}

function downloadCsv(filename: string, rows: string[][]): void {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function downloadReportExport(
  report: ReportExportKind,
  _format: ReportExportFormat,
  params: ReportQuery,
): Promise<void> {
  const query = toQueryString(params);

  if (report === "financial-summary") {
    const data = await apiFetch<FinancialSummaryResponse>(`/api/reports/financial-summary?${query}`);
    downloadCsv("skyview-financial-summary.csv", [
      ["Metric", "Amount (KSh)"],
      ["Total revenue", String(data.summary.totalRevenue)],
      ["Cost of goods", String(data.summary.cogs)],
      ["Gross profit", String(data.summary.grossProfit)],
      ["Total expenses", String(data.summary.totalExpenses)],
      ["Net profit", String(data.summary.netProfit)],
      [],
      ["Expense category", "Amount (KSh)"],
      ...data.expenseByCategory.map((e) => [e.categoryName, String(e.amount)]),
    ]);
    return;
  }

  const data = await apiFetch<StockReportResponse>(`/api/reports/stock-report?${query}`);
  downloadCsv("skyview-stock-report.csv", [
    ["Menu item", "Avg cost", "Purchased", "In stock", "Sold"],
    ...data.products.map((p) => [
      p.productName,
      String(p.averageCost),
      String(p.purchaseDevices),
      String(p.inStock),
      String(p.salesDevices),
    ]),
  ]);
}
