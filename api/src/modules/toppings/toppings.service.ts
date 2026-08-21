import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, UserRole } from "@prisma/client";
import { CurrentUserPayload } from "../../common/decorators/current-user.decorator";
import { requireOrganizationId } from "../../common/utils/require-organization-id.util";
import { withOrganizationId } from "../../common/utils/with-organization-id.util";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateToppingDto } from "./dto/create-topping.dto";
import { ToppingQueryDto } from "./dto/topping-query.dto";
import { UpdateToppingDto } from "./dto/update-topping.dto";

const toppingSelect = {
  id: true,
  name: true,
  price: true,
  isActive: true,
  createdById: true,
  createdBy: { select: { id: true, name: true } },
  createdAt: true,
  updatedAt: true,
  _count: { select: { orderLineToppings: true } },
} satisfies Prisma.ToppingSelect;

export type ToppingResult = Prisma.ToppingGetPayload<{
  select: typeof toppingSelect;
}>;

@Injectable()
export class ToppingsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: ToppingQueryDto,
    user: CurrentUserPayload,
  ): Promise<ToppingResult[]> {
    const isAdmin =
      user.role === UserRole.admin || user.role === UserRole.super_admin;
    const activeFilter =
      isAdmin && query.isActive !== undefined ? query.isActive : true;

    return this.prisma.topping.findMany({
      where: { isActive: activeFilter },
      orderBy: [{ updatedAt: "desc" }],
      select: toppingSelect,
    });
  }

  async findOne(id: string): Promise<ToppingResult> {
    const topping = await this.prisma.topping.findUnique({
      where: { id },
      select: toppingSelect,
    });
    if (!topping) {
      throw new NotFoundException(`Topping "${id}" not found`);
    }
    return topping;
  }

  async create(
    dto: CreateToppingDto,
    user: CurrentUserPayload,
  ): Promise<ToppingResult> {
    const organizationId = requireOrganizationId(user);
    const name = dto.name.trim();
    await this.assertNameAvailable(name);

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const topping = await tx.topping.create({
          data: withOrganizationId(
            {
              name,
              price: dto.price,
              createdById: user.id,
            },
            organizationId,
          ),
        });
        await tx.auditLog.create({
          data: {
            userId: user.id,
            organizationId,
            action: "TOPPING_CREATED",
            entityType: "topping",
            entityId: topping.id,
            oldValue: Prisma.JsonNull,
            newValue: { id: topping.id, name: topping.name, price: topping.price },
          },
        });
        return topping.id;
      });
      return this.findOne(created);
    } catch (error) {
      throw this.mapDuplicate(error, name);
    }
  }

  async update(
    id: string,
    dto: UpdateToppingDto,
    user: CurrentUserPayload,
  ): Promise<ToppingResult> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException("At least one field must be provided");
    }

    const existing = await this.findOne(id);
    this.assertCanEdit(existing, user);

    const organizationId = requireOrganizationId(user);
    const nextName = dto.name !== undefined ? dto.name.trim() : undefined;
    if (
      nextName !== undefined &&
      nextName.toLowerCase() !== existing.name.toLowerCase()
    ) {
      await this.assertNameAvailable(nextName);
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        const topping = await tx.topping.update({
          where: { id },
          data: {
            ...(nextName !== undefined ? { name: nextName } : undefined),
            ...(dto.price !== undefined ? { price: dto.price } : undefined),
            ...(dto.isActive !== undefined ? { isActive: dto.isActive } : undefined),
          },
        });
        await tx.auditLog.create({
          data: {
            userId: user.id,
            organizationId,
            action:
              dto.isActive === false ? "TOPPING_DEACTIVATED" : "TOPPING_UPDATED",
            entityType: "topping",
            entityId: id,
            oldValue: {
              id: existing.id,
              name: existing.name,
              price: existing.price,
              isActive: existing.isActive,
            },
            newValue: {
              id: topping.id,
              name: topping.name,
              price: topping.price,
              isActive: topping.isActive,
            },
          },
        });
      });
      return this.findOne(id);
    } catch (error) {
      throw this.mapDuplicate(error, nextName ?? existing.name);
    }
  }

  /** Admin-only: hard-delete when never used in orders; managers deactivate. */
  async remove(
    id: string,
    user: CurrentUserPayload,
  ): Promise<{ id: string; action: "deleted" | "deactivated" }> {
    const existing = await this.findOne(id);
    const organizationId = requireOrganizationId(user);
    const referenced = existing._count.orderLineToppings > 0;

    await this.prisma.$transaction(async (tx) => {
      if (referenced) {
        await tx.topping.update({ where: { id }, data: { isActive: false } });
      } else {
        await tx.topping.delete({ where: { id } });
      }
      await tx.auditLog.create({
        data: {
          userId: user.id,
          organizationId,
          action: "TOPPING_DEACTIVATED",
          entityType: "topping",
          entityId: id,
          oldValue: { id: existing.id, name: existing.name, isActive: existing.isActive },
          newValue: referenced
            ? { id: existing.id, name: existing.name, isActive: false }
            : Prisma.JsonNull,
        },
      });
    });

    return { id, action: referenced ? "deactivated" : "deleted" };
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  /** Managers can only edit toppings they created (BR-POS-4.4). */
  private assertCanEdit(topping: ToppingResult, user: CurrentUserPayload): void {
    if (user.role === UserRole.admin || user.role === UserRole.super_admin) {
      return;
    }
    if (topping.createdById !== user.id) {
      throw new ForbiddenException("You can only edit toppings you created");
    }
  }

  private async assertNameAvailable(name: string): Promise<void> {
    const clash = await this.prisma.topping.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
      select: { id: true },
    });
    if (clash) {
      throw new ConflictException(`A topping named "${name}" already exists`);
    }
  }

  private mapDuplicate(error: unknown, name: string): unknown {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return new ConflictException(`A topping named "${name}" already exists`);
    }
    return error;
  }
}
