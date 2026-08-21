export type Role = "super_admin" | "admin" | "manager" | "cashier";

export function appRoleLabel(role: Role | undefined): string {
  if (role === "super_admin") return "Super Admin";
  if (role === "admin") return "Administrator";
  if (role === "cashier") return "Cashier";
  return "Branch Manager";
}

export interface Toast {
  id: number;
  kind?: "success" | "error";
  /** Shown as the toast message body. */
  title: string;
  sub?: string;
  createdAt: string;
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  /** Page keys hidden from this branch manager (empty = all visible). */
  disabledPages: string[];
  storeId: string | null;
  store: string | null;
  /** All assigned branch ids (managers); primary is storeId / first. */
  storeIds: string[];
  stores: { id: string; name: string }[];
  organizationId: string | null;
  organizationName: string | null;
  hasStores: boolean | null;
  organizationLogoKey: string | null;
  organizationLogoUpdatedAt: string | null;
  // Cashier-only fields — null/undefined for non-cashier roles.
  shiftDays: string[] | null;
  shiftStartTime: string | null;
  shiftEndTime: string | null;
  maxDiscountPercent: number | null;
  /** Real-time shift status as of last session fetch. Null for non-cashiers. */
  onShift: boolean | null;
}
