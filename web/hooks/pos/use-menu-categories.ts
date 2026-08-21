"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getMenuCategories,
  createMenuCategory,
  updateMenuCategory,
  deleteMenuCategory,
} from "@/service/pos/menu-categories";
import type {
  MenuCategoryQuery,
  CreateMenuCategoryInput,
  UpdateMenuCategoryInput,
} from "@/types/pos/menu";

export const menuCategoriesQueryKey = (params: MenuCategoryQuery = {}) =>
  ["menu-categories", params] as const;

export function useMenuCategories(params: MenuCategoryQuery = {}) {
  return useQuery({
    queryKey: menuCategoriesQueryKey(params),
    queryFn: () => getMenuCategories(params),
  });
}

export function useCreateMenuCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateMenuCategoryInput) => createMenuCategory(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["menu-categories"] });
      void queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    },
  });
}

export function useUpdateMenuCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMenuCategoryInput }) =>
      updateMenuCategory(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["menu-categories"] });
      void queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    },
  });
}

export function useDeleteMenuCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteMenuCategory(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["menu-categories"] });
      void queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    },
  });
}
