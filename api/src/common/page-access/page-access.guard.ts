import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserRole } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { PAGE_KEY } from "./page.decorator";
import type { PageKey } from "./pages";

interface RequestUser {
  id: string;
  role: UserRole;
}

/**
 * Blocks a branch_manager from any page whose key is in their `disabledPages`.
 * Admins/super-admins are unrestricted. Runs after the auth guard, so
 * `request.user` is already populated. No-op on routes without `@Page(...)`.
 */
@Injectable()
export class PageAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const pageKey = this.reflector.getAllAndOverride<PageKey | undefined>(
      PAGE_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );
    if (!pageKey) {
      return true;
    }

    const req = ctx.switchToHttp().getRequest<{
      user?: RequestUser;
      session?: { user?: RequestUser };
    }>();
    const user = req.user ?? req.session?.user;
    if (!user) {
      return true; // auth guard owns unauthenticated rejection
    }
    if (user.role !== UserRole.branch_manager) {
      return true; // admins/super-admins are never page-restricted
    }

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { disabledPages: true },
    });
    if (dbUser?.disabledPages?.includes(pageKey)) {
      throw new ForbiddenException(
        `The ${pageKey} page is disabled for your account. Contact your administrator.`,
      );
    }
    return true;
  }
}
