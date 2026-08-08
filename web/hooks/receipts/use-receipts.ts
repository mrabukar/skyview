"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteReceipt,
  listPurchaseReceipts,
  listReceipts,
  uploadReceipt,
} from "@/service/receipts/receipts";
import type { ReceiptCentreQuery } from "@/types/receipts/receipt";

export function usePurchaseReceipts(purchaseId: string | null) {
  return useQuery({
    queryKey: ["receipts", "purchase", purchaseId] as const,
    queryFn: () => listPurchaseReceipts(purchaseId as string),
    enabled: Boolean(purchaseId),
  });
}

export function useReceiptCentre(query: ReceiptCentreQuery) {
  return useQuery({
    queryKey: ["receipts", "centre", query] as const,
    queryFn: () => listReceipts(query),
  });
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["receipts"] });
  // Purchases table embeds each row's receipts, so it goes stale too.
  queryClient.invalidateQueries({ queryKey: ["purchase-entries"] });
}

export function useUploadReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ purchaseId, file }: { purchaseId: string; file: File }) =>
      uploadReceipt(purchaseId, file),
    onSuccess: () => invalidate(queryClient),
  });
}

export function useDeleteReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteReceipt(id),
    onSuccess: () => invalidate(queryClient),
  });
}
