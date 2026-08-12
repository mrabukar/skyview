import type { PaginatedResponse } from "@/types/common/pagination";

export interface UserAttachment {
  id: string;
  userId: string;
  userName: string | null;
  originalName: string;
  contentType: string;
  size: number;
  uploadedByName: string | null;
  createdAt: string;
  /** Short-lived pre-signed GET URL for viewing/downloading. */
  url: string;
}

export type UserAttachmentListResponse = PaginatedResponse<UserAttachment>;

export interface UploadUrlResponse {
  key: string;
  url: string;
  expiresIn: number;
}

/** Same allow-list as receipts (images + PDF). */
export const USER_ATTACHMENT_ACCEPT =
  "image/jpeg,image/png,image/webp,application/pdf";
export const USER_ATTACHMENT_MAX_SIZE = 10 * 1024 * 1024;
