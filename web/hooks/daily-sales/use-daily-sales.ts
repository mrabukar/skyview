"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/service/client";
import type {
  CreateDailySaleInput,
  DailySale,
  DailySaleListQuery,
  DailySaleListResponse,
  UpdateDailySaleInput,
} from "@/types/daily-sales/daily-sale";

function toQueryString(params: DailySaleListQuery = {}): string {
  const search = new URLSearchParams();
  if (params.page != null) search.set("page", String(params.page));
  if (params.limit != null) search.set("limit", String(params.limit));
  if (params.storeId) search.set("storeId", params.storeId);
  if (params.fromDate) search.set("fromDate", params.fromDate);
  if (params.toDate) search.set("toDate", params.toDate);
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function listDailySales(params: DailySaleListQuery = {}): Promise<DailySaleListResponse> {
  return apiFetch<DailySaleListResponse>(`/api/daily-sales${toQueryString(params)}`);
}

export function useDailySales(params: DailySaleListQuery = {}) {
  return useQuery({
    queryKey: ["daily-sales", params] as const,
    queryFn: () => listDailySales(params),
  });
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["daily-sales"] });
  queryClient.invalidateQueries({ queryKey: ["reports"] });
  queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
}

export function useCreateDailySale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDailySaleInput) =>
      apiFetch<DailySale>("/api/daily-sales", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidate(queryClient),
  });
}

export function useUpdateDailySale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateDailySaleInput }) =>
      apiFetch<DailySale>(`/api/daily-sales/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidate(queryClient),
  });
}

export function useDeleteDailySale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/daily-sales/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidate(queryClient),
  });
}
