import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, UserRole } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { CurrentUserPayload } from "../../common/decorators/current-user.decorator";
import { requireOrganizationId } from "../../common/utils/require-organization-id.util";
import { withOrganizationId } from "../../common/utils/with-organization-id.util";
import { PrismaService } from "../../prisma/prisma.service";
import { R2Service } from "../../common/r2/r2.service";
import { CreateMenuItemDto, CreateMenuItemSizeDto } from "./dto/create-menu-item.dto";
import { ConfirmMenuItemImageDto } from "./dto/confirm-menu-item-image.dto";
import { MenuItemQueryDto } from "./dto/menu-item-query.dto";
import {
  MenuItemUploadUrlDto,
  MENU_ITEM_IMAGE_EXTENSION,
} from "./dto/menu-item-upload-url.dto";
import {
  MENU_ITEM_IMAGE_CONTENT_TYPES,
  MENU_ITEM_IMAGE_HEIGHT,
  MENU_ITEM_IMAGE_MAX_SIZE,
  MENU_ITEM_IMAGE_SIZE_ERROR,
  MENU_ITEM_IMAGE_WIDTH,
} from "./menu-item-image.constants";
import { UpdateMenuItemDto, UpdateMenuItemSizeDto } from "./dto/update-menu-item.dto";
import sharp from "sharp";

