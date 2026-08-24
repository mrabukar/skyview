"use client";

/**
 * @react-pdf/renderer document for the POS tax invoice.
 * 80mm-wide receipt. Avoid dotted borders and % widths — they crash yoga
 * (`operations.forEach is not a function`).
 */
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { ReportLogoMark } from "@/lib/reports/pdf/theme";
import {
  WALK_IN_CUSTOMER,
  discountLabel,
  fmtDateTime,
  fmtInvoiceDate,
  fmtInvoiceId,
  fmtKsh,
  invoiceLineCount,
  invoiceQtyTotal,
  orgDisplayName,
  paymentLabel,
} from "@/lib/pos/invoice";
import type { PosOrder } from "@/types/pos/order";

/** 80mm thermal receipt width in PDF points. Height is fitted to content. */
const RECEIPT_WIDTH = 226.77;

function receiptPageHeight(order: PosOrder): number {
  const lineRows = (order.lines ?? []).reduce(
    (n, line) => n + 1 + line.toppings.length,
    0,
  );
  const voided = order.status === "voided" ? 56 : 0;
  const discount = discountLabel(order) ? 18 : 0;
  return Math.min(841.89, Math.max(360, 200 + lineRows * 22 + voided + discount));
}

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 8,
    color: "#1a1a1a",
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  brand: {
    alignItems: "center",
    marginBottom: 6,
  },
  orgName: {
    marginTop: 4,
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.4,
    textAlign: "center",
  },
  contact: {
    marginTop: 3,
    fontSize: 7,
    color: "#555",
    textAlign: "center",
  },
  rule: {
    borderBottomWidth: 0.75,
    borderBottomColor: "#c4b8a8",
    marginVertical: 5,
  },
  title: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    letterSpacing: 1,
    paddingVertical: 2,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  metaText: { fontSize: 7 },
  metaValue: { fontFamily: "Helvetica-Bold" },
  table: { marginTop: 6, marginBottom: 4 },
  tableHead: {
    flexDirection: "row",
    backgroundColor: "#3F201B",
    paddingVertical: 4,
    paddingHorizontal: 3,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: "#eae1d5",
  },
  colNum: { width: 14 },
  colItem: { width: 82 },
  colQty: { width: 22, textAlign: "center" },
  colRate: { width: 44, textAlign: "right" },
  colTotal: { width: 44, textAlign: "right" },
  th: { fontSize: 6.5, fontFamily: "Helvetica-Bold", color: "#ffffff" },
  td: { fontSize: 7.5, color: "#2b1b12" },
  tdMuted: { fontSize: 7.5, color: "#64748b" },
  topping: { fontSize: 6.5, color: "#64748b", marginTop: 1 },
  discount: {
    fontSize: 7.5,
    color: "#b91c1c",
    textAlign: "right",
    marginBottom: 4,
  },
  summary: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    fontSize: 7.5,
  },
  payment: { fontSize: 7.5, marginBottom: 10 },
  footer: {
    textAlign: "center",
    color: "#888",
    fontSize: 7.5,
  },
  voidedBanner: {
    backgroundColor: "#fee2e2",
    padding: 6,
    marginBottom: 8,
  },
  voidedTitle: {
    color: "#b91c1c",
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    textAlign: "center",
    marginBottom: 3,
  },
  voidedDetails: { color: "#b91c1c", fontSize: 7.5, textAlign: "center" },
});

interface Props {
  order: PosOrder;
  organizationName?: string | null;
}

