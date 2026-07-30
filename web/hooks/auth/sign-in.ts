"use client";

/**
 * DEMO MODE — any email/password signs in.
 * Emails containing "manager" or "catherine" sign in as the Hub Karen
 * branch manager; everything else signs in as the admin.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { clearTenantQueries } from "@/lib/auth/query-cache";
import { setMockRole, setMockSignedIn } from "@/service/mock/handlers";
import { useAppStore } from "@/store/app";
import { fetchCurrentUser, SESSION_QUERY_KEY } from "./session";

export function useSignIn() {
  const queryClient = useQueryClient();
  const setUser = useAppStore((s) => s.setUser);

  return useMutation({
    onMutate: () => {
      clearTenantQueries(queryClient);
    },
    mutationFn: async ({
      email,
    }: {
      email: string;
      password: string;
      rememberMe?: boolean;
    }) => {
      // simulate a short network round-trip
      await new Promise((r) => setTimeout(r, 400));

      const lower = email.toLowerCase();
      const isManager = lower.includes("manager") || lower.startsWith("catherine");
      setMockRole(isManager ? "branch_manager" : "admin");
      setMockSignedIn();

      const user = await fetchCurrentUser();
      setUser(user);
      queryClient.setQueryData(SESSION_QUERY_KEY, user);
      return user;
    },
  });
}
