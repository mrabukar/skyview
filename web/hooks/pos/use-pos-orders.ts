"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createPosOrder,
  getPosOrders,
  getPosOrder,
  payPosOrder,
  cancelPosOrder,
  voidPosOrder,
} from "@/service/pos/orders";
import type {
  PosOrderQuery,
  CreatePosOrderInput,
  PayOrderInput,
  VoidOrderInput,
} from "@/types/pos/order";

export const posOrdersQueryKey = (params: PosOrderQuery = {}) =>
  ["pos-orders", params] as const;

export const posOrderQueryKey = (id: string) =>
  ["pos-orders", id] as const;

// ── Queries ────────────────────────────────────────────────────────────────────

export function usePosOrders(params: PosOrderQuery = {}) {
  return useQuery({
    queryKey: posOrdersQueryKey(params),
    queryFn: () => getPosOrders(params),
  });
}

export function usePosOrder(id: string) {
  return useQuery({
    queryKey: posOrderQueryKey(id),
    queryFn: () => getPosOrder(id),
    enabled: Boolean(id),
  });
}

// ── Mutations ──────────────────────────────────────────────────────────────────

/** Create a new POS order (cashier-only; shift must be active). */
export function useCreatePosOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePosOrderInput) => createPosOrder(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["pos-orders"] });
    },
  });
}

/** Mark a pending order as paid (cashier-only; shift must be active). */
export function usePayPosOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: PayOrderInput }) =>
      payPosOrder(id, data),
    onSuccess: (_result, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ["pos-orders"] });
      void queryClient.invalidateQueries({ queryKey: posOrderQueryKey(id) });
    },
  });
}

/** Cancel a pending order (cashier-only; no shift guard). */
export function useCancelPosOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelPosOrder(id),
    onSuccess: (_result, id) => {
      void queryClient.invalidateQueries({ queryKey: ["pos-orders"] });
      void queryClient.invalidateQueries({ queryKey: posOrderQueryKey(id) });
    },
  });
}

/** Void a paid order (admin/manager only; reason required). */
export function useVoidPosOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: VoidOrderInput }) =>
      voidPosOrder(id, data),
    onSuccess: (_result, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ["pos-orders"] });
      void queryClient.invalidateQueries({ queryKey: posOrderQueryKey(id) });
      void queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    },
  });
}
