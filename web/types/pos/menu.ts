/**
 * POS menu catalogue types — org-wide menu items, sizes, categories, toppings.
 * These mirror the shapes returned by /api/menu-categories, /api/menu-items,
 * and /api/toppings. Prices are serialised as strings (Prisma Decimal).
 */

export interface MenuCreatedBy {
  id: string;
  name: string;
}

export interface MenuCategory {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdById: string;
  createdBy: MenuCreatedBy;
  createdAt: string;
  updatedAt: string;
  _count: { items: number };
}

export interface MenuItemSize {
  id: string;
  name: string;
  /** Base price in KSh, serialised from Prisma Decimal. */
  basePrice: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  imageKey: string | null;
  isActive: boolean;
  categoryId: string;
  category: { id: string; name: string };
  createdById: string;
  createdBy: MenuCreatedBy;
  createdAt: string;
  updatedAt: string;
  sizes: MenuItemSize[];
  _count: { orderLines: number };
}

export interface Topping {
  id: string;
  name: string;
  /** Price per unit in KSh, serialised from Prisma Decimal. */
  price: string;
  isActive: boolean;
  createdById: string;
  createdBy: MenuCreatedBy;
  createdAt: string;
  updatedAt: string;
}

// ── Query types ────────────────────────────────────────────────────────────────

export interface MenuCategoryQuery {
  isActive?: boolean;
}

export interface MenuItemQuery {
  page?: number;
  limit?: number;
  categoryId?: string;
  isActive?: boolean;
  search?: string;
}

export interface ToppingQuery {
  isActive?: boolean;
  search?: string;
}

// ── Mutation input types ───────────────────────────────────────────────────────

export interface CreateMenuCategoryInput {
  name: string;
  description?: string;
}

export interface UpdateMenuCategoryInput {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export interface CreateMenuItemSizeInput {
  name: string;
  basePrice: number;
}

export interface CreateMenuItemInput {
  name: string;
  categoryId: string;
  description?: string;
  imageKey?: string;
  sizes: CreateMenuItemSizeInput[];
}

export interface UpdateMenuItemInput {
  name?: string;
  categoryId?: string;
  description?: string;
  isActive?: boolean;
  imageKey?: string | null;
}

export interface UpdateMenuItemSizeInput {
  name?: string;
  basePrice?: number;
  isActive?: boolean;
}

export interface CreateToppingInput {
  name: string;
  price: number;
}

export interface UpdateToppingInput {
  name?: string;
  price?: number;
  isActive?: boolean;
}
