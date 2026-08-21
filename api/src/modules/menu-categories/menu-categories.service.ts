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
import { CreateMenuCategoryDto } from "./dto/create-menu-category.dto";
import { MenuCategoryQueryDto } from "./dto/menu-category-query.dto";
import { UpdateMenuCategoryDto } from "./dto/update-menu-category.dto";

const categorySelect = {
  id: true,
  name: true,
  description: true,
  isActive: true,
  createdById: true,
  createdBy: { select: { id: true, name: true } },
  createdAt: true,
  updatedAt: true,
  _count: { select: { items: true } },
} satisfies Prisma.MenuCategorySelect;

export type MenuCategoryResult = Prisma.MenuCategoryGetPayload<{
  select: typeof categorySelect;
}>;

@Injectable()
export class MenuCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: MenuCategoryQueryDto,
    user: CurrentUserPayload,
  ): Promise<MenuCategoryResult[]> {
    const isAdmin =
      user.role === UserRole.admin || user.role === UserRole.super_admin;
    // Non-admins always see active only; admins can filter by isActive explicitly.
    const activeFilter =
      isAdmin && query.isActive !== undefined ? query.isActive : true;

    return this.prisma.menuCategory.findMany({
      where: { isActive: activeFilter },
      orderBy: [{ updatedAt: "desc" }],
      select: categorySelect,
    });
  }

  async findOne(id: string): Promise<MenuCategoryResult> {
    const category = await this.prisma.menuCategory.findUnique({
      where: { id },
      select: categorySelect,
    });
    if (!category) {
      throw new NotFoundException(`Menu category "${id}" not found`);
    }
    return category;
  }

  async create(
    dto: CreateMenuCategoryDto,
    user: CurrentUserPayload,
  ): Promise<MenuCategoryResult> {
    const organizationId = requireOrganizationId(user);
    const name = dto.name.trim();
    await this.assertNameAvailable(name);

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const category = await tx.menuCategory.create({
          data: withOrganizationId(
            {
              name,
              description: dto.description?.trim() || null,
              createdById: user.id,
            },
            organizationId,
          ),
        });
        await tx.auditLog.create({
          data: {
            userId: user.id,
            organizationId,
            action: "MENU_CATEGORY_CREATED",
            entityType: "menu_category",
            entityId: category.id,
            oldValue: Prisma.JsonNull,
            newValue: { id: category.id, name: category.name },
          },
        });
        return category.id;
      });
      return this.findOne(created);
    } catch (error) {
      throw this.mapDuplicate(error, name);
    }
  }

  async update(
    id: string,
    dto: UpdateMenuCategoryDto,
    user: CurrentUserPayload,
  ): Promise<MenuCategoryResult> {
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
        const category = await tx.menuCategory.update({
          where: { id },
          data: {
            ...(nextName !== undefined ? { name: nextName } : undefined),
            ...(dto.description !== undefined
              ? { description: dto.description?.trim() || null }
              : undefined),
            ...(dto.isActive !== undefined ? { isActive: dto.isActive } : undefined),
          },
        });
        await tx.auditLog.create({
          data: {
            userId: user.id,
            organizationId,
            action:
              dto.isActive === false
                ? "MENU_CATEGORY_DEACTIVATED"
                : "MENU_CATEGORY_UPDATED",
            entityType: "menu_category",
            entityId: id,
            oldValue: { id: existing.id, name: existing.name, isActive: existing.isActive },
            newValue: { id: category.id, name: category.name, isActive: category.isActive },
          },
        });
      });
      return this.findOne(id);
    } catch (error) {
      throw this.mapDuplicate(error, nextName ?? existing.name);
    }
  }

  /** Admin-only: hard-delete when no items; managers call update({ isActive: false }). */
  async remove(id: string, user: CurrentUserPayload): Promise<void> {
    const existing = await this.findOne(id);
    if (existing._count.items > 0) {
      throw new ConflictException(
        "This category has menu items and cannot be deleted. Deactivate it instead.",
      );
    }

    const organizationId = requireOrganizationId(user);
    await this.prisma.$transaction(async (tx) => {
      await tx.menuCategory.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          organizationId,
          action: "MENU_CATEGORY_DEACTIVATED",
          entityType: "menu_category",
          entityId: id,
          oldValue: { id: existing.id, name: existing.name },
          newValue: Prisma.JsonNull,
        },
      });
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  /** Managers can only edit categories they created (BR-POS-2.3). */
  private assertCanEdit(
    category: MenuCategoryResult,
    user: CurrentUserPayload,
  ): void {
    if (user.role === UserRole.admin || user.role === UserRole.super_admin) {
      return;
    }
    if (category.createdById !== user.id) {
      throw new ForbiddenException(
        "You can only edit categories you created",
      );
    }
  }

  private async assertNameAvailable(name: string): Promise<void> {
    const clash = await this.prisma.menuCategory.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
      select: { id: true },
    });
    if (clash) {
      throw new ConflictException(
        `A menu category named "${name}" already exists`,
      );
    }
  }

  private mapDuplicate(error: unknown, name: string): unknown {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return new ConflictException(
        `A menu category named "${name}" already exists`,
      );
    }
    return error;
  }
}
