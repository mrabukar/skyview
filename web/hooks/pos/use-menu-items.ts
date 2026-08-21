"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getMenuItems,
  getMenuItem,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  addMenuItemSize,
  updateMenuItemSize,
  deleteMenuItemSize,
} from "@/service/pos/menu-items";
import type {
  MenuItemQuery,
  CreateMenuItemInput,
  UpdateMenuItemInput,
  CreateMenuItemSizeInput,
  UpdateMenuItemSizeInput,
} from "@/types/pos/menu";

export const menuItemsQueryKey = (params: MenuItemQuery = {}) =>
  ["menu-items", params] as const;

export const menuItemQueryKey = (id: string) =>
  ["menu-items", id] as const;

export function useMenuItems(params: MenuItemQuery = {}) {
  return useQuery({
    queryKey: menuItemsQueryKey(params),
    queryFn: () => getMenuItems(params),
  });
}

export function useMenuItem(id: string) {
  return useQuery({
    queryKey: menuItemQueryKey(id),
    queryFn: () => getMenuItem(id),
    enabled: Boolean(id),
  });
}

export function useCreateMenuItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateMenuItemInput) => createMenuItem(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["menu-items"] });
      void queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    },
  });
}

export function useUpdateMenuItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMenuItemInput }) =>
      updateMenuItem(id, data),
    onSuccess: (_result, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ["menu-items"] });
      void queryClient.invalidateQueries({ queryKey: menuItemQueryKey(id) });
      void queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    },
  });
}

export function useDeleteMenuItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteMenuItem(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["menu-items"] });
      void queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    },
  });
}

// ── Size mutations ─────────────────────────────────────────────────────────────

export function useAddMenuItemSize() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      itemId,
      data,
    }: {
      itemId: string;
      data: CreateMenuItemSizeInput;
    }) => addMenuItemSize(itemId, data),
    onSuccess: (_result, { itemId }) => {
      void queryClient.invalidateQueries({ queryKey: menuItemQueryKey(itemId) });
      void queryClient.invalidateQueries({ queryKey: ["menu-items"] });
    },
  });
}

export function useUpdateMenuItemSize() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      itemId,
      sizeId,
      data,
    }: {
      itemId: string;
      sizeId: string;
      data: UpdateMenuItemSizeInput;
    }) => updateMenuItemSize(itemId, sizeId, data),
    onSuccess: (_result, { itemId }) => {
      void queryClient.invalidateQueries({ queryKey: menuItemQueryKey(itemId) });
      void queryClient.invalidateQueries({ queryKey: ["menu-items"] });
    },
  });
}

export function useDeleteMenuItemSize() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, sizeId }: { itemId: string; sizeId: string }) =>
      deleteMenuItemSize(itemId, sizeId),
    onSuccess: (_result, { itemId }) => {
      void queryClient.invalidateQueries({ queryKey: menuItemQueryKey(itemId) });
      void queryClient.invalidateQueries({ queryKey: ["menu-items"] });
    },
  });
}
