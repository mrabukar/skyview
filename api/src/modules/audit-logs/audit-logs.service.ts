import { Injectable } from "@nestjs/common";
import { AuditAction, Prisma } from "@prisma/client";
import {
  parseTimestampRangeEnd,
  parseTimestampRangeStart,
} from "../../common/utils/app-timezone.util";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditLogQueryDto } from "./dto/audit-log-query.dto";

const auditInclude = {
  user: { select: { id: true, name: true, email: true, role: true } },
} satisfies Prisma.AuditLogInclude;

export type AuditLogWithUser = Prisma.AuditLogGetPayload<{
  include: typeof auditInclude;
}>;

export interface PaginatedResult<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

function isAuditAction(value: string): value is AuditAction {
  return (Object.values(AuditAction) as string[]).includes(value);
}

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: AuditLogQueryDto,
  ): Promise<PaginatedResult<AuditLogWithUser>> {
    const skip = (query.page - 1) * query.limit;
    const search = typeof query.search === "string" ? query.search.trim() : "";
    const createdAt = this.buildTimestampRange(query.fromDate, query.toDate);

    const where: Prisma.AuditLogWhereInput = {
      ...(query.action && isAuditAction(query.action)
        ? { action: query.action }
        : undefined),
      ...(query.userId ? { userId: query.userId } : undefined),
      ...(query.branchId ? { branchId: query.branchId } : undefined),
      ...(createdAt ? { createdAt } : undefined),
      ...(search
        ? {
            OR: [
              { entityType: { contains: search, mode: "insensitive" } },
              { entityId: { contains: search, mode: "insensitive" } },
              { user: { name: { contains: search, mode: "insensitive" } } },
            ],
          }
        : undefined),
    };

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { createdAt: "desc" },
        include: auditInclude,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  private buildTimestampRange(
    fromDate?: string,
    toDate?: string,
  ): Prisma.DateTimeFilter | undefined {
    const from = typeof fromDate === "string" ? fromDate.trim() : "";
    const to = typeof toDate === "string" ? toDate.trim() : "";
    if (!from && !to) return undefined;
    const range: Prisma.DateTimeFilter = {};
    if (from) range.gte = parseTimestampRangeStart(from);
    if (to) range.lte = parseTimestampRangeEnd(to);
    return range;
  }
}
