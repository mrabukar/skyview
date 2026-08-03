import type { PaginatedResponse } from "@/types/common/pagination";
import type { Store } from "@/types/stores/store";
import type { Vendor } from "@/types/vendors/vendor";

export interface PurchaseEntryUser {
  id: string;
  name: string;
  email: string;
}

/** A branch supply purchase — free-text item, no stock tracking. */
export interface PurchaseEntry {
  id: string;
  storeId: string;
  store: Pick<Store, "id" | "name">;
  itemName: string;
  quantity: number;
  unitPrice: number | string;
  totalCost: number | string;
  vendorId: string;
  vendor: Pick<Vendor, "id" | "name">;
  purchaseDate: string; // YYYY-MM-DD
  note: string | null;
  createdById: string;
  createdBy: PurchaseEntryUser;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseEntryListQuery {
  page?: number;
  limit?: number;
  search?: string;
  storeId?: string;
  vendorId?: string;
  fromDate?: string;
  toDate?: string;
}

export type PurchaseEntryListResponse = PaginatedResponse<PurchaseEntry>;

export interface CreatePurchaseEntryInput {
  storeId?: string; // managers: implied own branch
  itemName: string;
  quantity: number;
  unitPrice: number;
  vendorId: string;
  purchaseDate: string;
  note?: string;
}

export interface UpdatePurchaseEntryInput {
  itemName?: string;
  quantity?: number;
  unitPrice?: number;
  vendorId?: string;
  purchaseDate?: string;
  note?: string;
}
