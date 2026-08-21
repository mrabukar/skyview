"use client";

import { ArrowRight, Minus, Plus, Trash2, X } from "lucide-react";

import { MenuItemImage } from "@/components/pos/menu-item-image";
import { Button } from "@/components/ui/button";
import {
  usePosStore,
  selectCartSubtotal,
  selectCartTotal,
} from "@/store/pos-store";

interface Props {
  onDiscount: () => void;
  onPay: () => void;
  isPlacingOrder?: boolean;
}

function fmtKsh(n: number): string {
  return `KSh ${n.toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Right-side current-order pane — thumbnails, qty, totals, and Pay.
 */
export function OrderPanel({ onDiscount, onPay, isPlacingOrder }: Props) {
  const lines = usePosStore((s) => s.lines);
  const discountType = usePosStore((s) => s.discountType);
  const discountValue = usePosStore((s) => s.discountValue);
  const updateLineQty = usePosStore((s) => s.updateLineQty);
  const removeLine = usePosStore((s) => s.removeLine);
  const clearCart = usePosStore((s) => s.clearCart);

  const subtotal = selectCartSubtotal(lines);
  const total = selectCartTotal(lines, discountType, discountValue);

  const discountLabel =
    discountType === "percentage"
      ? `Discount (${discountValue}%)`
      : discountType === "fixed"
        ? "Discount"
        : null;
  const discountAmount = subtotal - total;
  const hasDiscount = Boolean(discountLabel && discountAmount > 0);

  const isEmpty = lines.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2">
        <h2 className="text-sm font-semibold">
          Current Order
          {!isEmpty ? (
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
              ({lines.length})
            </span>
          ) : null}
        </h2>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:pointer-events-none disabled:opacity-40"
          onClick={clearCart}
          disabled={isEmpty}
        >
          <Trash2 size={12} />
          Clear All
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 px-3 text-center text-muted-foreground">
            <p className="text-sm">No items yet</p>
            <p className="text-xs">Tap an item from the menu to add it.</p>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {lines.map((line, idx) => {
              const toppingCost = line.toppings.reduce(
                (s, t) => s + t.price,
                0,
              );
              const lineTotal = (line.unitPrice + toppingCost) * line.quantity;
              return (
                <li
                  key={idx}
                  className="flex items-center gap-2 rounded-lg bg-muted/70 px-2 py-1.5"
                >
                  <MenuItemImage
                    imageKey={line.imageKey}
                    alt={line.itemName}
                    className="size-9 shrink-0 rounded-md bg-background"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-1.5">
                      <p className="truncate text-xs font-medium leading-tight">
                        {line.itemName}
                      </p>
                      <div className="flex shrink-0 items-center gap-0.5">
                        <span className="text-xs font-semibold tabular-nums">
                          {fmtKsh(lineTotal)}
                        </span>
                        <button
                          type="button"
                          className="flex size-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                          aria-label={`Remove ${line.itemName}`}
                          onClick={() => removeLine(idx)}
                        >
                          <X size={11} />
                        </button>
                      </div>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      {line.sizeName ? (
                        <p className="min-w-0 truncate text-[10px] capitalize leading-none text-muted-foreground">
                          {line.sizeName}
                        </p>
                      ) : (
                        <span />
                      )}
                      <div className="inline-flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          className="flex size-8 items-center justify-center rounded-md border border-border bg-background text-foreground shadow-sm transition-colors hover:bg-muted"
                          aria-label="Decrease quantity"
                          onClick={() => updateLineQty(idx, line.quantity - 1)}
                        >
                          <Minus size={14} strokeWidth={2.25} />
                        </button>
                        <span className="min-w-6 text-center text-sm font-semibold tabular-nums">
                          {line.quantity}
                        </span>
                        <button
                          type="button"
                          className="flex size-8 items-center justify-center rounded-md border border-border bg-background text-foreground shadow-sm transition-colors hover:bg-muted"
                          aria-label="Increase quantity"
                          onClick={() => updateLineQty(idx, line.quantity + 1)}
                        >
                          <Plus size={14} strokeWidth={2.25} />
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="shrink-0 border-t border-border px-3 py-3">
        <div className="mb-2.5 grid gap-1 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="tabular-nums">{fmtKsh(subtotal)}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Discount</span>
            {hasDiscount ? (
              <button
                type="button"
                className="text-xs font-medium text-destructive tabular-nums hover:underline"
                onClick={onDiscount}
              >
                &minus;{fmtKsh(discountAmount)}
                {discountLabel ? (
                  <span className="ml-1 text-[10px] text-muted-foreground">
                    (
                    {discountType === "percentage"
                      ? `${discountValue}%`
                      : "fixed"}
                    )
                  </span>
                ) : null}
              </button>
            ) : (
              <button
                type="button"
                className="text-xs font-medium text-primary hover:underline disabled:pointer-events-none disabled:opacity-40"
                onClick={onDiscount}
                disabled={isEmpty}
              >
                Add discount
              </button>
            )}
          </div>

          <div className="mt-0.5 flex items-center justify-between rounded-md bg-muted px-2.5 py-1.5">
            <span className="text-xs font-semibold">Total</span>
            <span className="text-sm font-bold tabular-nums">{fmtKsh(total)}</span>
          </div>
        </div>

        <Button
          type="button"
          size="lg"
          className="h-10 w-full justify-between px-3 text-sm font-semibold"
          onClick={onPay}
          disabled={isEmpty || isPlacingOrder}
        >
          {isPlacingOrder ? "Creating…" : `Pay ${fmtKsh(total)}`}
          <ArrowRight size={15} />
        </Button>
      </div>
    </div>
  );
}
