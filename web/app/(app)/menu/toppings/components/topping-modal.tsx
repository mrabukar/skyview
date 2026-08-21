"use client";

import { useEffect, useState } from "react";
import { Dialog } from "radix-ui";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  Topping,
  CreateToppingInput,
  UpdateToppingInput,
} from "@/types/pos/menu";

const inputCls =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

const contentCls = cn(
  "fixed left-1/2 top-1/2 z-[60] grid w-full max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 border border-border bg-background p-6 shadow-lg duration-200",
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
  "sm:rounded-lg",
);

interface Props {
  open: boolean;
  mode: "add" | "edit";
  topping?: Topping;
  onClose: () => void;
  onSave: (data: CreateToppingInput | UpdateToppingInput) => void;
  isSaving: boolean;
}

export function ToppingModal({
  open,
  mode,
  topping,
  onClose,
  onSave,
  isSaving,
}: Props) {
  const [name, setName] = useState(topping?.name ?? "");
  const [price, setPrice] = useState(topping?.price ?? "0");
  const [isActive, setIsActive] = useState(topping?.isActive ?? true);
  const [errs, setErrs] = useState<{
    name?: string;
    price?: string;
  }>({});

  useEffect(() => {
    if (open) {
      setName(topping?.name ?? "");
      setPrice(topping?.price ?? "0");
      setIsActive(topping?.isActive ?? true);
      setErrs({});
    }
  }, [open, topping]);

  const validate = (): typeof errs => {
    const next: typeof errs = {};
    if (!name.trim()) next.name = "Name is required";
    const p = Number(price);
    if (isNaN(p) || p < 0) next.price = "Must be a non-negative number";
    return next;
  };

  const save = () => {
    const next = validate();
    if (Object.keys(next).length) {
      setErrs(next);
      return;
    }

    if (mode === "edit") {
      onSave({
        name: name.trim(),
        price: Number(price),
        isActive,
      } satisfies UpdateToppingInput);
    } else {
      onSave({
        name: name.trim(),
        price: Number(price),
      } satisfies CreateToppingInput);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/80" />
        <Dialog.Content className={contentCls}>
          <div className="flex flex-col gap-1.5">
            <Dialog.Title className="text-lg font-semibold leading-none tracking-tight">
              {mode === "add" ? "Add Topping" : "Edit Topping"}
            </Dialog.Title>
            <Dialog.Description className="text-sm text-muted-foreground">
              {mode === "add"
                ? "Create a new menu topping."
                : "Update topping details."}
            </Dialog.Description>
          </div>

          <div className="grid gap-4 py-2">
            {/* Name */}
            <div className="grid gap-2">
              <label className="text-sm font-medium leading-none">
                Name <span className="text-destructive">*</span>
              </label>
              <input
                className={cn(inputCls, errs.name && "border-destructive")}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setErrs((p) => ({ ...p, name: undefined }));
                }}
                placeholder="e.g. Tapioca Pearls"
                maxLength={100}
              />
              {errs.name ? (
                <p className="text-sm text-destructive">{errs.name}</p>
              ) : null}
            </div>

            {/* Price */}
            <div className="grid gap-2">
              <label className="text-sm font-medium leading-none">
                Price (KSh) <span className="text-destructive">*</span>
              </label>
              <input
                type="number"
                className={cn(inputCls, errs.price && "border-destructive")}
                value={price}
                onChange={(e) => {
                  setPrice(e.target.value);
                  setErrs((p) => ({ ...p, price: undefined }));
                }}
                min={0}
                step={0.01}
                placeholder="0.00"
              />
              {errs.price ? (
                <p className="text-sm text-destructive">{errs.price}</p>
              ) : null}
            </div>

            {/* Active toggle — edit only */}
            {mode === "edit" ? (
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium leading-none">
                  Active
                </label>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isActive}
                  onClick={() => setIsActive((prev) => !prev)}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                    isActive ? "bg-primary" : "bg-input",
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
                      isActive ? "translate-x-6" : "translate-x-1",
                    )}
                  />
                </button>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="button" onClick={save} disabled={isSaving}>
              {isSaving
                ? "Saving…"
                : mode === "add"
                  ? "Add Topping"
                  : "Save Changes"}
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
