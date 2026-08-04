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
import { VendorsService } from "../vendors/vendors.service";
import { CreatePurchaseDto } from "./dto/create-purchase.dto";
import { PurchaseQueryDto } from "./dto/purchase-query.dto";
import { UpdatePurchaseDto } from "./dto/update-purchase.dto";

const purchaseInclude = {
  branch: { select: { id: true, name: true } },
  vendor: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true, email: true } },
} satisfies Prisma.PurchaseInclude;

export type PurchaseWithDetails = Prisma.PurchaseGetPayload<{
  include: typeof purchaseInclude;
}>;

export interface PaginatedResult<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

@Injectable()
export class PurchasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vendorsService: VendorsService,
  ) {}

  async findAll(
    query: PurchaseQueryDto,
    user: CurrentUserPayload,
  ): Promise<PaginatedResult<PurchaseWithDetails>> {
    const skip = (query.page - 1) * query.limit;
    const branchId = resolveBranchFilter(user, query.branchId);
    const dateRange = this.buildDateRange(query.fromDate, query.toDate);
    const search = typeof query.search === "string" ? query.search.trim() : "";

    const where: Prisma.PurchaseWhereInput = {
      ...(branchId ? { branchId } : undefined),
      ...(query.vendorId ? { vendorId: query.vendorId } : undefined),
      ...(dateRange ? { purchaseDate: dateRange } : undefined),
      ...(search
        ? {
            OR: [
              { itemName: { contains: search, mode: "insensitive" } },
              { note: { contains: search, mode: "insensitive" } },
              { vendor: { name: { contains: search, mode: "insensitive" } } },
            ],
          }
        : undefined),
    };

    const [data, total] = await Promise.all([
      this.prisma.purchase.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: [{ purchaseDate: "desc" }, { createdAt: "desc" }],
        include: purchaseInclude,
      }),
      this.prisma.purchase.count({ where }),
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
  ): Promise<PurchaseWithDetails> {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id },
      include: purchaseInclude,
    });
    if (!purchase) {
      throw new NotFoundException(`Purchase with id "${id}" not found`);
    }
    assertBranchAccess(purchase.branchId, user);
    return purchase;
  }

  async create(
    dto: CreatePurchaseDto,
    user: CurrentUserPayload,
  ): Promise<PurchaseWithDetails> {
    const organizationId = requireOrganizationId(user);
    const branchId = resolveWriteBranchId(user, dto.branchId);
    await this.getActiveBranch(branchId);
    await this.vendorsService.requireActiveVendor(dto.vendorId);

    const purchaseDate = extractCalendarDate(dto.purchaseDate);
    this.assertNotFuture(purchaseDate);
    const totalCost = roundMoney(dto.quantity * dto.unitPrice);

    const purchaseId = await this.prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.create({
        data: withOrganizationId(
          {
            branchId,
            itemName: dto.itemName.trim(),
            quantity: dto.quantity,
            unitPrice: dto.unitPrice,
            totalCost,
            vendorId: dto.vendorId,
            purchaseDate: calendarDateToDbDate(purchaseDate),
            note: dto.note ?? null,
            createdById: user.id,
          },
          organizationId,
        ),
      });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          organizationId,
          action: "PURCHASE_CREATED",
          entityType: "purchase",
          entityId: purchase.id,
          branchId,
          oldValue: Prisma.JsonNull,
          newValue: this.toAuditSnapshot(purchase),
        },
      });
      return purchase.id;
    });

    return this.findOne(purchaseId, user);
  }

  async update(
    id: string,
    dto: UpdatePurchaseDto,
    user: CurrentUserPayload,
  ): Promise<PurchaseWithDetails> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException("At least one field must be provided");
    }

    const existing = await this.findOne(id, user);
    this.assertManagerSameDay(existing.purchaseDate, user, "edit");

    if (dto.vendorId !== undefined) {
      await this.vendorsService.requireActiveVendor(dto.vendorId);
    }

    let nextDate: string | undefined;
    if (dto.purchaseDate !== undefined) {
      nextDate = extractCalendarDate(dto.purchaseDate);
      this.assertNotFuture(nextDate);
    }

    const nextQuantity = dto.quantity ?? Number(existing.quantity);
    const nextUnitPrice = dto.unitPrice ?? Number(existing.unitPrice);
    const recompute = dto.quantity !== undefined || dto.unitPrice !== undefined;

    const organizationId = requireOrganizationId(user);

    const purchaseId = await this.prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.update({
        where: { id },
        data: {
          ...(dto.itemName !== undefined
            ? { itemName: dto.itemName.trim() }
            : undefined),
          ...(dto.quantity !== undefined ? { quantity: dto.quantity } : undefined),
          ...(dto.unitPrice !== undefined
            ? { unitPrice: dto.unitPrice }
            : undefined),
          ...(recompute
            ? { totalCost: roundMoney(nextQuantity * nextUnitPrice) }
            : undefined),
          ...(dto.vendorId !== undefined ? { vendorId: dto.vendorId } : undefined),
          ...(nextDate !== undefined
            ? { purchaseDate: calendarDateToDbDate(nextDate) }
            : undefined),
          ...(dto.note !== undefined ? { note: dto.note ?? null } : undefined),
        },
      });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          organizationId,
          action: "PURCHASE_UPDATED",
          entityType: "purchase",
          entityId: purchase.id,
          branchId: purchase.branchId,
          oldValue: this.toAuditSnapshot(existing),
          newValue: this.toAuditSnapshot(purchase),
        },
      });
      return purchase.id;
    });

    return this.findOne(purchaseId, user);
  }

  async remove(id: string, user: CurrentUserPayload): Promise<void> {
    const existing = await this.findOne(id, user);
    this.assertManagerSameDay(existing.purchaseDate, user, "remove");
    const organizationId = requireOrganizationId(user);

    await this.prisma.$transaction(async (tx) => {
      await tx.purchase.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          organizationId,
          action: "PURCHASE_DELETED",
          entityType: "purchase",
          entityId: id,
          branchId: existing.branchId,
          oldValue: this.toAuditSnapshot(existing),
          newValue: Prisma.JsonNull,
        },
      });
    });
  }

  private async getActiveBranch(branchId: string): Promise<void> {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, isActive: true },
      select: { id: true },
    });
    if (!branch) {
      throw new BadRequestException("Branch not found or inactive");
    }
  }

  private assertNotFuture(calendarDate: string): void {
    if (compareCalendarDates(calendarDate, todayCalendarDate()) > 0) {
      throw new BadRequestException("Purchase date cannot be in the future");
    }
  }

  private assertManagerSameDay(
    storedDate: Date,
    user: CurrentUserPayload,
    verb: "edit" | "remove",
  ): void {
    if (!isManager(user)) return;
    const stored = storedDate.toISOString().slice(0, 10);
    if (stored !== todayCalendarDate()) {
      const action = verb === "edit" ? "edit" : "remove";
      throw new ForbiddenException(
        `Managers can only ${action} today's purchases. Ask an admin for older entries.`,
      );
    }
  }

  private buildDateRange(
    fromDate?: string,
    toDate?: string,
  ): Prisma.DateTimeFilter | undefined {
    const from = typeof fromDate === "string" ? fromDate.trim() : "";
    const to = typeof toDate === "string" ? toDate.trim() : "";
    if (!from && !to) return undefined;
    const range: Prisma.DateTimeFilter = {};
    if (from) range.gte = parseDateColumnRangeStart(from);
    if (to) range.lte = parseDateColumnRangeEnd(to);
    return range;
  }

  private toAuditSnapshot(purchase: {
    id: string;
    branchId: string;
    itemName: string;
    quantity: Prisma.Decimal;
    unitPrice: Prisma.Decimal;
    totalCost: Prisma.Decimal;
    vendorId: string;
    purchaseDate: Date;
    note: string | null;
  }): Prisma.InputJsonObject {
    return {
      id: purchase.id,
      branchId: purchase.branchId,
      itemName: purchase.itemName,
      quantity: Number(purchase.quantity),
      unitPrice: Number(purchase.unitPrice),
      totalCost: Number(purchase.totalCost),
      vendorId: purchase.vendorId,
      purchaseDate: purchase.purchaseDate.toISOString().slice(0, 10),
      note: purchase.note,
    };
  }
}
