import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { isOnShift } from "../utils/shift.util";

interface RequestUser {
  id: string;
  role: UserRole;
}

/**
 * Blocks cashiers from POS write operations when their shift has ended
 * (or on a non-working day). BR-POS-1.5.
 *
 * Non-cashier roles always pass. The guard must run after the auth guard so
 * that `request.user` is already populated.
 *
 * Apply with the `@ShiftGuarded()` decorator rather than directly with
 * `@UseGuards(ShiftGuard)` so the intent is explicit at the route level.
 */
@Injectable()
export class ShiftGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<{
      user?: RequestUser;
      session?: { user?: RequestUser };
    }>();
    const user = req.user ?? req.session?.user;

    // Guard only applies to cashiers — other roles are never shift-restricted.
    if (!user || user.role !== UserRole.cashier) {
      return true;
    }

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: {
        shiftDays: true,
        shiftStartTime: true,
        shiftEndTime: true,
      },
    });

    if (!dbUser) {
      throw new ForbiddenException("User not found");
    }

    const status = isOnShift(
      dbUser.shiftDays,
      dbUser.shiftStartTime,
      dbUser.shiftEndTime,
    );

    if (!status.onShift) {
      throw new ForbiddenException(status.message ?? "Your shift has ended");
    }

    return true;
  }
}
