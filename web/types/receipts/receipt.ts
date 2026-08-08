import type { PaginatedResponse } from "@/types/common/pagination";

/**
 * A receipt attached to a purchase. Note the client bridge renames the API's
 * `branchId`/`branchName` to `storeId`/`storeName` on the way in.
 */
export interface Receipt {
  id: string;
  purchaseId: string;
  storeId: string;
  storeName: string | null;
  itemName: string | null;
  vendorName: string | null;
  purchaseDate: string | null;
  originalName: string;
  contentType: string;
  size: number;
  uploadedByName: string | null;
  createdAt: string;
  /** Short-lived pre-signed GET URL for viewing/downloading. */
  url: string;
}

export type ReceiptListResponse = PaginatedResponse<Receipt>;

export interface UploadUrlResponse {
  key: string;
  url: string;
  expiresIn: number;
}

export interface ReceiptCentreQuery {
  page?: number;
  limit?: number;
  storeId?: string;
  fromDate?: string;
  toDate?: string;
}

/** Accepted receipt file types (mirror of the API). */
export const RECEIPT_ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";
export const RECEIPT_MAX_SIZE = 10 * 1024 * 1024;
