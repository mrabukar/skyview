"use client";

import { useQuery } from "@tanstack/react-query";
import { getVendorSpend } from "@/service/reports/vendor-spend";
import type { VendorSpendQuery } from "@/types/reports/vendor-spend";

export function useVendorSpend(params: VendorSpendQuery) {
  return useQuery({
    queryKey: ["reports", "vendor-spend", params] as const,
    queryFn: () => getVendorSpend(params),
  });
}
