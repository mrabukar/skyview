"use client";

import { useEffect, useState } from "react";
import { Dialog } from "radix-ui";
import { Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BranchToppingConfig } from "@/types/pos/branch-menu";
import type { CartTopping } from "@/types/pos/order";

const contentCls = cn(
  "fixed left-1/2 top-1/2 z-[60] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 border border-border bg-background p-6 shadow-lg duration-200",
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
  "sm:rounded-lg flex flex-col gap-4",
);

function fmtPrice(price: string): string {
  const n = Number(price);
  return isNaN(n) ? price : `+KSh ${n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface Props {
  open: boolean;
  toppings: BranchToppingConfig[];
  onConfirm: (selected: CartTopping[]) => void;
  onClose: () => void;
}

/**
 * Step 2 of the item-tap flow: optional topping selection.
 * "Skip" and "No toppings" both proceed with an empty selection.
 */
export function ToppingSelectorModal({
  open,
  toppings,
  onConfirm,
  onClose,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Reset selection each time the modal opens.
  useEffect(() => {
    if (open) setSelected(new Set());
  }, [open]);

  const inStock = toppings.filter((t) => t.isInStock);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    const result = inStock
      .filter((t) => selected.has(t.toppingId))
      .map<CartTopping>((t) => ({
        id: t.toppingId,
        name: t.name,
        price: Number(t.price),
      }));
    onConfirm(result);
  };

  const selCount = selected.size;

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/80" />
        <Dialog.Content className={contentCls}>
          <div className="flex flex-col gap-1">
            <Dialog.Title className="text-lg font-semibold leading-none tracking-tight">
              Add Toppings
            </Dialog.Title>
            <Dialog.Description className="text-sm text-muted-foreground">
              Select any toppings (optional).
            </Dialog.Description>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {inStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No toppings available.
              </p>
            ) : (
              <div className="grid gap-2">
                {inStock.map((topping) => {
                  const isOn = selected.has(topping.toppingId);
                  return (
                    <button
                      key={topping.toppingId}
                      type="button"
                      onClick={() => toggle(topping.toppingId)}
                      className={cn(
                        "flex items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors",
                        isOn
                          ? "border-primary bg-primary/10"
                          : "border-border hover:bg-muted",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                            isOn
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border",
                          )}
                        >
                          {isOn ? <Check size={11} /> : null}
                        </div>
                        <span className="text-sm">{topping.name}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {fmtPrice(topping.price)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onConfirm([])}>
              Skip
            </Button>
            <Button type="button" onClick={handleConfirm}>
              {selCount > 0
                ? `Add ${selCount} topping${selCount > 1 ? "s" : ""}`
                : "No toppings"}
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
