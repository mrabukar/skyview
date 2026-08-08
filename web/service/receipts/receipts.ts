import { apiFetch } from "@/service/client";
import type {
  Receipt,
  ReceiptCentreQuery,
  ReceiptListResponse,
  UploadUrlResponse,
} from "@/types/receipts/receipt";

/** Receipts attached to one purchase. */
export function listPurchaseReceipts(purchaseId: string): Promise<Receipt[]> {
  return apiFetch<ReceiptListResponse>(
    `/api/receipts?purchaseId=${encodeURIComponent(purchaseId)}`,
  ).then((r) => r.data);
}

/** Paginated Receipt Centre feed (branch-scoped server-side). */
export function listReceipts(
  query: ReceiptCentreQuery = {},
): Promise<ReceiptListResponse> {
  const params = new URLSearchParams();
  if (query.page != null) params.set("page", String(query.page));
  if (query.limit != null) params.set("limit", String(query.limit));
  // Bridge renames storeId → branchId on the way out.
  if (query.storeId) params.set("storeId", query.storeId);
  if (query.fromDate) params.set("fromDate", query.fromDate);
  if (query.toDate) params.set("toDate", query.toDate);
  const qs = params.toString();
  return apiFetch<ReceiptListResponse>(`/api/receipts${qs ? `?${qs}` : ""}`);
}

export function deleteReceipt(id: string): Promise<void> {
  return apiFetch<void>(`/api/receipts/${id}`, { method: "DELETE" });
}

/**
 * Full upload flow: ask the API for a pre-signed PUT, upload the bytes straight
 * to R2, then persist metadata. Returns the created Receipt.
 */
export async function uploadReceipt(
  purchaseId: string,
  file: File,
): Promise<Receipt> {
  const { key, url } = await apiFetch<UploadUrlResponse>(
    "/api/receipts/upload-url",
    {
      method: "POST",
      body: JSON.stringify({
        purchaseId,
        contentType: file.type,
        size: file.size,
      }),
    },
  );

  // Direct browser → R2 PUT. Must NOT go through apiFetch (different origin);
  // the Content-Type must match what was signed.
  const put = await fetch(url, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });
  if (!put.ok) {
    throw new Error("Upload to storage failed. Please try again.");
  }

  return apiFetch<Receipt>("/api/receipts", {
    method: "POST",
    body: JSON.stringify({
      purchaseId,
      key,
      contentType: file.type,
      size: file.size,
      originalName: file.name,
    }),
  });
}
