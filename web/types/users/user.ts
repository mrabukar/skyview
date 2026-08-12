import type { PaginatedResponse } from "@/types/common/pagination";
import type { Store } from "@/types/stores/store";

export type UserRole = "admin" | "branch_manager";

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
}

export const ROLE_ITEMS = [
  { value: "admin" as const, label: "Admin" },
  { value: "branch_manager" as const, label: "Branch Manager" },
];

export function roleLabel(role: UserRole | string): string {
  if (role === "admin") return "Admin";
  return "Branch Manager";
}
