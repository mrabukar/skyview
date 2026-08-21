/** Canonical stored menu-item photo. Keep in sync with web/lib/pos/menu-item-image.ts */

export const MENU_ITEM_IMAGE_WIDTH = 600;
export const MENU_ITEM_IMAGE_HEIGHT = 800;

/** Stored uploads only — JPEG is allowed as a crop source on the client. */
export const MENU_ITEM_IMAGE_CONTENT_TYPES = [
  "image/png",
  "image/webp",
] as const;

export const MENU_ITEM_IMAGE_MAX_SIZE = 1 * 1024 * 1024;

export const MENU_ITEM_IMAGE_EXTENSION: Record<string, string> = {
  "image/png": "png",
  "image/webp": "webp",
};

export const MENU_ITEM_IMAGE_SIZE_ERROR =
  "Menu images must be 600 × 800 px (3:4 portrait).";
