/** Accepted receipt file types and their extensions. */
export const RECEIPT_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export type ReceiptContentType = (typeof RECEIPT_CONTENT_TYPES)[number];

export const RECEIPT_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

/** Max receipt size in bytes (10 MB). */
export const RECEIPT_MAX_SIZE = 10 * 1024 * 1024;
