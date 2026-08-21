/** Canonical stored menu-item photo. Keep in sync with api/src/modules/menu-items/menu-item-image.constants.ts */

export const MENU_ITEM_IMAGE_WIDTH = 600;
export const MENU_ITEM_IMAGE_HEIGHT = 800;
export const MENU_ITEM_IMAGE_MAX_BYTES = 1 * 1024 * 1024;
export const MENU_ITEM_IMAGE_SOURCE_MAX_BYTES = 10 * 1024 * 1024;

export const MENU_ITEM_IMAGE_STORED_TYPES = [
  "image/png",
  "image/webp",
] as const;

export const MENU_ITEM_IMAGE_SOURCE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const MENU_ITEM_IMAGE_HINT =
  "Recommended 600 × 800 px · 3:4 · PNG/WebP · Max 1 MB";

export const MENU_ITEM_IMAGE_SIZE_ERROR =
  "Menu images must be 600 × 800 px (3:4 portrait).";

export type CropPixels = { x: number; y: number; width: number; height: number };

export function validateMenuImageSource(file: File): string | null {
  if (
    !(MENU_ITEM_IMAGE_SOURCE_TYPES as readonly string[]).includes(file.type)
  ) {
    return "Only JPG, PNG, or WebP images are accepted.";
  }
  if (file.size > MENU_ITEM_IMAGE_SOURCE_MAX_BYTES) {
    return "Source image must be under 10 MB.";
  }
  return null;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read that image."));
    img.src = src;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("Could not export the image."));
        else resolve(blob);
      },
      type,
      quality,
    );
  });
}

/**
 * Draw the 3:4 frame into a 600×800 PNG with a transparent background.
 * Uses contain (not cover): if the source doesn't fill the frame, the extra
 * space stays transparent so the menu card can show through.
 */
export async function exportMenuItemImage(
  imageSrc: string,
  crop: CropPixels,
): Promise<File> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = MENU_ITEM_IMAGE_WIDTH;
  canvas.height = MENU_ITEM_IMAGE_HEIGHT;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) throw new Error("Could not export the image.");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const scaleX = MENU_ITEM_IMAGE_WIDTH / crop.width;
  const scaleY = MENU_ITEM_IMAGE_HEIGHT / crop.height;
  const srcX = Math.max(0, crop.x);
  const srcY = Math.max(0, crop.y);
  const srcW =
    Math.min(image.naturalWidth, crop.x + crop.width) - srcX;
  const srcH =
    Math.min(image.naturalHeight, crop.y + crop.height) - srcY;
  if (srcW <= 0 || srcH <= 0) {
    throw new Error("Could not crop that image.");
  }

  ctx.drawImage(
    image,
    srcX,
    srcY,
    srcW,
    srcH,
    (srcX - crop.x) * scaleX,
    (srcY - crop.y) * scaleY,
    srcW * scaleX,
    srcH * scaleY,
  );

  const png = await canvasToBlob(canvas, "image/png");
  if (png.size <= MENU_ITEM_IMAGE_MAX_BYTES) {
    return new File([png], "menu-item.png", { type: "image/png" });
  }

  const webp = await canvasToBlob(canvas, "image/webp", 0.9);
  if (webp.size <= MENU_ITEM_IMAGE_MAX_BYTES) {
    return new File([webp], "menu-item.webp", { type: "image/webp" });
  }

  throw new Error("Exported image is over 1 MB. Try a simpler photo.");
}
