"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getPosSummary,
  getPosItems,
  getPosCashierPerformance,
} from "@/service/reports/pos-reports";
import type { PosReportQuery } from "@/types/reports/pos-reports";

export const posSummaryQueryKey = (params: PosReportQuery) =>
  ["reports", "pos-summary", params] as const;

export const posItemsQueryKey = (params: PosReportQuery) =>
  ["reports", "pos-items", params] as const;

export const posCashierQueryKey = (params: PosReportQuery) =>
  ["reports", "pos-cashier-performance", params] as const;

export function usePosSummary(params: PosReportQuery) {
  return useQuery({
    queryKey: posSummaryQueryKey(params),
    queryFn: () => getPosSummary(params),
  });
}

export function usePosItems(params: PosReportQuery) {
  return useQuery({
    queryKey: posItemsQueryKey(params),
    queryFn: () => getPosItems(params),
  });
}

export function usePosCashierPerformance(params: PosReportQuery) {
  return useQuery({
    queryKey: posCashierQueryKey(params),
    queryFn: () => getPosCashierPerformance(params),
  });
}
