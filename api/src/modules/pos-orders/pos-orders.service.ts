import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  DiscountType,
  OrderStatus,
  Prisma,
  UserRole,
} from "@prisma/client";
import { CurrentUserPayload } from "../../common/decorators/current-user.decorator";
import { requireOrganizationId } from "../../common/utils/require-organization-id.util";
import { assertBranchAccess } from "../../common/utils/branch-scope.util";
import { resolveBranchFilter } from "../../common/utils/branch-scope.util";
import {
  todayCalendarDate,
  zonedDayEnd,
  zonedDayStart,
} from "../../common/utils/app-timezone.util";
import { PrismaService } from "../../prisma/prisma.service";
import { CreatePosOrderDto } from "./dto/create-pos-order.dto";
import { PayOrderDto } from "./dto/pay-order.dto";
import { PosOrderQueryDto } from "./dto/pos-order-query.dto";
import { VoidOrderDto } from "./dto/void-order.dto";

// ── Response select ──────────────────────────────────────────────────────────

const orderSelect = {
  id: true,
  orderNumber: true,
  status: true,
  paymentMethod: true,
  subtotal: true,
  discountType: true,
  discountValue: true,
  discountAmount: true,
  totalAmount: true,
  branchId: true,
  branch: { select: { id: true, name: true, address: true } },
  cashierId: true,
  cashier: { select: { id: true, name: true } },
  voidedById: true,
  voidedBy: { select: { id: true, name: true } },
  voidReason: true,
  voidedAt: true,
  createdAt: true,
  updatedAt: true,
  lines: {
    orderBy: { createdAt: "asc" as const },
    select: {
      id: true,
      menuItemId: true,
      menuItemSizeId: true,
      itemName: true,
      sizeName: true,
      unitPrice: true,
      quantity: true,
      toppingsTotal: true,
      lineTotal: true,
      toppings: {
        select: {
          id: true,
          toppingId: true,
          toppingName: true,
          price: true,
        },
      },
    },
  },
} satisfies Prisma.PosOrderSelect;

export type PosOrderResult = Prisma.PosOrderGetPayload<{
  select: typeof orderSelect;
}>;

