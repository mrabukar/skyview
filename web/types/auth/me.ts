export type ApiRole = "super_admin" | "admin" | "branch_manager";

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
  branch?: MeBranch | null;
  organization?: MeOrganization | null;
}

export interface MeResponse {
  user: ApiUser;
}
