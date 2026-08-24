/**
 * Report exports — built entirely client-side (no export endpoint on the
 * API yet). PDFs are real vector documents via @react-pdf/renderer; Excel
 * files are real .xlsx workbooks via exceljs. Both are branded with the
 * org's name/logo mark and the app's color theme.
 *
 * Heavy PDF/XLSX modules are dynamic-imported so Financial Summary pages
 * do not pull them into the initial JS chunk.
 */
import { apiFetch } from "@/service/client";
import { getStore } from "@/service/stores/get-store";
import { formatPeriodLabel } from "@/lib/filters/dates";
import { useAppStore } from "@/store/app";
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

function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function resolveReportContext(params: ReportQuery) {
  const orgName = useAppStore.getState().user?.organizationName ?? "Skyview";
  const branchLabel = params.storeId
    ? await getStore(params.storeId)
        .then((store) => store.name)
        .catch(() => "Selected branch")
    : "All branches";

  return {
    orgName,
    branchLabel,
    // "→" isn't in the embedded PDF font's (Latin-subset) glyph coverage —
    // swap in an en dash, which renders fine in both the PDF and Excel.
    periodLabel: formatPeriodLabel(params.fromDate, params.toDate).replace("→", "–"),
    generatedAt: `Generated ${new Date().toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`,
  };
}

export async function downloadReportExport(
  report: ReportExportKind,
  format: ReportExportFormat,
  params: ReportQuery,
): Promise<void> {
  const query = toQueryString(params);
  const context = await resolveReportContext(params);

  if (report === "financial-summary") {
    const data = await apiFetch<FinancialSummaryResponse>(
      `/api/reports/financial-summary?${query}`,
    );
    const payload = {
      ...context,
      summary: data.summary,
      breakdown: data.breakdown,
      expenseByCategory: data.expenseByCategory,
    };

    if (format === "pdf") {
      const { renderFinancialSummaryPdfBlob } = await import(
        "@/lib/reports/pdf/financial-summary-pdf"
      );
      downloadBlob(
        "skyview-financial-summary.pdf",
        await renderFinancialSummaryPdfBlob(payload),
      );
      return;
    }

    const { buildFinancialSummaryWorkbook } = await import(
      "@/lib/reports/xlsx/financial-summary-xlsx"
    );
    const workbook = buildFinancialSummaryWorkbook(payload);
    downloadBlob(
      "skyview-financial-summary.xlsx",
      new Blob([await workbook.xlsx.writeBuffer()], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
    );
    return;
  }

  const data = await apiFetch<StockReportResponse>(`/api/reports/stock-report?${query}`);
  const payload = { ...context, products: data.products, totals: data.totals };

  if (format === "pdf") {
    const { renderStockReportPdfBlob } = await import(
      "@/lib/reports/pdf/stock-report-pdf"
    );
    downloadBlob("skyview-stock-report.pdf", await renderStockReportPdfBlob(payload));
    return;
  }

  const { buildStockReportWorkbook } = await import(
    "@/lib/reports/xlsx/stock-report-xlsx"
  );
  const workbook = buildStockReportWorkbook(payload);
  downloadBlob(
    "skyview-stock-report.xlsx",
    new Blob([await workbook.xlsx.writeBuffer()], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
  );
}