export function InvoicePdfDocument({ order, organizationName }: Props) {
  const isVoided = order.status === "voided";
  const invoiceId = fmtInvoiceId(order.orderNumber, order.createdAt);
  const orgName = orgDisplayName(organizationName).toUpperCase();
  const discount = discountLabel(order);
  const contact = [order.store?.name, order.store?.address]
    .filter(Boolean)
    .join(" · ");

  return (
    <Document
      title={`Invoice ${invoiceId}`}
      author={orgName}
      subject="POS Tax Invoice"
    >
      <Page size={[RECEIPT_WIDTH, receiptPageHeight(order)]} style={s.page}>
        {isVoided ? (
          <View style={s.voidedBanner}>
            <Text style={s.voidedTitle}>ORDER VOIDED</Text>
            {order.voidedAt ? (
              <Text style={s.voidedDetails}>
                Voided on {fmtDateTime(order.voidedAt)}
                {order.voidedBy ? ` by ${order.voidedBy.name}` : ""}
              </Text>
            ) : null}
            {order.voidReason ? (
              <Text style={s.voidedDetails}>Reason: {order.voidReason}</Text>
            ) : null}
          </View>
        ) : null}

        <View style={s.brand}>
          <ReportLogoMark size={28} />
          <Text style={s.orgName}>{orgName}</Text>
          {contact ? <Text style={s.contact}>{contact}</Text> : null}
        </View>

        <View style={s.rule} />
        <Text style={s.title}>TAX INVOICE</Text>
        <View style={s.rule} />

        <View style={s.metaRow}>
          <Text style={s.metaText}>
            Invoice: <Text style={s.metaValue}>{invoiceId}</Text>
          </Text>
          <Text style={s.metaText}>
            Date:{" "}
            <Text style={s.metaValue}>{fmtInvoiceDate(order.createdAt)}</Text>
          </Text>
        </View>
        <View style={s.metaRow}>
          <Text style={s.metaText}>
            Customer: <Text style={s.metaValue}>{WALK_IN_CUSTOMER}</Text>
          </Text>
          <Text style={s.metaText}>
            Sold By:{" "}
            <Text style={s.metaValue}>{order.cashier?.name ?? "—"}</Text>
          </Text>
        </View>

        <View style={s.table}>
          <View style={s.tableHead}>
            <Text style={[s.th, s.colNum]}>#</Text>
            <Text style={[s.th, s.colItem]}>ITEM</Text>
            <Text style={[s.th, s.colQty]}>QTY</Text>
            <Text style={[s.th, s.colRate]}>RATE</Text>
            <Text style={[s.th, s.colTotal]}>TOTAL</Text>
          </View>
          {(order.lines ?? []).map((line, index) => (
            <View key={line.id} style={s.tableRow}>
              <Text style={[s.tdMuted, s.colNum]}>{index + 1}</Text>
              <View style={s.colItem}>
                <Text style={s.td}>
                  {line.itemName}
                  {line.sizeName ? ` (${line.sizeName})` : ""}
                </Text>
                {line.toppings.map((t) => (
                  <Text key={t.id} style={s.topping}>
                    + {t.toppingName}
                  </Text>
                ))}
              </View>
              <Text style={[s.td, s.colQty]}>{line.quantity}</Text>
              <Text style={[s.td, s.colRate]}>{fmtKsh(line.unitPrice)}</Text>
              <Text style={[s.td, s.colTotal]}>{fmtKsh(line.lineTotal)}</Text>
            </View>
          ))}
        </View>

        {discount ? (
          <Text style={s.discount}>
            {discount}: −{fmtKsh(order.discountAmount)}
          </Text>
        ) : null}

        <View style={s.rule} />
        <View style={s.summary}>
          <Text>
            Items: <Text style={s.metaValue}>{invoiceLineCount(order)}</Text>
          </Text>
          <Text>
            Qty: <Text style={s.metaValue}>{invoiceQtyTotal(order)}</Text>
          </Text>
          <Text>
            Total: <Text style={s.metaValue}>{fmtKsh(order.totalAmount)}</Text>
          </Text>
        </View>
        <View style={s.rule} />

        <Text style={s.payment}>
          Payment Mode: {fmtKsh(order.totalAmount)} (
          {paymentLabel(order.paymentMethod)})
        </Text>

        <Text style={s.footer}>
          Thank You For Shopping With Us. Please Come Again
        </Text>
      </Page>
    </Document>
  );
}
