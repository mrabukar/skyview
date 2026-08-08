import { apiFetch } from "@/service/client";
import type { CreateUserInput, User } from "@/types/users/user";

/**
 * Creates a user through the real Users endpoint (admin-only). The client
 * bridge maps `storeId` → `branchId` on the way out and `branch` → `store`
 * on the way back, so salary, branch, and role all persist correctly.
 * `organizationId` is derived server-side from the admin's session.
 */
export function createUser(
  input: CreateUserInput,
  _organizationId?: string | null,
): Promise<User> {
  return apiFetch<User>("/api/users", {
    method: "POST",
    body: JSON.stringify({
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      password: input.password,
      role: input.role,
      ...(input.role === "branch_manager" && input.storeId
        ? { storeId: input.storeId }
        : {}),
      ...(input.phone?.trim() ? { phone: input.phone.trim() } : {}),
      ...(input.salary != null ? { salary: input.salary } : {}),
      ...(input.role === "branch_manager" && input.disabledPages
        ? { disabledPages: input.disabledPages }
        : {}),
    }),
  });
}
