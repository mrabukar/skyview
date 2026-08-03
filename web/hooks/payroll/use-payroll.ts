"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/service/client";
import type { PayrollRun, PayrollStatus, RunPayrollInput } from "@/types/payroll/payroll";

export function usePayrollStatus() {
  return useQuery({
    queryKey: ["payroll"] as const,
    queryFn: () => apiFetch<PayrollStatus>("/api/payroll"),
  });
}

export function useRunPayroll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RunPayrollInput) =>
      apiFetch<PayrollRun>("/api/payroll", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}
