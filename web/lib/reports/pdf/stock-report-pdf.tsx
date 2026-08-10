"use client";

import { Document, Page, Text, View, pdf } from "@react-pdf/renderer";

import { fmt } from "@/lib/utils";
import type { StockReportProduct, StockReportTotals } from "@/types/reports/stock-report";

import { PdfTable, ReportFooter, ReportHeader, pdfStyles, registerReportFonts } from "./theme";

export interface StockReportPdfData {
  orgName: string;
  periodLabel: string;
  branchLabel: string;
  generatedAt: string;
  products: StockReportProduct[];
  totals: StockReportTotals;
}

export function StockReportPdf({
  orgName,
  periodLabel,
  branchLabel,
  generatedAt,
  products,
  totals,
}: StockReportPdfData) {
  registerReportFonts();

  return (
    <Document title={`${orgName} — Stock Report`}>
      <Page size="A4" style={pdfStyles.page}>
        <ReportHeader
          orgName={orgName}
          title="Stock Report"
          desc="Purchases, stock on hand, and sales for the selected period"
          periodLabel={periodLabel}
          branchLabel={branchLabel}
        />

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Products</Text>
          {products.length > 0 ? (
            <PdfTable
              columns={["Menu item", "Avg cost", "Purchased", "In stock", "Sold"]}
              rows={[
                ...products.map((p) => [
                  p.productModel ? `${p.productName} (${p.productModel})` : p.productName,
                  fmt(p.averageCost),
                  String(p.purchaseDevices),
                  String(p.inStock),
                  String(p.salesDevices),
                ]),
                ["Total", "", String(totals.purchaseDevices), String(totals.inStock), String(totals.salesDevices)],
              ]}
            />
          ) : (
            <Text style={{ fontSize: 8.5, color: "#94a3b8" }}>
              No stock activity in this period.
            </Text>
          )}
        </View>

        <ReportFooter orgName={orgName} generatedAt={generatedAt} />
      </Page>
    </Document>
  );
}

export async function renderStockReportPdfBlob(data: StockReportPdfData): Promise<Blob> {
  return pdf(<StockReportPdf {...data} />).toBlob();
}
