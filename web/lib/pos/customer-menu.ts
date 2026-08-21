import type { BranchMenuItemConfig } from "@/types/pos/branch-menu";

export const CUSTOMER_MENU_PAGE_SIZE = 20;
export const POSTER_CARDS_PER_ROW = 4;
export const POSTER_CATEGORY_ROWS_PER_PAGE = 3;

export type CustomerMenuLayout = "classic" | "poster";

const SIZE_ORDER = ["small", "medium", "large"] as const;

export const POSTER_SUGAR_LEVELS = ["0%", "25%", "50%", "75%", "100%"] as const;
export const POSTER_ICE_LEVELS = [
  "No Ice",
  "Less Ice",
  "Normal Ice",
  "Extra Ice",
] as const;
export const POSTER_DEFAULT_TOPPINGS = [
  "Pearls",
  "Popping Boba",
  "Jelly",
  "Aloe Vera",
  "Cheese Foam",
] as const;
export const POSTER_DEFAULT_TOPPING_PRICE = 60;

export interface PosterTopping {
  name: string;
  price: number;
}

export interface CustomerMenuItem {
  id: string;
  index: number;
  name: string;
  categoryName: string;
  description: string | null;
  imageKey: string | null;
  /** Small / Medium / Large effective prices; null if that size is missing. */
  prices: [number | null, number | null, number | null];
}

export interface CustomerMenuPdfItem extends CustomerMenuItem {
  imageSrc: string | null;
}

export interface CustomerMenuCategoryGroup<T extends CustomerMenuItem = CustomerMenuItem> {
  categoryName: string;
  items: T[];
}

export interface PosterCategoryRow<T extends CustomerMenuItem = CustomerMenuItem> {
  categoryName: string;
  items: T[];
}

export function toCustomerMenuItems(
  items: BranchMenuItemConfig[],
): CustomerMenuItem[] {
  const enabled = items.filter((item) => item.isEnabled);
  enabled.sort((a, b) => {
    const cat = a.categoryName.localeCompare(b.categoryName);
    if (cat !== 0) return cat;
    return a.itemName.localeCompare(b.itemName);
  });

  return enabled.map((item, i) => ({
    id: item.menuItemId,
    index: i + 1,
    name: item.itemName,
    categoryName: item.categoryName,
    description: item.description,
    imageKey: item.imageKey,
    prices: SIZE_ORDER.map((name) => {
      const size = item.sizes.find(
        (s) => s.isActive && s.sizeName.toLowerCase() === name,
      );
      return size ? Number(size.effectivePrice) : null;
    }) as [number | null, number | null, number | null],
  }));
}

export function groupCustomerMenuByCategory<T extends CustomerMenuItem>(
  items: T[],
): CustomerMenuCategoryGroup<T>[] {
  const groups: CustomerMenuCategoryGroup<T>[] = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (last && last.categoryName === item.categoryName) {
      last.items.push(item);
    } else {
      groups.push({ categoryName: item.categoryName, items: [item] });
    }
  }
  return groups;
}

export function chunkPages<T>(items: T[], pageSize: number): T[][] {
  if (items.length === 0) return [];
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += pageSize) {
    pages.push(items.slice(i, i + pageSize));
  }
  return pages;
}

export function formatMenuPrice(value: number | null): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString("en-KE", { maximumFractionDigits: 0 });
}

/** Prefer the item description; otherwise "{name} made fresh to order". */
export function customerMenuBlurb(item: CustomerMenuItem): string {
  const d = item.description?.trim();
  if (d) return d;
  return `${item.name} made fresh to order`;
}

/**
 * Always return three prices for the poster UI. Missing sizes reuse the first
 * available price on that row; if none exist the values stay null.
 */
export function filledSizePrices(
  prices: [number | null, number | null, number | null],
): [number | null, number | null, number | null] {
  const fallback = prices.find((p) => p != null && !Number.isNaN(p)) ?? null;
  if (fallback == null) return prices;
  return [prices[0] ?? fallback, prices[1] ?? fallback, prices[2] ?? fallback];
}

export function uniqueMenuCategories(items: CustomerMenuItem[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    if (!seen.has(item.categoryName)) {
      seen.add(item.categoryName);
      out.push(item.categoryName);
    }
  }
  return out;
}

export function categoryMenuBlurb(
  categoryName: string,
  descriptions?: Record<string, string | null | undefined>,
): string {
  const d = descriptions?.[categoryName]?.trim();
  if (d) return d;
  return `${categoryName} made fresh to order`;
}

/** Split each category into rows of POSTER_CARDS_PER_ROW cards. */
export function posterCategoryRows<T extends CustomerMenuItem>(
  items: T[],
): PosterCategoryRow<T>[] {
  const groups = groupCustomerMenuByCategory(items);
  const rows: PosterCategoryRow<T>[] = [];
  for (const group of groups) {
    for (let i = 0; i < group.items.length; i += POSTER_CARDS_PER_ROW) {
      rows.push({
        categoryName: group.categoryName,
        items: group.items.slice(i, i + POSTER_CARDS_PER_ROW),
      });
    }
  }
  return rows;
}

/** Pack category rows into pages of POSTER_CATEGORY_ROWS_PER_PAGE. */
export function chunkPosterPages<T extends CustomerMenuItem>(
  items: T[],
): PosterCategoryRow<T>[][] {
  const rows = posterCategoryRows(items);
  if (rows.length === 0) return [];
  const pages: PosterCategoryRow<T>[][] = [];
  for (let i = 0; i < rows.length; i += POSTER_CATEGORY_ROWS_PER_PAGE) {
    pages.push(rows.slice(i, i + POSTER_CATEGORY_ROWS_PER_PAGE));
  }
  return pages;
}
