"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/service/client";
import type {
  CreatePurchaseEntryInput,
  PurchaseEntry,
  PurchaseEntryListQuery,
  PurchaseEntryListResponse,
  UpdatePurchaseEntryInput,
} from "@/types/purchases/purchase-entry";

function toQueryString(params: PurchaseEntryListQuery = {}): string {
  const search = new URLSearchParams();
  if (params.page != null) search.set("page", String(params.page));
  if (params.limit != null) search.set("limit", String(params.limit));
  if (params.search) search.set("search", params.search);
  if (params.storeId) search.set("storeId", params.storeId);
  if (params.vendorIds && params.vendorIds.length > 0) {
    search.set("vendorId", params.vendorIds.join(","));
  }
  if (params.fromDate) search.set("fromDate", params.fromDate);
  if (params.toDate) search.set("toDate", params.toDate);
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function listPurchaseEntries(
  params: PurchaseEntryListQuery = {},
): Promise<PurchaseEntryListResponse> {
  return apiFetch<PurchaseEntryListResponse>(`/api/purchases${toQueryString(params)}`);
}

export function usePurchaseEntries(params: PurchaseEntryListQuery = {}) {
  return useQuery({
    queryKey: ["purchase-entries", params] as const,
    queryFn: () => listPurchaseEntries(params),
  });
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["purchase-entries"] });
  queryClient.invalidateQueries({ queryKey: ["vendors"] });
  queryClient.invalidateQueries({ queryKey: ["reports"] });
  queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
}

export function useCreatePurchaseEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePurchaseEntryInput) =>
      apiFetch<PurchaseEntry>("/api/purchases", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidate(queryClient),
  });
}

export function useUpdatePurchaseEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdatePurchaseEntryInput }) =>
      apiFetch<PurchaseEntry>(`/api/purchases/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidate(queryClient),
  });
}

export function useDeletePurchaseEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/purchases/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidate(queryClient),
  });
}