export interface PaginatedOrders {
  data: PosOrderResult[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

// ── Arithmetic helpers (2dp precision) ──────────────────────────────────────

function n(d: { toNumber(): number }): number {
  return d.toNumber();
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class PosOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Create ─────────────────────────────────────────────────────────────────

  async createOrder(
    dto: CreatePosOrderDto,
    user: CurrentUserPayload,
  ): Promise<PosOrderResult> {
    // Discount fields must be paired (BR-POS-7.2).
    if (
      (dto.discountType === undefined) !== (dto.discountValue === undefined)
    ) {
      throw new BadRequestException(
        "discountType and discountValue must be provided together",
      );
    }

    const organizationId = requireOrganizationId(user);
    const branchId = user.branchId!; // validated at cashier creation time

    // ── Batch load 1: sizes + their menu items ─────────────────────────────
    const sizeIds = [...new Set(dto.lines.map((l) => l.menuItemSizeId))];
    const toppingIds = [
      ...new Set(dto.lines.flatMap((l) => l.toppingIds ?? [])),
    ];

    const sizeRows = await this.prisma.menuItemSize.findMany({
      where: { id: { in: sizeIds } },
      select: {
        id: true,
        name: true,
        basePrice: true,
        isActive: true,
        menuItemId: true,
        menuItem: {
          select: {
            id: true,
            name: true,
            isActive: true,
            category: { select: { isActive: true } },
          },
        },
      },
    });

    const menuItemIds = [...new Set(sizeRows.map((s) => s.menuItemId))];

    // ── Batch load 2: branch config, prices, toppings, cashier cap ─────────
    const [branchMenuItems, branchPrices, toppingRows, branchToppings, cashierData] =
      await Promise.all([
        this.prisma.branchMenuItem.findMany({
          where: { branchId, menuItemId: { in: menuItemIds } },
          select: { menuItemId: true, isEnabled: true, isInStock: true },
        }),
        this.prisma.branchMenuItemPrice.findMany({
          where: { branchId, menuItemSizeId: { in: sizeIds } },
          select: { menuItemSizeId: true, price: true },
        }),
        toppingIds.length > 0
          ? this.prisma.topping.findMany({
              where: { id: { in: toppingIds } },
              select: { id: true, name: true, price: true, isActive: true },
            })
          : Promise.resolve([]),
        toppingIds.length > 0
          ? this.prisma.branchTopping.findMany({
              where: { branchId, toppingId: { in: toppingIds } },
              select: { toppingId: true, isInStock: true },
            })
          : Promise.resolve([]),
        this.prisma.user.findUnique({
          where: { id: user.id },
          select: { maxDiscountPercent: true },
        }),
      ]);

    // ── Build lookup maps ──────────────────────────────────────────────────
    const sizeMap = new Map(sizeRows.map((s) => [s.id, s]));
    const branchItemMap = new Map(
      branchMenuItems.map((b) => [b.menuItemId, b]),
    );
    const branchPriceMap = new Map(
      branchPrices.map((p) => [p.menuItemSizeId, p.price]),
    );
    const toppingMap = new Map(toppingRows.map((t) => [t.id, t]));
    const branchToppingMap = new Map(
      branchToppings.map((bt) => [bt.toppingId, bt.isInStock]),
    );

    // ── Validate each line and compute totals ──────────────────────────────
    interface ComputedLine {
      menuItemId: string;
      menuItemSizeId: string;
      itemName: string;
      sizeName: string;
      unitPrice: number;
      quantity: number;
      toppingsTotal: number;
      lineTotal: number;
      toppings: { toppingId: string; toppingName: string; price: number }[];
    }

    const computedLines: ComputedLine[] = [];
    let subtotal = 0;

    for (const line of dto.lines) {
      const size = sizeMap.get(line.menuItemSizeId);
      if (!size) {
        throw new BadRequestException(
          `Menu item size "${line.menuItemSizeId}" not found`,
        );
      }
      if (!size.isActive) {
        throw new BadRequestException(
          `Size "${size.name}" is inactive`,
        );
      }
      if (!size.menuItem.isActive) {
        throw new BadRequestException(
          `Item "${size.menuItem.name}" is inactive`,
        );
      }
      if (!size.menuItem.category.isActive) {
        throw new BadRequestException(
          `The category for "${size.menuItem.name}" is inactive`,
        );
      }

      const branchConfig = branchItemMap.get(size.menuItemId);
      if (!branchConfig?.isEnabled) {
        throw new BadRequestException(
          `"${size.menuItem.name}" is not available at this branch`,
        );
      }
      if (!branchConfig.isInStock) {
        throw new BadRequestException(
          `"${size.menuItem.name}" is currently out of stock`,
        );
      }

      // Effective price = branch override ?? catalogue base price.
      const branchPrice = branchPriceMap.get(line.menuItemSizeId) ?? null;
      const unitPrice = round2(n(branchPrice ?? size.basePrice));

      // Validate and snapshot toppings.
      const lineToppings: ComputedLine["toppings"] = [];
      let toppingsUnitCost = 0;

      for (const toppingId of line.toppingIds ?? []) {
        const topping = toppingMap.get(toppingId);
        if (!topping) {
          throw new BadRequestException(
            `Topping "${toppingId}" not found`,
          );
        }
        if (!topping.isActive) {
          throw new BadRequestException(
            `Topping "${topping.name}" is inactive`,
          );
        }
        // No BranchTopping row (or isInStock=true) means topping is available.
        const stockStatus = branchToppingMap.get(toppingId);
        if (stockStatus === false) {
          throw new BadRequestException(
            `Topping "${topping.name}" is out of stock at this branch`,
          );
        }
        const price = round2(n(topping.price));
        toppingsUnitCost = round2(toppingsUnitCost + price);
        lineToppings.push({
          toppingId,
          toppingName: topping.name,
          price,
        });
      }

      // BR-POS-6.7: toppings apply per unit.
      const toppingsTotal = round2(toppingsUnitCost * line.quantity);
      const lineSubtotal = round2(unitPrice * line.quantity);
      const lineTotal = round2(lineSubtotal + toppingsTotal);

      subtotal = round2(subtotal + lineTotal);

      computedLines.push({
        menuItemId: size.menuItemId,
        menuItemSizeId: line.menuItemSizeId,
        itemName: size.menuItem.name,
        sizeName: size.name,
        unitPrice,
        quantity: line.quantity,
        toppingsTotal,
        lineTotal,
        toppings: lineToppings,
      });
    }

    // ── Discount validation (BR-POS-7.4) ──────────────────────────────────
    let discountAmount: number | null = null;

    if (dto.discountType !== undefined && dto.discountValue !== undefined) {
      const maxPct = cashierData?.maxDiscountPercent
        ? n(cashierData.maxDiscountPercent)
        : null;

      if (maxPct === null || maxPct === 0) {
        throw new ForbiddenException(
          "You are not authorised to apply discounts",
        );
      }

      if (dto.discountType === DiscountType.percentage) {
        if (dto.discountValue > maxPct) {
          throw new ForbiddenException(
            `Discount exceeds your maximum of ${maxPct}%`,
          );
        }
        discountAmount = round2((subtotal * dto.discountValue) / 100);
      } else {
        // fixed
        const effectivePct = (dto.discountValue / subtotal) * 100;
        if (effectivePct > maxPct) {
          throw new ForbiddenException(
            `Fixed discount KSh ${dto.discountValue} exceeds your allowed ${maxPct}% of subtotal`,
          );
        }
        discountAmount = round2(dto.discountValue);
      }

      if (discountAmount > subtotal) {
        throw new BadRequestException(
          "Discount cannot exceed the order subtotal",
        );
      }
    }

    const totalAmount = round2(subtotal - (discountAmount ?? 0));

    // ── Transaction ────────────────────────────────────────────────────────
    const orderId = await this.prisma.$transaction(async (tx) => {
      // Atomically claim the next order number (BR-POS-6.9).
      const updatedBranch = await tx.branch.update({
        where: { id: branchId },
        data: { nextPosOrderNumber: { increment: 1 } },
        select: { nextPosOrderNumber: true },
      });
      const orderNumber = updatedBranch.nextPosOrderNumber - 1;

      const order = await tx.posOrder.create({
        data: {
          organizationId,
          branchId,
          orderNumber,
          cashierId: user.id,
          subtotal,
          discountType: dto.discountType ?? null,
          discountValue: dto.discountValue ?? null,
          discountAmount: discountAmount ?? null,
          totalAmount,
          lines: {
            create: computedLines.map((line) => ({
              menuItemId: line.menuItemId,
              menuItemSizeId: line.menuItemSizeId,
              itemName: line.itemName,
              sizeName: line.sizeName,
              unitPrice: line.unitPrice,
              quantity: line.quantity,
              toppingsTotal: line.toppingsTotal,
              lineTotal: line.lineTotal,
              toppings: {
                create: line.toppings.map((t) => ({
                  toppingId: t.toppingId,
                  toppingName: t.toppingName,
                  price: t.price,
                })),
              },
            })),
          },
        },
        select: { id: true },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          organizationId,
          action: "POS_ORDER_CREATED",
          entityType: "pos_order",
          entityId: order.id,
          oldValue: Prisma.JsonNull,
          newValue: {
            orderNumber,
            branchId,
            lineCount: computedLines.length,
            subtotal,
            totalAmount,
          },
        },
      });

      return order.id;
    });

    return this.findOne(orderId, user);
  }

  // ── List ───────────────────────────────────────────────────────────────────

  async findAll(
    query: PosOrderQueryDto,
    user: CurrentUserPayload,
  ): Promise<PaginatedOrders> {
    const where: Prisma.PosOrderWhereInput = {};

    if (user.role === UserRole.cashier) {
      // Cashiers see only their branch, today only (BR-POS spec).
      where.branchId = user.branchId!;
      const today = todayCalendarDate();
      where.createdAt = {
        gte: zonedDayStart(today),
        lte: zonedDayEnd(today),
      };
    } else {
      const branchFilter = resolveBranchFilter(user, query.branchId);
      if (branchFilter !== undefined) {
        where.branchId = branchFilter as string | { in: string[] };
      }
      if (query.cashierId) {
        where.cashierId = query.cashierId;
      }
      if (query.from || query.to) {
        where.createdAt = {};
        if (query.from) {
          (where.createdAt as Prisma.DateTimeFilter).gte = zonedDayStart(query.from);
        }
        if (query.to) {
          (where.createdAt as Prisma.DateTimeFilter).lte = zonedDayEnd(query.to);
        }
      }
    }

    if (query.status) {
      where.status = query.status;
    }

    const skip = (query.page - 1) * query.limit;
    const [data, total] = await Promise.all([
      this.prisma.posOrder.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { createdAt: "desc" },
        select: orderSelect,
      }),
      this.prisma.posOrder.count({ where }),
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

  // ── Get one ────────────────────────────────────────────────────────────────

  async findOne(id: string, user: CurrentUserPayload): Promise<PosOrderResult> {
    const order = await this.prisma.posOrder.findUnique({
      where: { id },
      select: orderSelect,
    });
    if (!order) {
      throw new NotFoundException(`Order "${id}" not found`);
    }
    // Branch access: admin passes, manager must own the branch, cashier must be at the branch.
    assertBranchAccess(order.branchId, user);
    return order;
  }

  // ── Pay ────────────────────────────────────────────────────────────────────

  async payOrder(
    id: string,
    dto: PayOrderDto,
    user: CurrentUserPayload,
  ): Promise<PosOrderResult> {
    const order = await this.findOne(id, user);

    if (order.cashierId !== user.id) {
      throw new ForbiddenException("You can only pay your own orders");
    }
    if (order.status !== OrderStatus.pending) {
      throw new BadRequestException(
        `Cannot pay an order with status "${order.status}"`,
      );
    }

    const organizationId = requireOrganizationId(user);

    await this.prisma.$transaction(async (tx) => {
      await tx.posOrder.update({
        where: { id },
        data: {
          status: OrderStatus.paid,
          paymentMethod: dto.paymentMethod ?? null,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          organizationId,
          action: "POS_ORDER_PAID",
          entityType: "pos_order",
          entityId: id,
          oldValue: { status: order.status },
          newValue: {
            status: OrderStatus.paid,
            paymentMethod: dto.paymentMethod ?? null,
          },
        },
      });
    });

    return this.findOne(id, user);
  }

  // ── Cancel ─────────────────────────────────────────────────────────────────

  async cancelOrder(
    id: string,
    user: CurrentUserPayload,
  ): Promise<PosOrderResult> {
    const order = await this.findOne(id, user);

    if (order.cashierId !== user.id) {
      throw new ForbiddenException("You can only cancel your own orders");
    }
    if (order.status !== OrderStatus.pending) {
      throw new BadRequestException(
        `Cannot cancel an order with status "${order.status}"`,
      );
    }

    const organizationId = requireOrganizationId(user);

    await this.prisma.$transaction(async (tx) => {
      await tx.posOrder.update({
        where: { id },
        data: { status: OrderStatus.cancelled },
      });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          organizationId,
          action: "POS_ORDER_CANCELLED",
          entityType: "pos_order",
          entityId: id,
          oldValue: { status: order.status },
          newValue: { status: OrderStatus.cancelled },
        },
      });
    });

    return this.findOne(id, user);
  }

  // ── Void ───────────────────────────────────────────────────────────────────

  async voidOrder(
    id: string,
    dto: VoidOrderDto,
    user: CurrentUserPayload,
  ): Promise<PosOrderResult> {
    const order = await this.findOne(id, user);

    // findOne already called assertBranchAccess; managers are additionally
    // confirmed to own the branch by that guard.
    if (order.status !== OrderStatus.paid) {
      throw new BadRequestException(
        `Cannot void an order with status "${order.status}"`,
      );
    }

    const organizationId = requireOrganizationId(user);

    await this.prisma.$transaction(async (tx) => {
      await tx.posOrder.update({
        where: { id },
        data: {
          status: OrderStatus.voided,
          voidedById: user.id,
          voidReason: dto.reason.trim(),
          voidedAt: new Date(),
        },
      });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          organizationId,
          action: "POS_ORDER_VOIDED",
          entityType: "pos_order",
          entityId: id,
          oldValue: { status: order.status },
          newValue: {
            status: OrderStatus.voided,
            voidedById: user.id,
            voidReason: dto.reason.trim(),
          },
        },
      });
    });

    return this.findOne(id, user);
  }
}
