"use client";

import { UtensilsCrossed } from "lucide-react";
import { useMenuItemImageUrl } from "@/hooks/pos/use-menu-item-image";
import { cn } from "@/lib/utils";

interface Props {
  imageKey: string | null | undefined;
  alt?: string;
  /** Tailwind size classes, defaults to "h-10 w-10". */
  className?: string;
}

/**
 * Renders a menu item image from R2 (via presigned URL), falling back to an
 * icon placeholder when no image is available. Always object-contain inside
 * the parent frame so the cup is never cropped; the card supplies the background.
 */
export function MenuItemImage({
  imageKey,
  alt = "",
  className = "h-10 w-10",
}: Props) {
  const url = useMenuItemImageUrl(imageKey);

  if (!imageKey) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-md bg-muted text-muted-foreground",
          className,
        )}
      >
        <UtensilsCrossed size={16} className="opacity-50" />
      </div>
    );
  }

  if (!url) {
    return (
      <div className={cn("animate-pulse rounded-md bg-muted", className)} />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      className={cn("rounded-md object-contain", className)}
    />
  );
}
