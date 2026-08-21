"use client";

import { useQuery } from "@tanstack/react-query";
import { getCurrentMonthRange } from "@/lib/filters/dates";
import {
  getPosSummary,
  getPosItemSales,
  getPosCashierPerformance,
} from "@/service/pos/reports";
import type { PosReportQuery } from "@/types/pos/reports";

const defaultQuery = (): PosReportQuery => getCurrentMonthRange();

export const posSummaryQueryKey = (params: PosReportQuery = defaultQuery()) =>
  ["reports", "pos-summary", params] as const;

export const posItemSalesQueryKey = (params: PosReportQuery = defaultQuery()) =>
  ["reports", "pos-items", params] as const;

export const posCashierPerfQueryKey = (
  params: PosReportQuery = defaultQuery(),
) => ["reports", "pos-cashier-performance", params] as const;

export function usePosSummary(params: PosReportQuery = defaultQuery()) {
  return useQuery({
    queryKey: posSummaryQueryKey(params),
    queryFn: () => getPosSummary(params),
  });
}

export function usePosItemSales(params: PosReportQuery = defaultQuery()) {
  return useQuery({
    queryKey: posItemSalesQueryKey(params),
    queryFn: () => getPosItemSales(params),
  });
}

export function usePosCashierPerformance(
  params: PosReportQuery = defaultQuery(),
) {
  return useQuery({
    queryKey: posCashierPerfQueryKey(params),
    queryFn: () => getPosCashierPerformance(params),
  });
}
