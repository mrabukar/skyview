"use client";

import { useState } from "react";
import { Dialog } from "radix-ui";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUpdateBranchMenuItem } from "@/hooks/pos/use-branch-menu";
import { useAppStore } from "@/store/app";
import type { BranchMenuItemConfig } from "@/types/pos/branch-menu";

const inputCls =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

const contentCls = cn(
  "fixed left-1/2 top-1/2 z-[60] grid w-full max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 border border-border bg-background p-6 shadow-lg duration-200",
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
  "sm:rounded-lg",
);

interface Props {
  open: boolean;
  branchId: string;
  item: BranchMenuItemConfig;
  onClose: () => void;
}

/** Modal to set per-size price overrides for a branch menu item. */
export function ItemPricesModal({ open, branchId, item, onClose }: Props) {
  const addToast = useAppStore((s) => s.addToast);
  const addErrorToast = useAppStore((s) => s.addErrorToast);
  const updateItem = useUpdateBranchMenuItem(branchId);

  const activeSizes = item.sizes.filter((s) => s.isActive);

  // Local price state: sizeId → override string ("" = use base, numeric string = override)
  const [prices, setPrices] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const size of activeSizes) {
      init[size.sizeId] = size.branchPrice !== null ? String(size.branchPrice) : "";
    }
    return init;
  });

  const setPrice = (sizeId: string, value: string) =>
    setPrices((p) => ({ ...p, [sizeId]: value }));

  const handleSave = async () => {
    // Build the prices payload
    const pricePayload = activeSizes.map((size) => {
      const raw = prices[size.sizeId]?.trim() ?? "";
      const parsed = raw === "" ? null : parseFloat(raw);
      if (parsed !== null && (isNaN(parsed) || parsed < 0)) return null; // invalid
      return { sizeId: size.sizeId, price: parsed };
    });

    // Bail if any value is invalid
    if (pricePayload.some((p) => p === null)) {
      addErrorToast({ title: "Invalid price", sub: "Enter a positive number or leave blank to use the base price." });
      return;
    }

    try {
      await updateItem.mutateAsync({
        menuItemId: item.menuItemId,
        data: { prices: pricePayload as { sizeId: string; price: number | null }[] },
      });
      addToast({ title: "Prices updated" });
      onClose();
    } catch (e) {
      addErrorToast({
        title: "Failed to update prices",
        sub: e instanceof Error ? e.message : "Something went wrong",
      });
    }
  };

  const isSaving = updateItem.isPending;

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/80" />
        <Dialog.Content className={contentCls}>
          <div className="flex flex-col gap-1.5 text-left">
            <Dialog.Title className="text-lg font-semibold leading-none tracking-tight">
              Price Overrides
            </Dialog.Title>
            <Dialog.Description className="text-sm text-muted-foreground">
              Set branch-specific prices for <span className="font-medium text-foreground">{item.itemName}</span>.
              Leave a field blank to use the org-wide base price.
            </Dialog.Description>
          </div>

          <div className="grid gap-3 py-1">
            {activeSizes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active sizes for this item.</p>
            ) : (
              activeSizes.map((size) => (
                <div key={size.sizeId} className="grid gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-foreground">
                      {size.sizeName}
                    </label>
                    <span className="text-xs text-muted-foreground">
                      Base: KSh {Number(size.basePrice).toLocaleString("en-KE", { minimumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs text-muted-foreground">
                      KSh
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className={cn(inputCls, "pl-10")}
                      placeholder={`${Number(size.basePrice).toLocaleString("en-KE", { minimumFractionDigits: 0 })} (base)`}
                      value={prices[size.sizeId] ?? ""}
                      onChange={(e) => setPrice(size.sizeId, e.target.value)}
                      disabled={isSaving}
                    />
                    {prices[size.sizeId] ? (
                      <button
                        type="button"
                        onClick={() => setPrice(size.sizeId, "")}
                        className="absolute inset-y-0 right-2.5 flex items-center text-muted-foreground hover:text-foreground"
                        title="Revert to base price"
                      >
                        <X size={14} />
                      </button>
                    ) : null}
                  </div>
                  {prices[size.sizeId] ? (
                    <p className="text-xs text-primary">
                      Branch price: KSh {Number(prices[size.sizeId]).toLocaleString("en-KE", { minimumFractionDigits: 0 })}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Using base price</p>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleSave()} disabled={isSaving || activeSizes.length === 0}>
              {isSaving ? "Saving…" : "Save prices"}
            </Button>
          </div>

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
