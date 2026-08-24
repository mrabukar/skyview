/**
 * Branch-level menu configuration types.
 * Mirrors the shapes returned by GET /branches/:branchId/menu and related
 * PATCH endpoints. All prices are serialised as strings (Prisma Decimal).
 */

// ── Response shapes ────────────────────────────────────────────────────────────

export interface BranchMenuItemSizeConfig {
  sizeId: string;
  sizeName: string;
  /** Org-wide base price in KSh. */
  basePrice: string;
  /** Branch-specific override price, or null if using base price. */
  branchPrice: string | null;
  /** effectivePrice = branchPrice ?? basePrice */
  effectivePrice: string;
  isActive: boolean;
}

export interface BranchMenuItemConfig {
  menuItemId: string;
  itemName: string;
  categoryId: string;
  categoryName: string;
  description: string | null;
  imageKey: string | null;
  /** Short-lived presigned GET URL from branch-menu; prefer over a separate fetch. */
  imageUrl?: string | null;
  /** Branch carries this item (admin/manager toggle). */
  isEnabled: boolean;
  /** Item is currently in stock at this branch (cashier/manager toggle). */
  isInStock: boolean;
  sizes: BranchMenuItemSizeConfig[];
}

export interface BranchToppingConfig {
  toppingId: string;
  name: string;
  /** Price per unit in KSh. */
  price: string;
  /** false means the topping is temporarily out of stock at this branch. */
  isInStock: boolean;
}

export interface BranchMenuResponse {
  data: BranchMenuItemConfig[];
  toppings: BranchToppingConfig[];
}

// ── Mutation input types ───────────────────────────────────────────────────────

export interface BranchMenuItemPriceOverride {
  sizeId: string;
  /** null = revert to base price (removes the override row). */
  price: number | null;
}

export interface UpdateBranchMenuItemInput {
  isEnabled?: boolean;
  isInStock?: boolean;
  prices?: BranchMenuItemPriceOverride[];
}

export interface UpdateBranchToppingInput {
  isInStock: boolean;
}

export interface BulkEnableMenuItemsInput {
  menuItemIds: string[];
  prices?: { sizeId: string; price: number }[];
}

export interface BulkEnableResult {
  configured: number;
}
