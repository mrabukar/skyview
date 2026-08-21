import type { PosOrder } from "@/types/pos/order";

export const DEFAULT_INVOICE_ORG_NAME = "Bubble Tea Palace";
export const WALK_IN_CUSTOMER = "Walk In Customer";

export function fmtKsh(val: string | number | null | undefined): string {
  const n = Number(val);
  if (val === null || val === undefined || Number.isNaN(n)) return "—";
  return `KSh ${n.toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function fmtInvoiceId(orderNumber: number, createdAt: string): string {
  const year = new Date(createdAt).getFullYear();
  return `INV-${year}-${String(orderNumber).padStart(6, "0")}`;
}

export function fmtInvoiceDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function paymentLabel(method: string | null): string {
  if (!method) return "Not recorded";
  const map: Record<string, string> = {
    cash: "Cash",
    mpesa: "M-Pesa",
    card: "Card",
  };
  return map[method] ?? method;
}

export function paidAndDue(order: PosOrder): { paid: number; due: number } {
  const total = Number(order.totalAmount) || 0;
  if (order.status === "paid") return { paid: total, due: 0 };
  return { paid: 0, due: total };
}

export function invoiceLineCount(order: PosOrder): number {
  return order.lines.length;
}

export function invoiceQtyTotal(order: PosOrder): number {
  return order.lines.reduce((sum, line) => sum + line.quantity, 0);
}

export function discountLabel(order: PosOrder): string | null {
  if (order.discountAmount === null || Number(order.discountAmount) <= 0) {
    return null;
  }
  if (order.discountType === "percentage") {
    return `Discount (${Number(order.discountValue).toFixed(0)}%)`;
  }
  return "Discount (fixed)";
}

export function orgDisplayName(name: string | null | undefined): string {
  const trimmed = name?.trim();
  return trimmed || DEFAULT_INVOICE_ORG_NAME;
}
