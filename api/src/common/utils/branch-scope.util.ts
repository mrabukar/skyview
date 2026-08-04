import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import type { CurrentUserPayload } from "../decorators/current-user.decorator";

function isAdminLike(user: CurrentUserPayload): boolean {
  return user.role === UserRole.admin || user.role === UserRole.super_admin;
}

/** The manager's assigned branch id (throws if not a manager or unassigned). BR-1.2 */
export function assertManagerHasBranch(user: CurrentUserPayload): string {
  if (user.role !== UserRole.branch_manager) {
    throw new ForbiddenException("Only branch managers can perform this action");
  }
  if (!user.branchId) {
    throw new ForbiddenException("No branch assigned to your account");
  }
  return user.branchId;
}

/** Read filter — manager: forced to own branch; admin: optional query filter. */
export function resolveBranchFilter(
  user: CurrentUserPayload,
  queryBranchId?: string,
): string | undefined {
  if (user.role === UserRole.branch_manager) {
    return assertManagerHasBranch(user);
  }
  const trimmed =
    typeof queryBranchId === "string" ? queryBranchId.trim() : undefined;
  return trimmed || undefined;
}

/**
 * Write branch — manager: forced to own branch (any supplied id ignored);
 * admin: must supply a branch id explicitly.
 */
export function resolveWriteBranchId(
  user: CurrentUserPayload,
  dtoBranchId?: string,
): string {
  if (user.role === UserRole.branch_manager) {
    return assertManagerHasBranch(user);
  }
  const trimmed =
    typeof dtoBranchId === "string" ? dtoBranchId.trim() : undefined;
  if (!trimmed) {
    throw new BadRequestException("branchId is required");
  }
  return trimmed;
}

/** Ensures a manager may only touch their own branch's record. Admins pass. */
export function assertBranchAccess(
  branchId: string,
  user: CurrentUserPayload,
): void {
  if (isAdminLike(user)) {
    return;
  }
  const managerBranchId = assertManagerHasBranch(user);
  if (managerBranchId !== branchId) {
    throw new ForbiddenException("You can only access your own branch");
  }
}

export function isManager(user: CurrentUserPayload): boolean {
  return user.role === UserRole.branch_manager;
}
