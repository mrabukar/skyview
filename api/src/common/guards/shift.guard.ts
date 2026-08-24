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
  shiftDays?: string[];
  shiftStartTime?: string | null;
  shiftEndTime?: string | null;
}

/**
 * Blocks cashiers from POS write operations when their shift has ended
 * (or on a non-working day). BR-POS-1.5.
 *
 * Non-cashier roles always pass. The guard must run after the auth guard so
 * that `request.user` is already populated.
 *
 * Prefer shift fields from the session/me payload; fall back to a DB read
 * only when they are missing.
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

    let shiftDays = user.shiftDays;
    let shiftStartTime = user.shiftStartTime;
    let shiftEndTime = user.shiftEndTime;

    if (!Array.isArray(shiftDays) || shiftStartTime == null || shiftEndTime == null) {
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

      shiftDays = dbUser.shiftDays;
      shiftStartTime = dbUser.shiftStartTime;
      shiftEndTime = dbUser.shiftEndTime;
      user.shiftDays = shiftDays;
      user.shiftStartTime = shiftStartTime;
      user.shiftEndTime = shiftEndTime;
    }

    const status = isOnShift(shiftDays, shiftStartTime, shiftEndTime);

    if (!status.onShift) {
      throw new ForbiddenException(status.message ?? "Your shift has ended");
    }

    return true;
  }
}
