import type { AppUser, Role } from "@/lib/types";
import type { ApiUser } from "@/types/auth/me";

export function mapApiUserToAppUser(apiUser: ApiUser): AppUser {
  const role: Role =
    apiUser.role === "branch_manager"
      ? "manager"
      : apiUser.role === "super_admin"
        ? "super_admin"
        : "admin";

  return {
    id: apiUser.id,
    name: apiUser.name,
    email: apiUser.email,
    phone: apiUser.phone ?? null,
    role,
    disabledPages: apiUser.disabledPages ?? [],
    // AppUser keeps `storeId`/`store` as its internal field names; the API
    // now speaks `branchId`/`branch`, so we bridge here.
    storeId: apiUser.branchId,
    store: apiUser.branch?.name ?? null,
    storeIds: apiUser.branchIds ?? (apiUser.branchId ? [apiUser.branchId] : []),
    stores: (apiUser.branches ?? (apiUser.branch ? [apiUser.branch] : [])).map(
      (b) => ({ id: b.id, name: b.name }),
    ),
    organizationId: apiUser.organization?.id ?? apiUser.organizationId ?? null,
    organizationName: apiUser.organization?.name ?? null,
    hasStores: apiUser.organization?.hasStores ?? null,
    organizationLogoKey: apiUser.organization?.logoKey ?? null,
    organizationLogoUpdatedAt: apiUser.organization?.logoUpdatedAt ?? null,
  };
}
