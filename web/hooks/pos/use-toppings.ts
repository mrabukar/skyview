"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getToppings,
  createTopping,
  updateTopping,
  deleteTopping,
} from "@/service/pos/toppings";
import type {
  ToppingQuery,
  CreateToppingInput,
  UpdateToppingInput,
} from "@/types/pos/menu";

export const toppingsQueryKey = (params: ToppingQuery = {}) =>
  ["toppings", params] as const;

export function useToppings(params: ToppingQuery = {}) {
  return useQuery({
    queryKey: toppingsQueryKey(params),
    queryFn: () => getToppings(params),
  });
}

export function useCreateTopping() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateToppingInput) => createTopping(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["toppings"] });
      void queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    },
  });
}

export function useUpdateTopping() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateToppingInput }) =>
      updateTopping(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["toppings"] });
      void queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    },
  });
}

export function useDeleteTopping() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTopping(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["toppings"] });
      void queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    },
  });
}
