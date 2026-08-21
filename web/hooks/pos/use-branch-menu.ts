"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getBranchMenu,
  updateBranchMenuItem,
  bulkEnableMenuItems,
  updateBranchTopping,
} from "@/service/pos/branch-menu";
import type {
  UpdateBranchMenuItemInput,
  UpdateBranchToppingInput,
  BulkEnableMenuItemsInput,
} from "@/types/pos/branch-menu";

export const branchMenuQueryKey = (branchId: string) =>
  ["branch-menu", branchId] as const;

export function useBranchMenu(branchId: string) {
  return useQuery({
    queryKey: branchMenuQueryKey(branchId),
    queryFn: () => getBranchMenu(branchId),
    enabled: Boolean(branchId),
  });
}

export function useUpdateBranchMenuItem(branchId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      menuItemId,
      data,
    }: {
      menuItemId: string;
      data: UpdateBranchMenuItemInput;
    }) => updateBranchMenuItem(branchId, menuItemId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: branchMenuQueryKey(branchId),
      });
      void queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    },
  });
}

export function useBulkEnableMenuItems(branchId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: BulkEnableMenuItemsInput) =>
      bulkEnableMenuItems(branchId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: branchMenuQueryKey(branchId),
      });
      void queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    },
  });
}

export function useUpdateBranchTopping(branchId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      toppingId,
      data,
    }: {
      toppingId: string;
      data: UpdateBranchToppingInput;
    }) => updateBranchTopping(branchId, toppingId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: branchMenuQueryKey(branchId),
      });
      void queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    },
  });
}
