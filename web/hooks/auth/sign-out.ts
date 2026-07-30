"use client";

/**
 * DEMO MODE — sign-out clears the local demo session.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { clearClientSession } from "@/lib/auth/query-cache";
import { clearMockSession } from "@/service/mock/handlers";
import { useAppStore } from "@/store/app";

export function useSignOut() {
  const queryClient = useQueryClient();
  const clearUser = useAppStore((s) => s.clearUser);

  return useMutation({
    onMutate: () => {
      clearUser();
      clearClientSession(queryClient);
    },
    mutationFn: async () => {
      clearMockSession();
    },
    onSettled: () => {
      clearClientSession(queryClient);
    },
  });
}
