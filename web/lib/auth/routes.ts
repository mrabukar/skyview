/** Routes that require an authenticated session (under app/(app)). */
import type { Role } from "@/lib/types";

export const PROTECTED_ROUTE_PREFIXES = [
  "/dashboard",
  "/sales",
  "/purchases",
  "/expenses",
  "/receipts",
  "/vendor-spend",
  "/payroll",
  "/financial",
  "/branches",
  "/users",
  "/audit",
  "/pos",
  "/menu",
  "/settings/organization",
  "/settings/profile",
  "/settings/password",
] as const;

export const SUPER_ADMIN_ROUTE_PREFIXES = ["/super-admin"] as const;

/** Account settings — all authenticated roles including super_admin. */
export const ACCOUNT_SETTINGS_ROUTE_PREFIXES = [
  "/settings/profile",
  "/settings/password",
] as const;

/** Admin-only routes — branch managers and cashiers must not access these. */
export const ADMIN_ONLY_ROUTE_PREFIXES = [
  "/payroll",
  "/financial",
  "/branches",
  "/users",
  "/audit",
  "/settings/organization",
] as const;

/** Manager-only routes — admins must not access these (unless hasStores is false). */
export const MANAGER_ONLY_ROUTE_PREFIXES = [] as const;

/**
 * Routes accessible to cashiers. Cashiers are locked to POS, customer menu,
 * and account settings; all other protected routes are denied.
 */
export const CASHIER_ALLOWED_ROUTE_PREFIXES = [
  "/pos",
  "/menu/print",
  "/settings/profile",
  "/settings/password",
] as const;

export const PUBLIC_ROUTE_PREFIXES = ["/login"] as const;

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isAccountSettingsPath(pathname: string): boolean {
  return ACCOUNT_SETTINGS_ROUTE_PREFIXES.some((prefix) =>
    matchesPrefix(pathname, prefix),
  );
}

export function isSuperAdminPath(pathname: string): boolean {
  return SUPER_ADMIN_ROUTE_PREFIXES.some((prefix) =>
    matchesPrefix(pathname, prefix),
  );
}

export function isProtectedPath(pathname: string): boolean {
  return (
    PROTECTED_ROUTE_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix)) ||
    isSuperAdminPath(pathname)
  );
}

export function isAdminOnlyPath(pathname: string): boolean {
  return ADMIN_ONLY_ROUTE_PREFIXES.some((prefix) =>
    matchesPrefix(pathname, prefix),
  );
}

export function isManagerOnlyPath(pathname: string): boolean {
  return MANAGER_ONLY_ROUTE_PREFIXES.some((prefix) =>
    matchesPrefix(pathname, prefix),
  );
}

export function isCashierAllowedPath(pathname: string): boolean {
  return CASHIER_ALLOWED_ROUTE_PREFIXES.some((prefix) =>
    matchesPrefix(pathname, prefix),
  );
}

export function isRouteAllowedForRole(
  role: Role,
  pathname: string,
  options?: { hasStores?: boolean | null },
): boolean {
  if (role === "super_admin") {
    return isSuperAdminPath(pathname) || isAccountSettingsPath(pathname);
  }

  if (isSuperAdminPath(pathname)) {
    return false;
  }

  // Cashiers may only access POS routes and account settings.
  if (role === "cashier") {
    return isCashierAllowedPath(pathname);
  }

  if (role === "admin" && isManagerOnlyPath(pathname)) {
    if (pathname === "/submit-sale" && options?.hasStores === false) {
      return true;
    }
    return false;
  }

  if (role === "manager" && isAdminOnlyPath(pathname)) {
    return false;
  }

  return true;
}

export function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_ROUTE_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix));
}
