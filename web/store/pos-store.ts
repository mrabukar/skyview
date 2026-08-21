"use client";

import { create } from "zustand";
import type { CartLine, CartTopping, DiscountType } from "@/types/pos/order";

// Re-export for convenience.
export type { CartLine, CartTopping };

interface PosState {
  /** The branch this POS session is for. */
  storeId: string | null;
  /** In-progress order lines. */
  lines: CartLine[];
  discountType: DiscountType | null;
  discountValue: number | null;

  // ── Actions ─────────────────────────────────────────────────────────────────

  setStore: (id: string) => void;

  /** Append a line; if an identical size+topping combo exists, increment qty. */
  addLine: (line: CartLine) => void;

  /** Set a line's quantity. qty ≤ 0 removes the line. */
  updateLineQty: (index: number, qty: number) => void;

  removeLine: (index: number) => void;

  setDiscount: (
    type: DiscountType | null,
    value: number | null,
  ) => void;

  /** Clear all lines and discount — call after a successful order creation. */
  clearCart: () => void;
}

// ── Derived helpers ────────────────────────────────────────────────────────────

function lineKey(line: CartLine): string {
  const toppingIds = line.toppings
    .map((t) => t.id)
    .sort()
    .join(",");
  return `${line.menuItemSizeId}::${toppingIds}`;
}

function lineTotalPrice(line: CartLine): number {
  const toppingUnitCost = line.toppings.reduce((s, t) => s + t.price, 0);
  return (line.unitPrice + toppingUnitCost) * line.quantity;
}

// ── Computed selectors (exported for components) ───────────────────────────────

export function selectCartSubtotal(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + lineTotalPrice(l), 0);
}

export function selectCartTotal(
  lines: CartLine[],
  discountType: DiscountType | null,
  discountValue: number | null,
): number {
  const subtotal = selectCartSubtotal(lines);
  if (discountType === null || discountValue === null || discountValue <= 0) {
    return subtotal;
  }
  const discount =
    discountType === "percentage"
      ? (subtotal * discountValue) / 100
      : discountValue;
  return Math.max(0, subtotal - discount);
}

// ── Store ──────────────────────────────────────────────────────────────────────

export const usePosStore = create<PosState>()((set) => ({
  storeId: null,
  lines: [],
  discountType: null,
  discountValue: null,

  setStore: (id) => set({ storeId: id, lines: [], discountType: null, discountValue: null }),

  addLine: (incoming) =>
    set((state) => {
      const key = lineKey(incoming);
      const existing = state.lines.findIndex((l) => lineKey(l) === key);
      if (existing !== -1) {
        // Merge: increment quantity of existing line.
        const updated = state.lines.map((l, i) =>
          i === existing ? { ...l, quantity: l.quantity + incoming.quantity } : l,
        );
        return { lines: updated };
      }
      return { lines: [...state.lines, incoming] };
    }),

  updateLineQty: (index, qty) =>
    set((state) => {
      if (qty <= 0) {
        return { lines: state.lines.filter((_, i) => i !== index) };
      }
      return {
        lines: state.lines.map((l, i) => (i === index ? { ...l, quantity: qty } : l)),
      };
    }),

  removeLine: (index) =>
    set((state) => ({ lines: state.lines.filter((_, i) => i !== index) })),

  setDiscount: (type, value) => set({ discountType: type, discountValue: value }),

  clearCart: () => set({ lines: [], discountType: null, discountValue: null }),
}));
