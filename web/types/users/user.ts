import type { PaginatedResponse } from "@/types/common/pagination";
import type { Store } from "@/types/stores/store";

export type UserRole = "admin" | "branch_manager" | "cashier";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string | null;
  /** Monthly salary in KSh — used by the payroll run. */
  salary: number;
  isActive: boolean;
  storeId: string | null;
  store: Pick<Store, "id" | "name"> | null;
  /** All assigned branch ids (managers); primary is first / storeId. */
  storeIds: string[];
  stores: Pick<Store, "id" | "name">[];
  /** Page keys hidden from this branch manager (empty = all visible). */
  disabledPages: string[];
  // Cashier shift fields — null for non-cashier roles.
  shiftDays: string[] | null;
  shiftStartTime: string | null;
  shiftEndTime: string | null;
  maxDiscountPercent: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserListQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
  isActive?: boolean;
}

export type UserListResponse = PaginatedResponse<User>;

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  storeId?: string;
  storeIds?: string[];
  phone?: string;
  salary?: number;
  disabledPages?: string[];
  // Cashier-only fields.
  shiftDays?: string[];
  shiftStartTime?: string;
  shiftEndTime?: string;
  maxDiscountPercent?: number;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  storeId?: string | null;
  storeIds?: string[];
  phone?: string | null;
  salary?: number;
  disabledPages?: string[];
  // Cashier-only fields.
  shiftDays?: string[];
  shiftStartTime?: string | null;
  shiftEndTime?: string | null;
  maxDiscountPercent?: number | null;
}

export const ROLE_ITEMS = [
  { value: "admin" as const, label: "Admin" },
  { value: "branch_manager" as const, label: "Branch Manager" },
  { value: "cashier" as const, label: "Cashier" },
];

export function roleLabel(role: UserRole | string): string {
  if (role === "admin") return "Admin";
  if (role === "cashier") return "Cashier";
  return "Branch Manager";
}
