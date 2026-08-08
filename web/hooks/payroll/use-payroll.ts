"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/service/client";
import type { PayrollStatus } from "@/types/payroll/payroll";

/** `?month=YYYY-MM` suffix, or "" for the current month. */
function monthQuery(month: string): string {
  return month ? `?month=${month}` : "";
}

export function usePayrollStatus(month: string) {
  return useQuery({
    queryKey: ["payroll", month || "current"] as const,
    queryFn: () => apiFetch<PayrollStatus>(`/api/payroll${monthQuery(month)}`),
  });
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["payroll"] });
  queryClient.invalidateQueries({ queryKey: ["expenses"] });
  queryClient.invalidateQueries({ queryKey: ["reports"] });
}

/** Pay all staff not yet paid for the selected month. */
export function useRunPayroll(month: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<PayrollStatus>(`/api/payroll${monthQuery(month)}`, {
        method: "POST",
      }),
    onSuccess: () => invalidate(queryClient),
  });
}

/** Pay a single staff member for the selected month. */
export function usePayUser(month: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiFetch<PayrollStatus>(
        `/api/payroll/pay-user/${userId}${monthQuery(month)}`,
        { method: "POST" },
      ),
    onSuccess: () => invalidate(queryClient),
  });
}
