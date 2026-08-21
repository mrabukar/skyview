"use client";

import { useEffect, useState } from "react";
import { Dialog } from "radix-ui";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DiscountType } from "@/types/pos/order";

const inputCls =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

const contentCls = cn(
  "fixed left-1/2 top-1/2 z-[60] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 border border-border bg-background p-6 shadow-lg duration-200",
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
  "sm:rounded-lg grid gap-4",
);

interface Props {
  open: boolean;
  /** Current discount state to pre-populate. */
  currentType: DiscountType | null;
  currentValue: number | null;
  /** Maximum allowed percentage discount for this cashier (null = no cap). */
  maxDiscountPercent: number | null;
  onApply: (type: DiscountType, value: number) => void;
  onRemove: () => void;
  onClose: () => void;
}

export function DiscountModal({
  open,
  currentType,
  currentValue,
  maxDiscountPercent,
  onApply,
  onRemove,
  onClose,
}: Props) {
  const [type, setType] = useState<DiscountType>(currentType ?? "percentage");
  const [value, setValue] = useState(String(currentValue ?? ""));
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setType(currentType ?? "percentage");
      setValue(String(currentValue ?? ""));
      setErr(null);
    }
  }, [open, currentType, currentValue]);

  const handleApply = () => {
    const n = Number(value);
    if (isNaN(n) || n <= 0) {
      setErr("Enter a positive discount value");
      return;
    }
    if (type === "percentage") {
      if (n > 100) {
        setErr("Percentage cannot exceed 100");
        return;
      }
      if (maxDiscountPercent !== null && n > maxDiscountPercent) {
        setErr(
          `Your maximum allowed discount is ${maxDiscountPercent}%`,
        );
        return;
      }
    }
    onApply(type, n);
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/80" />
        <Dialog.Content className={contentCls}>
          <div className="flex flex-col gap-1">
            <Dialog.Title className="text-lg font-semibold leading-none tracking-tight">
              Apply Discount
            </Dialog.Title>
            <Dialog.Description className="text-sm text-muted-foreground">
              {maxDiscountPercent !== null
                ? `Max ${maxDiscountPercent}% percentage discount allowed.`
                : "Enter the discount to apply to this order."}
            </Dialog.Description>
          </div>

          <div className="grid gap-4">
            {/* Type toggle */}
            <div className="flex rounded-md border border-border overflow-hidden">
              {(["percentage", "fixed"] as DiscountType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setType(t);
                    setErr(null);
                  }}
                  className={cn(
                    "flex-1 py-2 text-sm transition-colors",
                    type === t
                      ? "bg-primary text-primary-foreground font-medium"
                      : "bg-background text-foreground hover:bg-muted",
                  )}
                >
                  {t === "percentage" ? "Percentage (%)" : "Fixed (KSh)"}
                </button>
              ))}
            </div>

            {/* Value input */}
            <div className="grid gap-2">
              <label className="text-sm font-medium leading-none">
                {type === "percentage" ? "Discount %" : "Discount Amount (KSh)"}
              </label>
              <input
                type="number"
                className={cn(inputCls, err && "border-destructive")}
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  setErr(null);
                }}
                min={0}
                step={type === "percentage" ? 1 : 0.01}
                placeholder={type === "percentage" ? "e.g. 10" : "e.g. 50.00"}
                autoFocus
              />
              {err ? (
                <p className="text-sm text-destructive">{err}</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <div>
              {currentType !== null ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onRemove}
                  className="text-destructive hover:text-destructive"
                >
                  Remove discount
                </Button>
              ) : null}
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button type="button" onClick={handleApply}>
                Apply
              </Button>
            </div>
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
