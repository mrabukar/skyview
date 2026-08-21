"use client";

import { Dialog } from "radix-ui";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import type {
  BranchMenuItemConfig,
  BranchMenuItemSizeConfig,
} from "@/types/pos/branch-menu";

const contentCls = cn(
  "fixed left-1/2 top-1/2 z-[60] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 border border-border bg-background p-6 shadow-lg duration-200",
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
  "sm:rounded-lg",
);

function fmtPrice(price: string): string {
  const n = Number(price);
  return isNaN(n)
    ? price
    : `KSh ${n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface Props {
  open: boolean;
  item: BranchMenuItemConfig;
  onSelect: (size: BranchMenuItemSizeConfig) => void;
  onClose: () => void;
}

/**
 * Step 1 of the item-tap flow: pick a size.
 * Shows only active sizes with their effective branch price.
 */
export function SizePickerModal({ open, item, onSelect, onClose }: Props) {
  const activeSizes = item.sizes.filter((s) => s.isActive);

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/80" />
        <Dialog.Content className={contentCls}>
          <div className="mb-4 flex flex-col gap-1">
            <Dialog.Title className="text-lg font-semibold leading-none tracking-tight">
              {item.itemName}
            </Dialog.Title>
            <Dialog.Description className="text-sm text-muted-foreground">
              Choose a size to continue.
            </Dialog.Description>
          </div>

          {activeSizes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No sizes available for this item.
            </p>
          ) : (
            <div className="grid gap-2">
              {activeSizes.map((size) => (
                <button
                  key={size.sizeId}
                  type="button"
                  className="flex items-center justify-between rounded-lg border border-border px-4 py-3 text-left transition-colors hover:bg-muted"
                  onClick={() => onSelect(size)}
                >
                  <span className="font-medium">{size.sizeName}</span>
                  <span className="text-muted-foreground">
                    {fmtPrice(size.effectivePrice)}
                  </span>
                </button>
              ))}
            </div>
          )}

          <Dialog.Close
            type="button"
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100"
            onClick={onClose}
          >
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
