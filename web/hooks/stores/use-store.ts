"use client";

import { useQuery } from "@tanstack/react-query";
import { getStore } from "@/service/stores/get-store";

export const storeQueryKey = (storeId: string) => ["store", storeId] as const;

export function useStore(storeId: string | undefined) {
  return useQuery({
    queryKey: storeQueryKey(storeId ?? ""),
    queryFn: () => getStore(storeId!),
    enabled: Boolean(storeId),
  });
}
