"use client";

import { Document, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";

import { fmt } from "@/lib/utils";
import type { FinancialBreakdown, FinancialSummaryMetrics } from "@/types/reports/financial-summary";
import type { ExpenseBreakdownRow } from "@/types/reports/admin-dashboard";

import {
  PDF_COLORS,
  PdfTable,
  ReportFooter,
  ReportHeader,
  TrendGlyph,
  pdfStyles,
  registerReportFonts,
} from "./theme";

export interface FinancialSummaryPdfData {
  orgName: string;
  periodLabel: string;
  branchLabel: string;
  generatedAt: string;
  summary: FinancialSummaryMetrics;
  breakdown: FinancialBreakdown;
  expenseByCategory: ExpenseBreakdownRow[];
}

type CardAccent = "indigo" | "slate" | "emerald" | "rose" | "amber";

const ACCENTS: Record<CardAccent, { fg: string; tint: string }> = {
  indigo: { fg: PDF_COLORS.indigo, tint: PDF_COLORS.tintIndigo },
  slate: { fg: PDF_COLORS.slate, tint: PDF_COLORS.tintSlate },
  emerald: { fg: PDF_COLORS.emerald, tint: PDF_COLORS.tintEmerald },
  rose: { fg: PDF_COLORS.rose, tint: PDF_COLORS.tintRose },
  amber: { fg: PDF_COLORS.amber, tint: PDF_COLORS.tintAmber },
};

const styles = StyleSheet.create({
  kpiRow: {
    flexDirection: "row",
    gap: 8,
  },
  kpiCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: PDF_COLORS.border,
    borderTopWidth: 3,
    borderRadius: 6,
    padding: 8,
  },
  kpiValue: {
    fontSize: 12.5,
    fontWeight: 800,
    marginTop: 6,
  },
  kpiLabel: {
    fontSize: 7,
    color: PDF_COLORS.fg2,
    marginTop: 2,
  },
  pnlRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 3.5,
    gap: 10,
  },
  pnlLabel: {
    width: 150,
    fontSize: 8.5,
  },
  pnlOp: {
    color: PDF_COLORS.fg3,
  },
  pnlTrack: {
    flex: 1,
    height: 8,
    backgroundColor: PDF_COLORS.tintSlate,
    borderRadius: 3,
  },
  pnlFill: {
    height: "100%",
    borderRadius: 3,
  },
  pnlAmount: {
    width: 70,
    fontSize: 8.5,
    fontWeight: 700,
    textAlign: "right",
  },
});

function KpiCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: CardAccent;
}) {
  const { fg, tint } = ACCENTS[accent];
  return (
    <View style={[styles.kpiCard, { borderTopColor: fg, backgroundColor: tint }]}>
      <TrendGlyph color={fg} size={11} />
      <Text style={[styles.kpiValue, { color: fg === PDF_COLORS.slate ? PDF_COLORS.fg1 : fg }]}>
        {value}
      </Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

function PnlRow({
  op,
  label,
  value,
  base,
  color,
  emphasize,
}: {
  op: string;
  label: string;
  value: number;
  base: number;
  color: string;
  emphasize?: boolean;
}) {
  const width = Math.min(100, Math.round((Math.abs(value) / base) * 100));
  return (
    <View style={styles.pnlRow}>
      <Text style={styles.pnlLabel}>
        <Text style={styles.pnlOp}>{op} </Text>
        {label}
      </Text>
      <View style={styles.pnlTrack}>
        <View style={[styles.pnlFill, { width: `${width}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.pnlAmount, { color: emphasize ? color : PDF_COLORS.fg1 }]}>
        {fmt(value)}
      </Text>
    </View>
  );
}

export function FinancialSummaryPdf({
  orgName,
  periodLabel,
  branchLabel,
  generatedAt,
  summary,
  breakdown,
  expenseByCategory,
}: FinancialSummaryPdfData) {
  registerReportFonts();

  const grossAccent: CardAccent = summary.grossProfit < 0 ? "rose" : "emerald";
  const netAccent: CardAccent = summary.netProfit < 0 ? "rose" : "emerald";
  const base = breakdown.revenue > 0 ? breakdown.revenue : 1;
  const netColor = breakdown.netProfit < 0 ? PDF_COLORS.rose : PDF_COLORS.emerald;

  const expenseTotal = expenseByCategory.reduce((sum, row) => sum + row.amount, 0);

  return (
    <Document title={`${orgName} — Financial Summary`}>
      <Page size="A4" style={pdfStyles.page}>
        <ReportHeader
          orgName={orgName}
          title="Financial Summary"
          desc="Revenue, cost, and profit for the selected period"
          periodLabel={periodLabel}
          branchLabel={branchLabel}
        />

        <View style={styles.kpiRow}>
          <KpiCard label="Total Revenue" value={fmt(summary.totalRevenue)} accent="indigo" />
          <KpiCard label="Purchases" value={fmt(summary.cogs)} accent="slate" />
          <KpiCard label="Gross Profit" value={fmt(summary.grossProfit)} accent={grossAccent} />
          <KpiCard label="Total Expenses" value={fmt(summary.totalExpenses)} accent="amber" />
          <KpiCard label="Net Profit" value={fmt(summary.netProfit)} accent={netAccent} />
        </View>

        <View style={[pdfStyles.section, { marginTop: 14 }]}>
          <Text style={pdfStyles.sectionTitle}>Summary</Text>
          <PdfTable
            columns={["Metric", "Amount"]}
            rows={[
              ["Total Revenue", fmt(summary.totalRevenue)],
              ["Purchases", fmt(summary.cogs)],
              ["Gross Profit", fmt(summary.grossProfit)],
              ["Total Expenses", fmt(summary.totalExpenses)],
              ["Net Profit", fmt(summary.netProfit)],
            ]}
            rowColors={{ 2: ACCENTS[grossAccent].fg, 4: ACCENTS[netAccent].fg }}
            boldRows={[4]}
          />
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>P&L Breakdown</Text>
          <PnlRow op="" label="Revenue" value={breakdown.revenue} base={base} color={PDF_COLORS.indigo} />
          <PnlRow op="−" label="Cost of Goods Sold" value={breakdown.cogs} base={base} color={PDF_COLORS.slate} />
          <PnlRow op="=" label="Gross Profit" value={breakdown.grossProfit} base={base} color={PDF_COLORS.emerald} />
          <PnlRow op="−" label="Operating Expenses" value={breakdown.expenses} base={base} color={PDF_COLORS.amber} />
          <PnlRow
            op="="
            label="Net Profit"
            value={breakdown.netProfit}
            base={base}
            color={netColor}
            emphasize
          />
          <View style={{ marginTop: 6 }}>
            <PdfTable
              columns={["Line item", "Amount"]}
              rows={[
                ["Revenue", fmt(breakdown.revenue)],
                ["− Cost of Goods Sold", fmt(breakdown.cogs)],
                ["= Gross Profit", fmt(breakdown.grossProfit)],
                ["− Operating Expenses", fmt(breakdown.expenses)],
                ["= Net Profit", fmt(breakdown.netProfit)],
              ]}
              rowColors={{ 4: netColor }}
              boldRows={[4]}
            />
          </View>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Expense Breakdown</Text>
          {expenseByCategory.length > 0 ? (
            <PdfTable
              columns={["Category", "Amount"]}
              rows={[
                ...expenseByCategory.map((row) => [row.categoryName, fmt(row.amount)]),
                ["Total", fmt(expenseTotal)],
              ]}
            />
          ) : (
            <Text style={{ fontSize: 8.5, color: PDF_COLORS.fg3 }}>
              No expenses recorded in this period.
            </Text>
          )}
        </View>

        <ReportFooter orgName={orgName} generatedAt={generatedAt} />
      </Page>
    </Document>
  );
}

export async function renderFinancialSummaryPdfBlob(
  data: FinancialSummaryPdfData,
): Promise<Blob> {
  return pdf(<FinancialSummaryPdf {...data} />).toBlob();
}
