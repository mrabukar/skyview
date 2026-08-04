"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/service/client";
import type { PayrollStatus } from "@/types/payroll/payroll";

export function usePayrollStatus() {
  return useQuery({
    queryKey: ["payroll"] as const,
    queryFn: () => apiFetch<PayrollStatus>("/api/payroll"),
  });
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["payroll"] });
  queryClient.invalidateQueries({ queryKey: ["expenses"] });
  queryClient.invalidateQueries({ queryKey: ["reports"] });
}

/** Pay all staff not yet paid this month. */
export function useRunPayroll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<PayrollStatus>("/api/payroll", { method: "POST" }),
    onSuccess: () => invalidate(queryClient),
  });
}

/** Pay a single staff member for this month. */
export function usePayUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiFetch<PayrollStatus>(`/api/payroll/pay-user/${userId}`, { method: "POST" }),
    onSuccess: () => invalidate(queryClient),
  });
}
