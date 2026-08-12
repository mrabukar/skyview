import { apiFetch } from "@/service/client";
import type {
  UploadUrlResponse,
  UserAttachment,
  UserAttachmentListResponse,
} from "@/types/user-attachments/user-attachment";

export function listUserAttachments(
  userId: string,
): Promise<UserAttachment[]> {
  return apiFetch<UserAttachmentListResponse>(
    `/api/user-attachments?userId=${encodeURIComponent(userId)}`,
  ).then((r) => r.data);
}

export function deleteUserAttachment(id: string): Promise<void> {
  return apiFetch<void>(`/api/user-attachments/${id}`, { method: "DELETE" });
}

/**
 * Full upload flow: ask the API for a pre-signed PUT, upload the bytes straight
 * to R2, then persist metadata.
 */
export async function uploadUserAttachment(
  userId: string,
  file: File,
): Promise<UserAttachment> {
  const { key, url } = await apiFetch<UploadUrlResponse>(
    "/api/user-attachments/upload-url",
    {
      method: "POST",
      body: JSON.stringify({
        userId,
        contentType: file.type,
        size: file.size,
      }),
    },
  );

  const put = await fetch(url, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });
  if (!put.ok) {
    throw new Error("Upload to storage failed. Please try again.");
  }

  return apiFetch<UserAttachment>("/api/user-attachments", {
    method: "POST",
    body: JSON.stringify({
      userId,
      key,
      contentType: file.type,
      size: file.size,
      originalName: file.name,
    }),
  });
}
