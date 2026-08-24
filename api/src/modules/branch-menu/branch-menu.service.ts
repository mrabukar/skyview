import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, UserRole } from "@prisma/client";
import { CurrentUserPayload } from "../../common/decorators/current-user.decorator";
import { requireOrganizationId } from "../../common/utils/require-organization-id.util";
import { assertBranchAccess } from "../../common/utils/branch-scope.util";
import { R2Service } from "../../common/r2/r2.service";
import { PrismaService } from "../../prisma/prisma.service";
import { UpdateBranchMenuItemDto } from "./dto/update-branch-menu-item.dto";
import { BulkEnableBranchMenuItemsDto } from "./dto/bulk-enable-branch-menu-items.dto";
import { UpdateBranchToppingDto } from "./dto/update-branch-topping.dto";

// ── Response shapes ─────────────────────────────────────────────────────────

export interface BranchMenuItemSizeConfig {
  sizeId: string;
  sizeName: string;
  basePrice: Prisma.Decimal;
  branchPrice: Prisma.Decimal | null;
  /** effectivePrice = branchPrice ?? basePrice */
  effectivePrice: Prisma.Decimal;
  isActive: boolean;
}

export interface BranchMenuItemConfig {
  menuItemId: string;
  itemName: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  description: string | null;
  imageKey: string | null;
  /** Short-lived presigned GET URL, or null when missing / R2 unconfigured. */
  imageUrl: string | null;
  /** false when no BranchMenuItem row exists for this branch. */
  isEnabled: boolean;
  /** true when no BranchMenuItem row exists (default on). */
  isInStock: boolean;
  sizes: BranchMenuItemSizeConfig[];
}

export interface BranchToppingConfig {
  toppingId: string;
  name: string;
  price: Prisma.Decimal;
  /** true when no BranchTopping row exists (default on). */
  isInStock: boolean;
}

export interface BranchMenuResponse {
  data: BranchMenuItemConfig[];
  toppings: BranchToppingConfig[];
}

// ── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class BranchMenuService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly r2: R2Service,
  ) {}

  /**
   * Full menu configuration for one branch.
   * Admins/managers: all active org items with their branch config.
   * Cashiers: enabled items at their branch, including out-of-stock ones.
   */
  async getBranchMenu(
    branchId: string,
    user: CurrentUserPayload,
  ): Promise<BranchMenuResponse> {
    assertBranchAccess(branchId, user);
    await this.requireBranch(branchId);

    const isCashier = user.role === UserRole.cashier;

    // 5 parallel queries — assemble in memory.
    const [menuItems, branchMenuItems, branchPrices, toppings, branchToppings] =
      await Promise.all([
        this.prisma.menuItem.findMany({
          where: { isActive: true, category: { isActive: true } },
          orderBy: [{ updatedAt: "desc" }],
          select: {
            id: true,
            name: true,
            description: true,
            imageKey: true,
            category: { select: { id: true, name: true, icon: true } },
            sizes: {
              orderBy: [{ updatedAt: "desc" }],
              select: {
                id: true,
                name: true,
                basePrice: true,
                isActive: true,
              },
            },
          },
        }),

        this.prisma.branchMenuItem.findMany({
          where: { branchId },
          select: { menuItemId: true, isEnabled: true, isInStock: true },
        }),

        this.prisma.branchMenuItemPrice.findMany({
          where: { branchId },
          select: { menuItemSizeId: true, price: true },
        }),

        this.prisma.topping.findMany({
          where: { isActive: true },
          orderBy: [{ updatedAt: "desc" }],
          select: { id: true, name: true, price: true },
        }),

        this.prisma.branchTopping.findMany({
          where: { branchId },
          select: { toppingId: true, isInStock: true },
        }),
      ]);

    // Build lookup maps.
    const branchItemMap = new Map(
      branchMenuItems.map((b) => [b.menuItemId, b]),
    );
    const branchPriceMap = new Map(
      branchPrices.map((p) => [p.menuItemSizeId, p.price]),
    );
    const branchToppingMap = new Map(
      branchToppings.map((bt) => [bt.toppingId, bt.isInStock]),
    );

    // Assemble items (presign image URLs in one batch so the POS grid
    // does not need a separate request per card).
    const assembled: Omit<BranchMenuItemConfig, "imageUrl">[] = [];
    for (const item of menuItems) {
      const config = branchItemMap.get(item.id);
      const isEnabled = config?.isEnabled ?? false;
      const isInStock = config?.isInStock ?? true;

      // Cashiers only see enabled items (out-of-stock stays visible so they can restock).
      if (isCashier && !isEnabled) continue;

      const sizes: BranchMenuItemSizeConfig[] = item.sizes.map((size) => {
        const branchPrice = branchPriceMap.get(size.id) ?? null;
        return {
          sizeId: size.id,
          sizeName: size.name,
          basePrice: size.basePrice,
          branchPrice,
          effectivePrice: branchPrice ?? size.basePrice,
          isActive: size.isActive,
        };
      });

      assembled.push({
        menuItemId: item.id,
        itemName: item.name,
        categoryId: item.category.id,
        categoryName: item.category.name,
        categoryIcon: item.category.icon,
        description: item.description,
        imageKey: item.imageKey,
        isEnabled,
        isInStock,
        sizes,
      });
    }

    const imageUrls = await this.presignImageKeys(
      assembled.map((item) => item.imageKey),
    );
    const data: BranchMenuItemConfig[] = assembled.map((item, index) => ({
      ...item,
      imageUrl: imageUrls[index] ?? null,
    }));

    // Assemble toppings.
    const toppingData: BranchToppingConfig[] = toppings.map((t) => {
      const isInStock = branchToppingMap.get(t.id) ?? true;
      return {
        toppingId: t.id,
        name: t.name,
        price: t.price,
        isInStock,
      };
    });

    return { data, toppings: toppingData };
  }

  /**
   * Configure a single menu item's availability and pricing at a branch.
   * Cashiers may only toggle isInStock; isEnabled and prices require admin/manager.
   */
  async updateBranchMenuItem(
    branchId: string,
    menuItemId: string,
    dto: UpdateBranchMenuItemDto,
    user: CurrentUserPayload,
  ): Promise<BranchMenuItemConfig> {
    assertBranchAccess(branchId, user);

    if (user.role === UserRole.cashier) {
      if (dto.isEnabled !== undefined || dto.prices !== undefined) {
        throw new ForbiddenException(
          "Cashiers can only toggle stock status (isInStock)",
        );
      }
    }

    if (Object.keys(dto).length === 0) {
      throw new BadRequestException("At least one field must be provided");
    }

    await this.requireBranch(branchId);
    const item = await this.requireItem(menuItemId);

    // Validate price sizeIds belong to this item.
    if (dto.prices && dto.prices.length > 0) {
      const validSizeIds = new Set(item.sizes.map((s) => s.id));
      for (const p of dto.prices) {
        if (!validSizeIds.has(p.sizeId)) {
          throw new BadRequestException(
            `Size "${p.sizeId}" does not belong to item "${menuItemId}"`,
          );
        }
      }
    }

    const organizationId = requireOrganizationId(user);

    await this.prisma.$transaction(async (tx) => {
      // Upsert BranchMenuItem. On create, defaults come from DTO or sensible default.
      const branchMenuItem = await tx.branchMenuItem.upsert({
        where: { branchId_menuItemId: { branchId, menuItemId } },
        create: {
          branchId,
          menuItemId,
          isEnabled: dto.isEnabled ?? true,
          isInStock: dto.isInStock ?? true,
        },
        update: {
          ...(dto.isEnabled !== undefined ? { isEnabled: dto.isEnabled } : undefined),
          ...(dto.isInStock !== undefined ? { isInStock: dto.isInStock } : undefined),
        },
      });

      // Handle per-size price overrides.
      if (dto.prices && dto.prices.length > 0) {
        for (const p of dto.prices) {
          if (p.price === null) {
            // Revert to base price — remove the override row.
            await tx.branchMenuItemPrice.deleteMany({
              where: { branchId, menuItemSizeId: p.sizeId },
            });
          } else {
            await tx.branchMenuItemPrice.upsert({
              where: {
                branchId_menuItemSizeId: { branchId, menuItemSizeId: p.sizeId },
              },
              create: { branchId, menuItemSizeId: p.sizeId, price: p.price },
              update: { price: p.price },
            });
          }
        }
      }

      await tx.auditLog.create({
        data: {
          userId: user.id,
          organizationId,
          action: "BRANCH_MENU_ITEM_UPDATED",
          entityType: "branch_menu_item",
          entityId: branchMenuItem.id,
          oldValue: Prisma.JsonNull,
          newValue: {
            branchId,
            menuItemId,
            ...(dto.isEnabled !== undefined ? { isEnabled: dto.isEnabled } : undefined),
            ...(dto.isInStock !== undefined ? { isInStock: dto.isInStock } : undefined),
            pricesPatched: dto.prices?.length ?? 0,
          },
        },
      });
    });

    return this.getSingleItemConfig(branchId, menuItemId);
  }

  /**
   * Bulk-enable multiple items at a branch (admin only, idempotent).
   * Skips items that already have a BranchMenuItem row.
   */
  async bulkEnable(
    branchId: string,
    dto: BulkEnableBranchMenuItemsDto,
    user: CurrentUserPayload,
  ): Promise<{ configured: number }> {
    await this.requireBranch(branchId);

    const organizationId = requireOrganizationId(user);

    await this.prisma.$transaction(async (tx) => {
      await tx.branchMenuItem.createMany({
        data: dto.menuItemIds.map((menuItemId) => ({
          branchId,
          menuItemId,
          isEnabled: true,
          isInStock: true,
        })),
        skipDuplicates: true,
      });

      if (dto.prices && dto.prices.length > 0) {
        for (const p of dto.prices) {
          await tx.branchMenuItemPrice.upsert({
            where: {
              branchId_menuItemSizeId: { branchId, menuItemSizeId: p.sizeId },
            },
            create: { branchId, menuItemSizeId: p.sizeId, price: p.price },
            update: { price: p.price },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          userId: user.id,
          organizationId,
          action: "BRANCH_MENU_ITEM_UPDATED",
          entityType: "branch_menu_item",
          entityId: branchId,
          oldValue: Prisma.JsonNull,
          newValue: {
            branchId,
            bulkEnabled: dto.menuItemIds,
            priceOverrides: dto.prices?.length ?? 0,
          },
        },
      });
    });

    return { configured: dto.menuItemIds.length };
  }

  /**
   * Toggle topping stock status at a branch.
   * Creates the BranchTopping row if it doesn't exist yet.
   */
  async updateBranchTopping(
    branchId: string,
    toppingId: string,
    dto: UpdateBranchToppingDto,
    user: CurrentUserPayload,
  ): Promise<{ toppingId: string; isInStock: boolean }> {
    assertBranchAccess(branchId, user);

    await Promise.all([
      this.requireBranch(branchId),
      this.requireTopping(toppingId),
    ]);

    const organizationId = requireOrganizationId(user);

    const result = await this.prisma.$transaction(async (tx) => {
      const branchTopping = await tx.branchTopping.upsert({
        where: { branchId_toppingId: { branchId, toppingId } },
        create: { branchId, toppingId, isInStock: dto.isInStock },
        update: { isInStock: dto.isInStock },
        select: { toppingId: true, isInStock: true },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          organizationId,
          action: "BRANCH_TOPPING_UPDATED",
          entityType: "branch_topping",
          entityId: `${branchId}::${toppingId}`,
          oldValue: Prisma.JsonNull,
          newValue: { branchId, toppingId, isInStock: dto.isInStock },
        },
      });

      return branchTopping;
    });

    return result;
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  /**
   * Re-fetch a single item's config for one branch, used as the return value
   * after an update so the response reflects the committed state.
   */
  private async getSingleItemConfig(
    branchId: string,
    menuItemId: string,
  ): Promise<BranchMenuItemConfig> {
    const [item, branchMenuItem, branchPrices] = await Promise.all([
      this.prisma.menuItem.findUnique({
        where: { id: menuItemId },
        select: {
          id: true,
          name: true,
          description: true,
          imageKey: true,
          category: { select: { id: true, name: true, icon: true } },
          sizes: {
            orderBy: [{ updatedAt: "desc" }],
            select: { id: true, name: true, basePrice: true, isActive: true },
          },
        },
      }),
      this.prisma.branchMenuItem.findUnique({
        where: { branchId_menuItemId: { branchId, menuItemId } },
        select: { isEnabled: true, isInStock: true },
      }),
      this.prisma.branchMenuItemPrice.findMany({
        where: { branchId, menuItemSize: { menuItemId } },
        select: { menuItemSizeId: true, price: true },
      }),
    ]);

    if (!item) {
      throw new NotFoundException(`Menu item "${menuItemId}" not found`);
    }

    const priceMap = new Map(branchPrices.map((p) => [p.menuItemSizeId, p.price]));
    const [imageUrl] = await this.presignImageKeys([item.imageKey]);

    return {
      menuItemId: item.id,
      itemName: item.name,
      categoryId: item.category.id,
      categoryName: item.category.name,
      categoryIcon: item.category.icon,
      description: item.description,
      imageKey: item.imageKey,
      imageUrl: imageUrl ?? null,
      isEnabled: branchMenuItem?.isEnabled ?? false,
      isInStock: branchMenuItem?.isInStock ?? true,
      sizes: item.sizes.map((size) => {
        const branchPrice = priceMap.get(size.id) ?? null;
        return {
          sizeId: size.id,
          sizeName: size.name,
          basePrice: size.basePrice,
          branchPrice,
          effectivePrice: branchPrice ?? size.basePrice,
          isActive: size.isActive,
        };
      }),
    };
  }

  private async presignImageKeys(
    keys: (string | null | undefined)[],
  ): Promise<(string | null)[]> {
    if (!this.r2.isConfigured) {
      return keys.map(() => null);
    }
    return Promise.all(
      keys.map(async (key) => {
        if (!key) return null;
        try {
          return await this.r2.presignGet(key);
        } catch {
          return null;
        }
      }),
    );
  }

  private async requireBranch(branchId: string): Promise<void> {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      select: { id: true },
    });
    if (!branch) {
      throw new NotFoundException(`Branch "${branchId}" not found`);
    }
  }

  private async requireItem(menuItemId: string): Promise<{
    id: string;
    sizes: { id: string }[];
  }> {
    const item = await this.prisma.menuItem.findUnique({
      where: { id: menuItemId },
      select: { id: true, sizes: { select: { id: true } } },
    });
    if (!item) {
      throw new NotFoundException(`Menu item "${menuItemId}" not found`);
    }
    return item;
  }

  private async requireTopping(toppingId: string): Promise<void> {
    const topping = await this.prisma.topping.findUnique({
      where: { id: toppingId },
      select: { id: true },
    });
    if (!topping) {
      throw new NotFoundException(`Topping "${toppingId}" not found`);
    }
  }
}
