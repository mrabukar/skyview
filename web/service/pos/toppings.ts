import { apiFetch } from "@/service/client";
import type {
  Topping,
  ToppingQuery,
  CreateToppingInput,
  UpdateToppingInput,
} from "@/types/pos/menu";

function toQs(params: ToppingQuery): string {
  const s = new URLSearchParams();
  if (params.isActive !== undefined) s.set("isActive", String(params.isActive));
  if (params.search) s.set("search", params.search);
  const qs = s.toString();
  return qs ? `?${qs}` : "";
}

export function getToppings(params: ToppingQuery = {}): Promise<Topping[]> {
  return apiFetch<Topping[]>(`/api/toppings${toQs(params)}`);
}

export function getTopping(id: string): Promise<Topping> {
  return apiFetch<Topping>(`/api/toppings/${id}`);
}

export function createTopping(data: CreateToppingInput): Promise<Topping> {
  return apiFetch<Topping>("/api/toppings", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateTopping(
  id: string,
  data: UpdateToppingInput,
): Promise<Topping> {
  return apiFetch<Topping>(`/api/toppings/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

/**
 * Admin-only: hard-deletes when never used in orders; deactivates otherwise.
 * The caller should inspect `action` to decide what toast to show.
 */
export function deleteTopping(
  id: string,
): Promise<{ id: string; action: "deleted" | "deactivated" }> {
  return apiFetch<{ id: string; action: "deleted" | "deactivated" }>(
    `/api/toppings/${id}`,
    { method: "DELETE" },
  );
}
