import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import type { CurrentUserPayload } from "../decorators/current-user.decorator";
import { parseIdList } from "./parse-id-list.util";

/** Prisma `where.branchId` filter — string equality or `{ in: [...] }`. */
export type BranchIdFilter = string | { in: string[] };

function isAdminLike(user: CurrentUserPayload): boolean {
  return user.role === UserRole.admin || user.role === UserRole.super_admin;
}

function managerBranchIds(user: CurrentUserPayload): string[] {
  const fromPayload = Array.isArray(user.branchIds) ? user.branchIds : [];
  if (fromPayload.length > 0) return fromPayload;
  // Fallback if enrichment did not run (should be rare).
  return user.branchId ? [user.branchId] : [];
}

/**
 * Branch IDs for any role that has a fixed set of branches: branch_manager or cashier.
 * Cashiers always have exactly one branch (enforced at creation time).
 */
function assignedBranchIds(user: CurrentUserPayload): string[] {
  if (user.role === UserRole.branch_manager) return managerBranchIds(user);
  if (user.role === UserRole.cashier) return user.branchId ? [user.branchId] : [];
  return [];
}

/** The manager's assigned branch set (throws if not a manager or unassigned). */
export function assertManagerHasBranches(user: CurrentUserPayload): string[] {
  if (user.role !== UserRole.branch_manager) {
    throw new ForbiddenException("Only branch managers can perform this action");
  }
  const ids = managerBranchIds(user);
  if (ids.length === 0) {
    throw new ForbiddenException("No branch assigned to your account");
  }
  return ids;
}

/**
 * Returns primary or sole branch id for callers that still need a single string
 * (e.g. expenses write when manager has exactly one branch).
 */
export function assertManagerHasBranch(user: CurrentUserPayload): string {
  const ids = assertManagerHasBranches(user);
  if (user.branchId && ids.includes(user.branchId)) {
    return user.branchId;
  }
  return ids[0]!;
}

/**
 * Read filter. `queryBranchId` may be one id or several comma-separated ids.
 * Manager: defaults to `{ in: branchIds }`; an explicit list is intersected
 * with (and must be a subset of) their assigned branches. Admin: optional
 * id(s), unrestricted.
 */
export function resolveBranchFilter(
  user: CurrentUserPayload,
  queryBranchId?: string,
): BranchIdFilter | undefined {
  const requested = parseIdList(queryBranchId);
  if (user.role === UserRole.branch_manager) {
    const ids = assertManagerHasBranches(user);
    if (requested.length > 0) {
      if (requested.some((id) => !ids.includes(id))) {
        throw new ForbiddenException("You can only access your assigned branches");
      }
      return requested.length === 1 ? requested[0]! : { in: requested };
    }
    return ids.length === 1 ? ids[0]! : { in: ids };
  }
  if (requested.length === 0) return undefined;
  return requested.length === 1 ? requested[0]! : { in: requested };
}

/**
 * Write branch — manager with 1: forced; manager with >1: require dto ∈ set;
 * admin: must supply a branch id explicitly.
 */
export function resolveWriteBranchId(
  user: CurrentUserPayload,
  dtoBranchId?: string,
): string {
  if (user.role === UserRole.branch_manager) {
    const ids = assertManagerHasBranches(user);
    if (ids.length === 1) {
      return ids[0]!;
    }
    const trimmed =
      typeof dtoBranchId === "string" ? dtoBranchId.trim() : undefined;
    if (!trimmed) {
      throw new BadRequestException(
        "branchId is required when you manage more than one branch",
      );
    }
    if (!ids.includes(trimmed)) {
      throw new ForbiddenException("You can only write to your assigned branches");
    }
    return trimmed;
  }
  const trimmed =
    typeof dtoBranchId === "string" ? dtoBranchId.trim() : undefined;
  if (!trimmed) {
    throw new BadRequestException("branchId is required");
  }
  return trimmed;
}

/**
 * Ensures the caller may only touch the given branch. Admins always pass.
 * Branch managers must have the branch in their assignment set.
 * Cashiers must have the branch set as their single assigned branch.
 */
export function assertBranchAccess(
  branchId: string,
  user: CurrentUserPayload,
): void {
  if (isAdminLike(user)) return;

  const ids = assignedBranchIds(user);
  if (ids.length === 0) {
    throw new ForbiddenException("No branch assigned to your account");
  }
  if (!ids.includes(branchId)) {
    throw new ForbiddenException("You can only access your assigned branches");
  }
}

export function isManager(user: CurrentUserPayload): boolean {
  return user.role === UserRole.branch_manager;
}