const sizeSelect = {
  id: true,
  name: true,
  basePrice: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.MenuItemSizeSelect;

const itemListSelect = {
  id: true,
  name: true,
  description: true,
  imageKey: true,
  isActive: true,
  categoryId: true,
  category: { select: { id: true, name: true } },
  createdById: true,
  createdBy: { select: { id: true, name: true } },
  createdAt: true,
  updatedAt: true,
  sizes: {
    select: sizeSelect,
    orderBy: [{ updatedAt: "desc" as const }],
  },
} satisfies Prisma.MenuItemSelect;

const itemSelect = {
  ...itemListSelect,
  _count: { select: { orderLines: true } },
} satisfies Prisma.MenuItemSelect;

export type MenuItemResult = Prisma.MenuItemGetPayload<{
  select: typeof itemSelect;
}>;

export type MenuItemListResult = Prisma.MenuItemGetPayload<{
  select: typeof itemListSelect;
}>;

export interface PaginatedResult<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

@Injectable()
export class MenuItemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly r2: R2Service,
  ) {}

  async findAll(
    query: MenuItemQueryDto,
    user: CurrentUserPayload,
  ): Promise<PaginatedResult<MenuItemListResult>> {
    const isAdmin =
      user.role === UserRole.admin || user.role === UserRole.super_admin;
    const activeFilter =
      isAdmin && query.isActive !== undefined ? query.isActive : true;

    const where: Prisma.MenuItemWhereInput = {
      isActive: activeFilter,
      ...(query.categoryId ? { categoryId: query.categoryId } : undefined),
      ...(query.search
        ? { name: { contains: query.search.trim(), mode: "insensitive" } }
        : undefined),
    };

    const skip = (query.page - 1) * query.limit;
    const [data, total] = await Promise.all([
      this.prisma.menuItem.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: [{ updatedAt: "desc" }],
        select: itemListSelect,
      }),
      this.prisma.menuItem.count({ where }),
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

  async findOne(id: string): Promise<MenuItemResult> {
    const item = await this.prisma.menuItem.findUnique({
      where: { id },
      select: itemSelect,
    });
    if (!item) {
      throw new NotFoundException(`Menu item "${id}" not found`);
    }
    return item;
  }

  async create(
    dto: CreateMenuItemDto,
    user: CurrentUserPayload,
  ): Promise<MenuItemResult> {
    const organizationId = requireOrganizationId(user);
    const name = dto.name.trim();
    await this.assertNameAvailable(name);
    await this.requireActiveCategory(dto.categoryId);

    // Validate size names are unique within this item.
    const sizeNames = dto.sizes.map((s) => s.name.trim().toLowerCase());
    if (new Set(sizeNames).size !== sizeNames.length) {
      throw new BadRequestException("Size names must be unique within an item");
    }

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const item = await tx.menuItem.create({
          data: withOrganizationId(
            {
              name,
              description: dto.description?.trim() || null,
              imageKey: dto.imageKey ?? null,
              categoryId: dto.categoryId,
              createdById: user.id,
              sizes: {
                create: dto.sizes.map((s) => ({
                  name: s.name.trim(),
                  basePrice: s.basePrice,
                })),
              },
            },
            organizationId,
          ),
        });

        // BR-POS-3.6: when a manager creates an item, auto-enable it at
        // their assigned branch(es) so it's immediately available in their POS.
        if (user.role === UserRole.branch_manager) {
          const branchIds = this.resolveManagerBranchIds(user);
          if (branchIds.length > 0) {
            await tx.branchMenuItem.createMany({
              data: branchIds.map((branchId) => ({
                branchId,
                menuItemId: item.id,
                isEnabled: true,
                isInStock: true,
              })),
              skipDuplicates: true,
            });
          }
        }

        await tx.auditLog.create({
          data: {
            userId: user.id,
            organizationId,
            action: "MENU_ITEM_CREATED",
            entityType: "menu_item",
            entityId: item.id,
            oldValue: Prisma.JsonNull,
            newValue: {
              id: item.id,
              name: item.name,
              categoryId: item.categoryId,
              sizeCount: dto.sizes.length,
            },
          },
        });
        return item.id;
      });
      return this.findOne(created);
    } catch (error) {
      throw this.mapDuplicate(error, name);
    }
  }

  async update(
    id: string,
    dto: UpdateMenuItemDto,
    user: CurrentUserPayload,
  ): Promise<MenuItemResult> {
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
    if (dto.categoryId !== undefined) {
      await this.requireActiveCategory(dto.categoryId);
    }

    // If imageKey is being changed, delete the old image from R2 after save.
    const oldImageKey =
      dto.imageKey !== undefined && dto.imageKey !== existing.imageKey
        ? existing.imageKey
        : null;

    try {
      await this.prisma.$transaction(async (tx) => {
        const item = await tx.menuItem.update({
          where: { id },
          data: {
            ...(nextName !== undefined ? { name: nextName } : undefined),
            ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : undefined),
            ...(dto.description !== undefined
              ? { description: dto.description?.trim() || null }
              : undefined),
            ...(dto.isActive !== undefined ? { isActive: dto.isActive } : undefined),
            ...(dto.imageKey !== undefined ? { imageKey: dto.imageKey } : undefined),
          },
        });
        await tx.auditLog.create({
          data: {
            userId: user.id,
            organizationId,
            action:
              dto.isActive === false ? "MENU_ITEM_DEACTIVATED" : "MENU_ITEM_UPDATED",
            entityType: "menu_item",
            entityId: id,
            oldValue: { id: existing.id, name: existing.name, isActive: existing.isActive },
            newValue: { id: item.id, name: item.name, isActive: item.isActive },
          },
        });
      });

      // Best-effort cleanup of the old image from R2.
      if (oldImageKey && this.r2.isConfigured) {
        this.r2.deleteObject(oldImageKey).catch(() => {});
      }
      return this.findOne(id);
    } catch (error) {
      throw this.mapDuplicate(error, nextName ?? existing.name);
    }
  }

  /** Admin-only: hard-delete when never ordered. */
  async remove(id: string, user: CurrentUserPayload): Promise<void> {
    const existing = await this.findOne(id);
    if (existing._count.orderLines > 0) {
      throw new ConflictException(
        "This item has been ordered and cannot be deleted. Deactivate it instead.",
      );
    }

    const organizationId = requireOrganizationId(user);
    await this.prisma.$transaction(async (tx) => {
      await tx.menuItem.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          organizationId,
          action: "MENU_ITEM_DEACTIVATED",
          entityType: "menu_item",
          entityId: id,
          oldValue: { id: existing.id, name: existing.name },
          newValue: Prisma.JsonNull,
        },
      });
    });
  }

  // ── Size management ───────────────────────────────────────────────────────

  async addSize(
    menuItemId: string,
    dto: CreateMenuItemSizeDto,
    user: CurrentUserPayload,
  ): Promise<MenuItemResult> {
    const item = await this.findOne(menuItemId);
    this.assertCanEdit(item, user);

    const organizationId = requireOrganizationId(user);
    const name = dto.name.trim();
    const clash = item.sizes.some(
      (s) => s.name.toLowerCase() === name.toLowerCase(),
    );
    if (clash) {
      throw new ConflictException(
        `A size named "${name}" already exists on this item`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.menuItemSize.create({
        data: {
          menuItemId,
          name,
          basePrice: dto.basePrice,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          organizationId,
          action: "MENU_ITEM_SIZE_CREATED",
          entityType: "menu_item_size",
          entityId: menuItemId,
          oldValue: Prisma.JsonNull,
          newValue: { menuItemId, sizeName: name, basePrice: dto.basePrice },
        },
      });
    });
    return this.findOne(menuItemId);
  }

  async updateSize(
    sizeId: string,
    dto: UpdateMenuItemSizeDto,
    user: CurrentUserPayload,
  ): Promise<MenuItemResult> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException("At least one field must be provided");
    }

    const size = await this.requireSize(sizeId);
    const item = await this.findOne(size.menuItemId);
    this.assertCanEdit(item, user);

    const organizationId = requireOrganizationId(user);
    const nextName = dto.name !== undefined ? dto.name.trim() : undefined;
    if (nextName !== undefined && nextName.toLowerCase() !== size.name.toLowerCase()) {
      const clash = item.sizes.some(
        (s) =>
          s.id !== sizeId && s.name.toLowerCase() === nextName.toLowerCase(),
      );
      if (clash) {
        throw new ConflictException(
          `A size named "${nextName}" already exists on this item`,
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.menuItemSize.update({
        where: { id: sizeId },
        data: {
          ...(nextName !== undefined ? { name: nextName } : undefined),
          ...(dto.basePrice !== undefined ? { basePrice: dto.basePrice } : undefined),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : undefined),
        },
      });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          organizationId,
          action:
            dto.isActive === false
              ? "MENU_ITEM_SIZE_DEACTIVATED"
              : "MENU_ITEM_SIZE_UPDATED",
          entityType: "menu_item_size",
          entityId: sizeId,
          oldValue: { sizeId, name: size.name, basePrice: size.basePrice },
          newValue: {
            sizeId,
            name: nextName ?? size.name,
            basePrice: dto.basePrice ?? size.basePrice,
          },
        },
      });
    });
    return this.findOne(size.menuItemId);
  }

  /** Admin-only: hard-delete size when never ordered. */
  async removeSize(sizeId: string, user: CurrentUserPayload): Promise<MenuItemResult> {
    const size = await this.requireSize(sizeId);
    const item = await this.findOne(size.menuItemId);

    if (item.sizes.filter((s) => s.isActive).length <= 1) {
      throw new BadRequestException(
        "An item must have at least one active size. Deactivate the item instead.",
      );
    }

    const orderLineCount = await this.prisma.orderLine.count({
      where: { menuItemSizeId: sizeId },
    });
    if (orderLineCount > 0) {
      throw new ConflictException(
        "This size has been ordered and cannot be deleted. Deactivate it instead.",
      );
    }

    const organizationId = requireOrganizationId(user);
    await this.prisma.$transaction(async (tx) => {
      await tx.menuItemSize.delete({ where: { id: sizeId } });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          organizationId,
          action: "MENU_ITEM_SIZE_DEACTIVATED",
          entityType: "menu_item_size",
          entityId: sizeId,
          oldValue: { sizeId, name: size.name, basePrice: size.basePrice },
          newValue: Prisma.JsonNull,
        },
      });
    });
    return this.findOne(size.menuItemId);
  }

  // ── Image upload ─────────────────────────────────────────────────────────

  /** Pre-signed PUT URL for direct browser → R2 image upload. */
  async createUploadUrl(dto: MenuItemUploadUrlDto, user: CurrentUserPayload) {
    const organizationId = requireOrganizationId(user);
    const ext = MENU_ITEM_IMAGE_EXTENSION[dto.contentType] ?? "bin";
    const key = `menu-items/${organizationId}/${randomUUID()}.${ext}`;
    const url = await this.r2.presignPut(key, dto.contentType);
    return { key, url, expiresIn: 300 };
  }

  /**
   * After the browser PUTs to R2, verify the stored file is a 600×800 PNG/WebP
   * under 1 MB. Invalid objects are deleted so they cannot be attached.
   */
  async confirmImage(
    dto: ConfirmMenuItemImageDto,
    user: CurrentUserPayload,
  ): Promise<{ key: string }> {
    const organizationId = requireOrganizationId(user);
    const prefix = `menu-items/${organizationId}/`;
    if (!dto.key.startsWith(prefix)) {
      throw new ForbiddenException("Invalid image key");
    }

    let buf: Buffer;
    try {
      buf = await this.r2.getObjectBuffer(dto.key);
    } catch {
      throw new BadRequestException("Image upload could not be verified.");
    }

    const reject = async (message: string): Promise<never> => {
      await this.r2.deleteObject(dto.key).catch(() => undefined);
      throw new BadRequestException(message);
    };

    if (buf.length > MENU_ITEM_IMAGE_MAX_SIZE) {
      await reject("Menu images must be 1 MB or smaller.");
    }

    let meta: sharp.Metadata;
    try {
      meta = await sharp(buf).metadata();
    } catch {
      await reject("The uploaded file is not a valid image.");
      return { key: dto.key };
    }

    const type = meta.format === "png" ? "image/png" : meta.format === "webp" ? "image/webp" : null;
    if (!type || !(MENU_ITEM_IMAGE_CONTENT_TYPES as readonly string[]).includes(type)) {
      await reject("Only PNG or WebP images are accepted.");
    }

    if (meta.width !== MENU_ITEM_IMAGE_WIDTH || meta.height !== MENU_ITEM_IMAGE_HEIGHT) {
      await reject(MENU_ITEM_IMAGE_SIZE_ERROR);
    }

    return { key: dto.key };
  }

  /** Short-lived pre-signed GET URL for viewing an item's image. */
  async getImageUrl(imageKey: string): Promise<{ url: string }> {
    const url = await this.r2.presignGet(imageKey, 300);
    return { url };
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  /** Managers can only edit items they created (BR-POS-3.5). */
  private assertCanEdit(item: MenuItemResult, user: CurrentUserPayload): void {
    if (user.role === UserRole.admin || user.role === UserRole.super_admin) {
      return;
    }
    if (item.createdById !== user.id) {
      throw new ForbiddenException("You can only edit items you created");
    }
  }

  private resolveManagerBranchIds(user: CurrentUserPayload): string[] {
    const fromPayload =
      Array.isArray(user.branchIds) && user.branchIds.length > 0
        ? user.branchIds
        : user.branchId
          ? [user.branchId]
          : [];
    return fromPayload;
  }

  private async requireActiveCategory(categoryId: string): Promise<void> {
    const cat = await this.prisma.menuCategory.findFirst({
      where: { id: categoryId, isActive: true },
      select: { id: true },
    });
    if (!cat) {
      throw new BadRequestException(
        "Category not found or inactive",
      );
    }
  }

  private async requireSize(
    sizeId: string,
  ): Promise<{ id: string; menuItemId: string; name: string; basePrice: Prisma.Decimal }> {
    const size = await this.prisma.menuItemSize.findUnique({
      where: { id: sizeId },
      select: { id: true, menuItemId: true, name: true, basePrice: true },
    });
    if (!size) {
      throw new NotFoundException(`Menu item size "${sizeId}" not found`);
    }
    return size;
  }

  private async assertNameAvailable(name: string): Promise<void> {
    const clash = await this.prisma.menuItem.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
      select: { id: true },
    });
    if (clash) {
      throw new ConflictException(
        `A menu item named "${name}" already exists`,
      );
    }
  }

  private mapDuplicate(error: unknown, name: string): unknown {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return new ConflictException(`A menu item named "${name}" already exists`);
    }
    return error;
  }
}
