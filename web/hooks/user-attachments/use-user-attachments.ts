"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteUserAttachment,
  listUserAttachments,
  uploadUserAttachment,
} from "@/service/user-attachments/user-attachments";

export function useUserAttachments(userId: string | null) {
  return useQuery({
    queryKey: ["user-attachments", userId] as const,
    queryFn: () => listUserAttachments(userId as string),
    enabled: Boolean(userId),
  });
}

function invalidate(
  queryClient: ReturnType<typeof useQueryClient>,
  userId?: string,
) {
  if (userId) {
    queryClient.invalidateQueries({ queryKey: ["user-attachments", userId] });
  } else {
    queryClient.invalidateQueries({ queryKey: ["user-attachments"] });
  }
}

export function useUploadUserAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, file }: { userId: string; file: File }) =>
      uploadUserAttachment(userId, file),
    onSuccess: (_data, vars) => invalidate(queryClient, vars.userId),
  });
}

export function useDeleteUserAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, userId }: { id: string; userId: string }) =>
      deleteUserAttachment(id).then(() => userId),
    onSuccess: (userId) => invalidate(queryClient, userId),
  });
}
