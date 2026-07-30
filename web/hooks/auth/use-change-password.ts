"use client";

/**
 * DEMO MODE — password change is simulated, then signs the user out
 * like the real flow would.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { clearClientSession } from "@/lib/auth/query-cache";
import { clearMockSession } from "@/service/mock/handlers";
import { useAppStore } from "@/store/app";

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export function useChangePassword() {
  const queryClient = useQueryClient();
  const clearUser = useAppStore((s) => s.clearUser);

  return useMutation({
    mutationFn: async (_input: ChangePasswordInput) => {
      await new Promise((r) => setTimeout(r, 400));
      clearUser();
      clearClientSession(queryClient);
      clearMockSession();
      return { status: true };
    },
  });
}
