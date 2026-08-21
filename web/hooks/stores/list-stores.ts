"use client";

import { useQuery } from "@tanstack/react-query";
import { listStores } from "@/service/stores/list-stores";
import type { StoreListQuery } from "@/types/stores/store";

export const storesQueryKey = (params: StoreListQuery = {}) =>
  ["stores", params] as const;

export function useStores(
  params: StoreListQuery = {},
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: storesQueryKey(params),
    queryFn: () => listStores(params),
    ...(options?.enabled === false && { enabled: false }),
  });
}
