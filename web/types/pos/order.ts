/**
 * POS order types — orders, lines, toppings, and cart state.
 *
 * Note on bridge naming: the apiFetch bridge renames `branchId → storeId` and
 * `branch → store` in response bodies, so these types use `storeId`/`store`
 * where the raw API uses `branchId`/`branch`.
 */

// ── Enums ──────────────────────────────────────────────────────────────────────

export type OrderStatus = "pending" | "paid" | "cancelled" | "voided";
export type PaymentMethod = "cash" | "mpesa" | "card";
export type DiscountType = "percentage" | "fixed";

// ── Response shapes ────────────────────────────────────────────────────────────

export interface OrderLineTopping {
  id: string;
  toppingId: string;
  toppingName: string;
  /** Per-unit topping price at time of sale, serialised Decimal. */
  price: string;
}

export interface OrderLine {
  id: string;
  menuItemId: string;
  menuItemSizeId: string;
  /** Snapshot: item name at time of sale. */
  itemName: string;
  /** Snapshot: size name at time of sale. */
  sizeName: string;
  /** Snapshot: effective branch price for this size at time of sale. */
  unitPrice: string;
  quantity: number;
  /** sum(topping.price) × quantity */
  toppingsTotal: string;
  /** (unitPrice × quantity) + toppingsTotal */
  lineTotal: string;
  toppings: OrderLineTopping[];
}

export interface PosOrder {
  id: string;
  /** Renamed from branchId by the apiFetch bridge. */
  storeId: string;
  /** Renamed from branch by the apiFetch bridge. */
  store: { id: string; name: string; address: string } | null;
  orderNumber: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod | null;
  /** Sum of all line totals before discount. */
  subtotal: string;
  discountType: DiscountType | null;
  discountValue: string | null;
  /** Computed discount amount in KSh. */
  discountAmount: string | null;
  /** subtotal − discountAmount. */
  totalAmount: string;
  cashierId: string;
  cashier: { id: string; name: string } | null;
  voidedById: string | null;
  voidedBy: { id: string; name: string } | null;
  voidReason: string | null;
  voidedAt: string | null;
  lines: OrderLine[];
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedOrders {
  data: PosOrder[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ── Query types ────────────────────────────────────────────────────────────────

export interface PosOrderQuery {
  page?: number;
  limit?: number;
  /** Filter by order status. */
  status?: OrderStatus;
  /** Filter by cashier id. */
  cashierId?: string;
  /** Filter by branch id — use `storeId` (bridge renames to branchId on send). */
  storeId?: string;
  fromDate?: string;
  toDate?: string;
}

// ── Mutation input types ───────────────────────────────────────────────────────

export interface CreateOrderLineInput {
  menuItemSizeId: string;
  quantity: number;
  toppingIds?: string[];
}

export interface CreatePosOrderInput {
  lines: CreateOrderLineInput[];
  discountType?: DiscountType;
  discountValue?: number;
}

export interface PayOrderInput {
  /** Omitting means "not recorded" — the order is still marked paid. */
  paymentMethod?: PaymentMethod;
}

export interface VoidOrderInput {
  reason: string;
}

// ── Cart state (local only, never sent as-is to the API) ──────────────────────

export interface CartTopping {
  id: string;
  name: string;
  /** Price per unit as a plain number for arithmetic. */
  price: number;
}

export interface CartLine {
  /** Correlates to MenuItemSizeConfig.sizeId. */
  menuItemSizeId: string;
  itemName: string;
  sizeName: string;
  /** Effective branch price for this size. */
  unitPrice: number;
  quantity: number;
  toppings: CartTopping[];
  /** Local-only; used for cart thumbnails. Not sent to the API. */
  imageKey?: string | null;
}
