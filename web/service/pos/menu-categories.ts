import { apiFetch } from "@/service/client";
import type {
  MenuCategory,
  MenuCategoryQuery,
  CreateMenuCategoryInput,
  UpdateMenuCategoryInput,
} from "@/types/pos/menu";

function toQs(params: MenuCategoryQuery): string {
  const s = new URLSearchParams();
  if (params.isActive !== undefined) s.set("isActive", String(params.isActive));
  const qs = s.toString();
  return qs ? `?${qs}` : "";
}

export function getMenuCategories(
  params: MenuCategoryQuery = {},
): Promise<MenuCategory[]> {
  return apiFetch<MenuCategory[]>(`/api/menu-categories${toQs(params)}`);
}

export function getMenuCategory(id: string): Promise<MenuCategory> {
  return apiFetch<MenuCategory>(`/api/menu-categories/${id}`);
}

export function createMenuCategory(
  data: CreateMenuCategoryInput,
): Promise<MenuCategory> {
  return apiFetch<MenuCategory>("/api/menu-categories", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateMenuCategory(
  id: string,
  data: UpdateMenuCategoryInput,
): Promise<MenuCategory> {
  return apiFetch<MenuCategory>(`/api/menu-categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteMenuCategory(id: string): Promise<void> {
  return apiFetch<void>(`/api/menu-categories/${id}`, { method: "DELETE" });
}
