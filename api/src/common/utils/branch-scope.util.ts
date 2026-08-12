import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import type { CurrentUserPayload } from "../decorators/current-user.decorator";

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

/** Read filter — manager: `{ in: branchIds }` (optionally intersected); admin: optional id. */
export function resolveBranchFilter(
  user: CurrentUserPayload,
  queryBranchId?: string,
): BranchIdFilter | undefined {
  if (user.role === UserRole.branch_manager) {
    const ids = assertManagerHasBranches(user);
    const trimmed =
      typeof queryBranchId === "string" ? queryBranchId.trim() : "";
    if (trimmed) {
      if (!ids.includes(trimmed)) {
        throw new ForbiddenException("You can only access your assigned branches");
      }
      return trimmed;
    }
    return ids.length === 1 ? ids[0]! : { in: ids };
  }
  const trimmed =
    typeof queryBranchId === "string" ? queryBranchId.trim() : undefined;
  return trimmed || undefined;
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

/** Ensures a manager may only touch an assigned branch's record. Admins pass. */
export function assertBranchAccess(
  branchId: string,
  user: CurrentUserPayload,
): void {
  if (isAdminLike(user)) {
    return;
  }
  const ids = assertManagerHasBranches(user);
  if (!ids.includes(branchId)) {
    throw new ForbiddenException("You can only access your assigned branches");
  }
}

export function isManager(user: CurrentUserPayload): boolean {
  return user.role === UserRole.branch_manager;
}
