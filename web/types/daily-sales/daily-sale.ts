import type { PaginatedResponse } from "@/types/common/pagination";
import type { Store } from "@/types/stores/store";

export interface DailySaleUser {
  id: string;
  name: string;
  email: string;
}

/** One sales total per branch per day. */
export interface DailySale {
  id: string;
  storeId: string;
  store: Pick<Store, "id" | "name">;
  saleDate: string; // YYYY-MM-DD
  totalAmount: number | string;
  note: string | null;
  enteredById: string;
  enteredBy: DailySaleUser;
  createdAt: string;
  updatedAt: string;
}

export interface DailySaleListQuery {
  page?: number;
  limit?: number;
  storeId?: string;
  fromDate?: string;
  toDate?: string;
}

export type DailySaleListResponse = PaginatedResponse<DailySale>;

export interface CreateDailySaleInput {
  storeId?: string; // managers: implied own branch
  saleDate: string;
  totalAmount: number;
  note?: string;
}

export interface UpdateDailySaleInput {
  saleDate?: string;
  totalAmount?: number;
  note?: string;
}
