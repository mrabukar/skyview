import {
  RECEIPT_CONTENT_TYPES,
  RECEIPT_EXTENSION,
  RECEIPT_MAX_SIZE,
} from "../receipts/receipt.constants";

/** Same allow-list and size cap as receipts (images + PDF, 10 MB). */
export const USER_ATTACHMENT_CONTENT_TYPES = RECEIPT_CONTENT_TYPES;
export const USER_ATTACHMENT_EXTENSION = RECEIPT_EXTENSION;
export const USER_ATTACHMENT_MAX_SIZE = RECEIPT_MAX_SIZE;
