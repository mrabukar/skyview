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
