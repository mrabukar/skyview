import { apiFetch } from "@/service/client";
import type {
  MenuItem,
  MenuItemSize,
  MenuItemQuery,
  CreateMenuItemInput,
  UpdateMenuItemInput,
  CreateMenuItemSizeInput,
  UpdateMenuItemSizeInput,
} from "@/types/pos/menu";
import type { PaginatedResponse } from "@/types/common/pagination";

function toQs(params: MenuItemQuery): string {
  const s = new URLSearchParams();
  if (params.page) s.set("page", String(params.page));
  if (params.limit) s.set("limit", String(params.limit));
  if (params.categoryId) s.set("categoryId", params.categoryId);
  if (params.isActive !== undefined) s.set("isActive", String(params.isActive));
  if (params.search) s.set("search", params.search);
  const qs = s.toString();
  return qs ? `?${qs}` : "";
}

export function getMenuItems(
  params: MenuItemQuery = {},
): Promise<PaginatedResponse<MenuItem>> {
  return apiFetch<PaginatedResponse<MenuItem>>(
    `/api/menu-items${toQs(params)}`,
  );
}

export function getMenuItem(id: string): Promise<MenuItem> {
  return apiFetch<MenuItem>(`/api/menu-items/${id}`);
}

export function createMenuItem(data: CreateMenuItemInput): Promise<MenuItem> {
  return apiFetch<MenuItem>("/api/menu-items", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateMenuItem(
  id: string,
  data: UpdateMenuItemInput,
): Promise<MenuItem> {
  return apiFetch<MenuItem>(`/api/menu-items/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteMenuItem(id: string): Promise<void> {
  return apiFetch<void>(`/api/menu-items/${id}`, { method: "DELETE" });
}

// ── Size sub-routes ────────────────────────────────────────────────────────────

export function addMenuItemSize(
  itemId: string,
  data: CreateMenuItemSizeInput,
): Promise<MenuItemSize> {
  return apiFetch<MenuItemSize>(`/api/menu-items/${itemId}/sizes`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateMenuItemSize(
  itemId: string,
  sizeId: string,
  data: UpdateMenuItemSizeInput,
): Promise<MenuItemSize> {
  return apiFetch<MenuItemSize>(`/api/menu-items/${itemId}/sizes/${sizeId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteMenuItemSize(
  itemId: string,
  sizeId: string,
): Promise<void> {
  return apiFetch<void>(`/api/menu-items/${itemId}/sizes/${sizeId}`, {
    method: "DELETE",
  });
}

// ── Image upload ──────────────────────────────────────────────────────────────

export interface UploadUrlResponse {
  key: string;
  url: string;
  expiresIn: number;
}

/** Get a pre-signed PUT URL for uploading a menu item image. */
export function getMenuItemUploadUrl(
  contentType: string,
  size: number,
): Promise<UploadUrlResponse> {
  return apiFetch<UploadUrlResponse>("/api/menu-items/upload-url", {
    method: "POST",
    body: JSON.stringify({ contentType, size }),
  });
}

/** Get a pre-signed GET URL for viewing a menu item image. */
export function getMenuItemImageUrl(
  imageKey: string,
): Promise<{ url: string }> {
  return apiFetch<{ url: string }>(
    `/api/menu-items/image-url/${encodeURIComponent(imageKey)}`,
  );
}

/**
 * Full upload flow: get presigned URL → upload to R2 → confirm dimensions → return the key.
 * The caller then passes the key via PATCH /menu-items/:id { imageKey }.
 */
export async function confirmMenuItemImage(key: string): Promise<{ key: string }> {
  return apiFetch<{ key: string }>("/api/menu-items/confirm-image", {
    method: "POST",
    body: JSON.stringify({ key }),
  });
}

export async function uploadMenuItemImage(file: File): Promise<string> {
  const { key, url } = await getMenuItemUploadUrl(file.type, file.size);

  const put = await fetch(url, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });
  if (!put.ok) {
    throw new Error("Image upload failed. Please try again.");
  }

  const confirmed = await confirmMenuItemImage(key);
  return confirmed.key;
}
