import type { LucideIcon } from "lucide-react";
import {
  Apple,
  Banana,
  CakeSlice,
  Candy,
  Cherry,
  Citrus,
  Coffee,
  Cookie,
  Crown,
  CupSoda,
  Droplets,
  Flame,
  Flower2,
  GlassWater,
  Grape,
  Heart,
  IceCream,
  IceCreamCone,
  Leaf,
  Milk,
  Sandwich,
  Snowflake,
  Soup,
  Sparkles,
  Star,
  UtensilsCrossed,
} from "lucide-react";

export const MENU_CATEGORY_ICON_NAMES = [
  "CupSoda",
  "Coffee",
  "GlassWater",
  "Milk",
  "IceCream",
  "IceCreamCone",
  "Snowflake",
  "Droplets",
  "Apple",
  "Cherry",
  "Citrus",
  "Grape",
  "Banana",
  "Leaf",
  "Flower2",
  "Sparkles",
  "Star",
  "Heart",
  "Crown",
  "Cookie",
  "CakeSlice",
  "Candy",
  "UtensilsCrossed",
  "Soup",
  "Sandwich",
  "Flame",
] as const;

export type MenuCategoryIconName = (typeof MENU_CATEGORY_ICON_NAMES)[number];

export const DEFAULT_MENU_CATEGORY_ICON: MenuCategoryIconName = "CupSoda";

export const MENU_CATEGORY_ICONS: Record<MenuCategoryIconName, LucideIcon> = {
  CupSoda,
  Coffee,
  GlassWater,
  Milk,
  IceCream,
  IceCreamCone,
  Snowflake,
  Droplets,
  Apple,
  Cherry,
  Citrus,
  Grape,
  Banana,
  Leaf,
  Flower2,
  Sparkles,
  Star,
  Heart,
  Crown,
  Cookie,
  CakeSlice,
  Candy,
  UtensilsCrossed,
  Soup,
  Sandwich,
  Flame,
};

export function isMenuCategoryIconName(
  value: string | null | undefined,
): value is MenuCategoryIconName {
  return (
    typeof value === "string" &&
    (MENU_CATEGORY_ICON_NAMES as readonly string[]).includes(value)
  );
}

export function getMenuCategoryIcon(
  name: string | null | undefined,
): LucideIcon {
  if (isMenuCategoryIconName(name)) return MENU_CATEGORY_ICONS[name];
  return MENU_CATEGORY_ICONS[DEFAULT_MENU_CATEGORY_ICON];
}
