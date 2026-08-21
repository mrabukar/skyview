"use client";

import { useQuery } from "@tanstack/react-query";
import { getMenuItemImageUrl } from "@/service/pos/menu-items";

/**
 * Fetches a presigned GET URL for a menu item image.
 * Returns the URL string or null while loading / if no image.
 * Presigned URLs expire in ~5 min; staleTime of 4 min triggers a refresh
 * before expiry while keeping the cache warm for repeated renders.
 */
export function useMenuItemImageUrl(imageKey: string | null | undefined) {
  const { data } = useQuery({
    queryKey: ["menu-item-image", imageKey],
    queryFn: () => getMenuItemImageUrl(imageKey!),
    enabled: Boolean(imageKey),
    staleTime: 4 * 60 * 1000, // 4 minutes
    gcTime: 5 * 60 * 1000,    // 5 minutes
  });

  return imageKey ? (data?.url ?? null) : null;
}
