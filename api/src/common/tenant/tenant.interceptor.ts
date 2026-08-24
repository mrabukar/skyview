import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { Observable, from, switchMap } from "rxjs";
import { BranchAccessService } from "../branch-access/branch-access.service";
import type { CurrentUserPayload } from "../decorators/current-user.decorator";
import { TenantContextService } from "./tenant-context.service";

interface SessionRequest {
  user?: CurrentUserPayload | null;
  session?: { user?: CurrentUserPayload & Record<string, unknown> };
}

function resolveOrganizationId(
  request: SessionRequest,
): string | null | undefined {
  const user = request.user ?? request.session?.user;
  if (!user) {
    return undefined;
  }

  const role = user.role as UserRole | undefined;
  if (role === UserRole.super_admin) {
    return null;
  }

  const organizationId = user.organizationId;
  if (typeof organizationId === "string" && organizationId.trim()) {
    return organizationId.trim();
  }

  if (role === UserRole.admin || role === UserRole.branch_manager) {
    throw new ForbiddenException("Organization context is required");
  }

  return undefined;
}

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly branchAccess: BranchAccessService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<SessionRequest>();
    const organizationId = resolveOrganizationId(request);

    if (organizationId !== undefined) {
      // enterWith so the rest of the request (including async handlers) sees the org.
      this.tenantContext.set(organizationId);
    }

    return from(this.enrichBranchIds(request)).pipe(
      switchMap(() => next.handle()),
    );
  }

  private async enrichBranchIds(request: SessionRequest): Promise<void> {
    const user = request.user ?? request.session?.user;
    if (!user?.id) return;

    const role = user.role as UserRole;
    const primary =
      typeof user.branchId === "string" ? user.branchId : null;

    // Reuse branchIds already on the session/me payload when present.
    let branchIds = Array.isArray(user.branchIds) ? user.branchIds : undefined;
    if (branchIds === undefined && role === UserRole.branch_manager) {
      branchIds = await this.branchAccess.getBranchIds(
        user.id,
        role,
        primary,
      );
    } else if (branchIds === undefined) {
      branchIds = [];
    }

    const enriched = { ...user, branchIds } as CurrentUserPayload;
    if (request.user) {
      request.user = enriched;
    }
    if (request.session?.user) {
      request.session.user = enriched;
    }
  }
}
