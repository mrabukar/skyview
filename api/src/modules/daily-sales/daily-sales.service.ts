import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { CurrentUserPayload } from "../../common/decorators/current-user.decorator";
import {
  calendarDateToDbDate,
  compareCalendarDates,
  extractCalendarDate,
  parseDateColumnRangeEnd,
  parseDateColumnRangeStart,
  todayCalendarDate,
} from "../../common/utils/app-timezone.util";
import {
  assertBranchAccess,
  isManager,
  resolveBranchFilter,
  resolveWriteBranchId,
} from "../../common/utils/branch-scope.util";
import { requireOrganizationId } from "../../common/utils/require-organization-id.util";
import { withOrganizationId } from "../../common/utils/with-organization-id.util";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateDailySaleDto } from "./dto/create-daily-sale.dto";
import { DailySaleQueryDto } from "./dto/daily-sale-query.dto";
import { UpdateDailySaleDto } from "./dto/update-daily-sale.dto";

const dailySaleInclude = {
  branch: { select: { id: true, name: true } },
  enteredBy: { select: { id: true, name: true, email: true } },
} satisfies Prisma.DailySaleInclude;

export type DailySaleWithDetails = Prisma.DailySaleGetPayload<{
  include: typeof dailySaleInclude;
}>;

export interface PaginatedResult<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

@Injectable()
export class DailySalesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: DailySaleQueryDto,
    user: CurrentUserPayload,
  ): Promise<PaginatedResult<DailySaleWithDetails>> {
    const skip = (query.page - 1) * query.limit;
    const branchId = resolveBranchFilter(user, query.branchId);
    const saleDateRange = this.buildDateRange(query.fromDate, query.toDate);

    const where: Prisma.DailySaleWhereInput = {
      ...(branchId ? { branchId } : undefined),
      ...(saleDateRange ? { saleDate: saleDateRange } : undefined),
    };

    const [data, total] = await Promise.all([
      this.prisma.dailySale.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: [{ saleDate: "desc" }, { createdAt: "desc" }],
        include: dailySaleInclude,
      }),
      this.prisma.dailySale.count({ where }),
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

  async findOne(
    id: string,
    user: CurrentUserPayload,
  ): Promise<DailySaleWithDetails> {
    const sale = await this.prisma.dailySale.findUnique({
      where: { id },
      include: dailySaleInclude,
    });

    if (!sale) {
      throw new NotFoundException(`Sales entry with id "${id}" not found`);
    }

    assertBranchAccess(sale.branchId, user);
    return sale;
  }

  async create(
    dto: CreateDailySaleDto,
    user: CurrentUserPayload,
  ): Promise<DailySaleWithDetails> {
    const organizationId = requireOrganizationId(user);
    const branchId = resolveWriteBranchId(user, dto.branchId);
    await this.getActiveBranch(branchId);

    const saleDate = extractCalendarDate(dto.saleDate);
    this.assertNotFuture(saleDate);

    const saleId = await this.prisma.$transaction(async (tx) => {
      const sale = await tx.dailySale.create({
        data: withOrganizationId(
          {
            branchId,
            saleDate: calendarDateToDbDate(saleDate),
            totalAmount: dto.totalAmount,
            note: dto.note ?? null,
            enteredById: user.id,
          },
          organizationId,
        ),
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          organizationId,
          action: "DAILY_SALE_CREATED",
          entityType: "daily_sale",
          entityId: sale.id,
          branchId,
          oldValue: Prisma.JsonNull,
          newValue: this.toAuditSnapshot(sale),
        },
      });

      return sale.id;
    });

    return this.findOne(saleId, user);
  }

  async update(
    id: string,
    dto: UpdateDailySaleDto,
    user: CurrentUserPayload,
  ): Promise<DailySaleWithDetails> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException("At least one field must be provided");
    }

    const existing = await this.findOne(id, user);

    // BR-2.5 — managers may only edit the same-day entry.
    if (isManager(user)) {
      const existingDate = this.toCalendar(existing.saleDate);
      if (existingDate !== todayCalendarDate()) {
        throw new ForbiddenException(
          "Managers can only edit today's entry. Ask an admin to correct older entries.",
        );
      }
    }

    let nextSaleDate: string | undefined;
    if (dto.saleDate !== undefined) {
      nextSaleDate = extractCalendarDate(dto.saleDate);
      this.assertNotFuture(nextSaleDate);
    }

    const organizationId = requireOrganizationId(user);

    const saleId = await this.prisma.$transaction(async (tx) => {
      const sale = await tx.dailySale.update({
        where: { id },
        data: {
          ...(nextSaleDate !== undefined
            ? { saleDate: calendarDateToDbDate(nextSaleDate) }
            : undefined),
          ...(dto.totalAmount !== undefined
            ? { totalAmount: dto.totalAmount }
            : undefined),
          ...(dto.note !== undefined ? { note: dto.note ?? null } : undefined),
        },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          organizationId,
          action: "DAILY_SALE_UPDATED",
          entityType: "daily_sale",
          entityId: sale.id,
          branchId: sale.branchId,
          oldValue: this.toAuditSnapshot(existing),
          newValue: this.toAuditSnapshot(sale),
        },
      });

      return sale.id;
    });

    return this.findOne(saleId, user);
  }

  async remove(id: string, user: CurrentUserPayload): Promise<void> {
    // Delete is admin-only (enforced by the controller too, BR-2.6).
    if (isManager(user)) {
      throw new ForbiddenException("Only an admin can delete sales entries");
    }

    const existing = await this.findOne(id, user);
    const organizationId = requireOrganizationId(user);

    await this.prisma.$transaction(async (tx) => {
      await tx.dailySale.delete({ where: { id } });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          organizationId,
          action: "DAILY_SALE_DELETED",
          entityType: "daily_sale",
          entityId: id,
          branchId: existing.branchId,
          oldValue: this.toAuditSnapshot(existing),
          newValue: Prisma.JsonNull,
        },
      });
    });
  }

  private async getActiveBranch(
    branchId: string,
  ): Promise<{ id: string; name: string }> {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, isActive: true },
      select: { id: true, name: true },
    });
    if (!branch) {
      throw new BadRequestException("Branch not found or inactive");
    }
    return branch;
  }

  private assertNotFuture(calendarDate: string): void {
    if (compareCalendarDates(calendarDate, todayCalendarDate()) > 0) {
      throw new BadRequestException("Sale date cannot be in the future");
    }
  }

  private buildDateRange(
    fromDate?: string,
    toDate?: string,
  ): Prisma.DateTimeFilter | undefined {
    const from = typeof fromDate === "string" ? fromDate.trim() : "";
    const to = typeof toDate === "string" ? toDate.trim() : "";
    if (!from && !to) {
      return undefined;
    }
    const range: Prisma.DateTimeFilter = {};
    if (from) range.gte = parseDateColumnRangeStart(from);
    if (to) range.lte = parseDateColumnRangeEnd(to);
    return range;
  }

  private toCalendar(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private toAuditSnapshot(sale: {
    id: string;
    branchId: string;
    saleDate: Date;
    totalAmount: Prisma.Decimal;
    note: string | null;
  }): Prisma.InputJsonObject {
    return {
      id: sale.id,
      branchId: sale.branchId,
      saleDate: this.toCalendar(sale.saleDate),
      totalAmount: Number(sale.totalAmount),
      note: sale.note,
    };
  }
}
