import { apiFetch } from "@/service/client";
import type {
  BranchMenuResponse,
  BranchMenuItemConfig,
  BulkEnableResult,
  UpdateBranchMenuItemInput,
  UpdateBranchToppingInput,
  BulkEnableMenuItemsInput,
} from "@/types/pos/branch-menu";

/**
 * GET /branches/:branchId/menu
 * Full menu configuration for a branch with availability, stock status, and
 * effective prices. Cashiers receive enabled items, including out of stock.
 */
export function getBranchMenu(branchId: string): Promise<BranchMenuResponse> {
  return apiFetch<BranchMenuResponse>(`/api/branches/${branchId}/menu`);
}

/**
 * PATCH /branches/:branchId/menu-items/:menuItemId
 * Set isEnabled, isInStock, and/or per-size price overrides.
 * Cashiers may only set isInStock.
 */
export function updateBranchMenuItem(
  branchId: string,
  menuItemId: string,
  data: UpdateBranchMenuItemInput,
): Promise<BranchMenuItemConfig> {
  return apiFetch<BranchMenuItemConfig>(
    `/api/branches/${branchId}/menu-items/${menuItemId}`,
    { method: "PATCH", body: JSON.stringify(data) },
  );
}

/**
 * POST /branches/:branchId/menu-items/bulk
 * Bulk-enable multiple items at a branch (admin only, idempotent).
 */
export function bulkEnableMenuItems(
  branchId: string,
  data: BulkEnableMenuItemsInput,
): Promise<BulkEnableResult> {
  return apiFetch<BulkEnableResult>(
    `/api/branches/${branchId}/menu-items/bulk`,
    { method: "POST", body: JSON.stringify(data) },
  );
}

/**
 * PATCH /branches/:branchId/toppings/:toppingId
 * Toggle whether a topping is in stock at this branch.
 */
export function updateBranchTopping(
  branchId: string,
  toppingId: string,
  data: UpdateBranchToppingInput,
): Promise<{ toppingId: string; isInStock: boolean }> {
  return apiFetch<{ toppingId: string; isInStock: boolean }>(
    `/api/branches/${branchId}/toppings/${toppingId}`,
    { method: "PATCH", body: JSON.stringify(data) },
  );
}
