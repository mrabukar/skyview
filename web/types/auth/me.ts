export type ApiRole = "super_admin" | "admin" | "branch_manager" | "cashier";

export interface MeBranch {
  id: string;
  name: string;
  address: string;
  isActive: boolean;
}

export interface MeOrganization {
  id: string;
  name: string;
  hasStores: boolean;
  logoKey?: string | null;
  logoUpdatedAt?: string | null;
}

export interface ApiUser {
  id: string;
  email: string;
  name: string;
  role: ApiRole;
  branchId: string | null;
  organizationId?: string | null;
  isActive: boolean;
  phone?: string | null;
  /** Page keys hidden from this branch manager (empty/absent = all visible). */
  disabledPages?: string[] | null;
  branch?: MeBranch | null;
  branchIds?: string[];
  branches?: MeBranch[];
  organization?: MeOrganization | null;
  // Cashier-only fields — present only when role = cashier.
  shiftDays?: string[] | null;
  shiftStartTime?: string | null;
  shiftEndTime?: string | null;
  maxDiscountPercent?: number | null;
  /** Real-time shift status computed server-side (present only for cashiers). */
  onShift?: boolean | null;
}

export interface MeResponse {
  user: ApiUser;
}
