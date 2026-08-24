"use client";

import { useQuery } from "@tanstack/react-query";
import { listExpenses, listExpenseTotals } from "@/service/expenses/list-expenses";
import type { ExpenseListQuery } from "@/types/expenses/expense";

export const expensesQueryKey = (params: ExpenseListQuery = {}) =>
  ["expenses", params] as const;

export const expenseTotalsQueryKey = (params: ExpenseListQuery = {}) =>
  ["expenses", "totals", params] as const;

export function useExpenses(params: ExpenseListQuery = {}) {
  return useQuery({
    queryKey: expensesQueryKey(params),
    queryFn: () => listExpenses(params),
  });
}

export function useExpenseTotals(
  params: ExpenseListQuery = {},
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: expenseTotalsQueryKey(params),
    queryFn: () => listExpenseTotals(params),
    enabled: options?.enabled,
  });
}
