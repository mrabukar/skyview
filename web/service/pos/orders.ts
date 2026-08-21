import { apiFetch } from "@/service/client";
import type {
  PosOrder,
  PaginatedOrders,
  PosOrderQuery,
  CreatePosOrderInput,
  PayOrderInput,
  VoidOrderInput,
} from "@/types/pos/order";

function toQs(params: PosOrderQuery): string {
  const s = new URLSearchParams();
  if (params.page) s.set("page", String(params.page));
  if (params.limit) s.set("limit", String(params.limit));
  if (params.status) s.set("status", params.status);
  if (params.cashierId) s.set("cashierId", params.cashierId);
  // Bridge renames storeId → branchId on the way out.
  if (params.storeId) s.set("storeId", params.storeId);
  if (params.fromDate) s.set("fromDate", params.fromDate);
  if (params.toDate) s.set("toDate", params.toDate);
  const qs = s.toString();
  return qs ? `?${qs}` : "";
}

/**
 * POST /pos/orders
 * Create a new POS order. Cashier-only; shift must be active.
 */
export function createPosOrder(data: CreatePosOrderInput): Promise<PosOrder> {
  return apiFetch<PosOrder>("/api/pos/orders", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * GET /pos/orders
 * List orders with optional filters. Role-scoped: cashiers see own branch + today.
 */
export function getPosOrders(
  params: PosOrderQuery = {},
): Promise<PaginatedOrders> {
  return apiFetch<PaginatedOrders>(`/api/pos/orders${toQs(params)}`);
}

/**
 * GET /pos/orders/:id
 * Full order detail including all lines and toppings.
 */
export function getPosOrder(id: string): Promise<PosOrder> {
  return apiFetch<PosOrder>(`/api/pos/orders/${id}`);
}

/**
 * PATCH /pos/orders/:id/pay
 * Mark a pending order as paid. Cashier-only; shift must be active.
 */
export function payPosOrder(id: string, data: PayOrderInput): Promise<PosOrder> {
  return apiFetch<PosOrder>(`/api/pos/orders/${id}/pay`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

/**
 * PATCH /pos/orders/:id/cancel
 * Cancel a pending order. Cashier-only; no shift guard.
 */
export function cancelPosOrder(id: string): Promise<PosOrder> {
  return apiFetch<PosOrder>(`/api/pos/orders/${id}/cancel`, {
    method: "PATCH",
  });
}

/**
 * PATCH /pos/orders/:id/void
 * Void a paid order. Admin/manager only; reason required (BR-POS-6.13).
 */
export function voidPosOrder(id: string, data: VoidOrderInput): Promise<PosOrder> {
  return apiFetch<PosOrder>(`/api/pos/orders/${id}/void`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
