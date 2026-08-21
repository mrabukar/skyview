"use client";

import { useState } from "react";
import { Dialog } from "radix-ui";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Store } from "@/types/stores/store";

const inputCls =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

const contentCls = cn(
  "fixed left-1/2 top-1/2 z-[60] grid w-full max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 border border-border bg-background p-6 shadow-lg duration-200",
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
  "sm:rounded-lg",
);

export interface StoreFormValues {
  name: string;
  address: string;
  posEnabled?: boolean;
}

interface Props {
  open: boolean;
  initial?: Store;
  onClose: () => void;
  onSave: (data: StoreFormValues) => void;
  isSaving: boolean;
}

export function StoreModal({ open, initial, onClose, onSave, isSaving }: Props) {
  const isEdit = Boolean(initial);

  const [form, setForm] = useState<StoreFormValues>({
    name: initial?.name ?? "",
    address: initial?.address ?? "",
    posEnabled: initial?.posEnabled ?? false,
  });
  const [err, setErr] = useState<Partial<Record<"name" | "address", string>>>({});

  const set = (key: "name" | "address", value: string) =>
    setForm((s) => ({ ...s, [key]: value }));

  const save = () => {
    const next: Partial<Record<"name" | "address", string>> = {};
    if (!form.name.trim()) next.name = "Name is required";
    if (!form.address.trim()) next.address = "Address is required";
    setErr(next);
    if (Object.keys(next).length) return;
    onSave(form);
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/80" />
        <Dialog.Content className={contentCls}>
          <div className="flex flex-col gap-1.5 text-left">
            <Dialog.Title className="text-lg font-semibold leading-none tracking-tight">
              {initial ? "Edit Branch" : "Add Branch"}
            </Dialog.Title>
            <Dialog.Description className="text-sm text-muted-foreground">
              {initial ? "Update the branch details below." : "Fill in the details for the new branch."}
            </Dialog.Description>
          </div>

          <div className="grid gap-4 py-2">
            {/* Name */}
            <div className="grid gap-2">
              <label className="text-sm font-medium leading-none">
                Branch name <span className="text-destructive">*</span>
              </label>
              <input
                className={cn(inputCls, err.name && "border-destructive")}
                value={form.name}
                onChange={(e) => {
                  set("name", e.target.value);
                  setErr((v) => ({ ...v, name: undefined }));
                }}
                placeholder="e.g. Main Branch"
                maxLength={100}
              />
              {err.name && <p className="text-sm text-destructive">{err.name}</p>}
            </div>

            {/* Address */}
            <div className="grid gap-2">
              <label className="text-sm font-medium leading-none">
                Address <span className="text-destructive">*</span>
              </label>
              <textarea
                className={cn(
                  inputCls,
                  "min-h-[80px] resize-y py-2",
                  err.address && "border-destructive",
                )}
                value={form.address}
                onChange={(e) => {
                  set("address", e.target.value);
                  setErr((v) => ({ ...v, address: undefined }));
                }}
                placeholder="e.g. 123 Main St, City"
                maxLength={255}
              />
              {err.address && <p className="text-sm text-destructive">{err.address}</p>}
            </div>

            {/* POS toggle — only shown when editing an existing branch */}
            {isEdit && (
              <div className="flex items-center justify-between rounded-md border border-input bg-muted/30 px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium text-foreground">Enable POS</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Revenue recorded via POS orders — disables manual daily-sales entry
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.posEnabled}
                  onClick={() =>
                    setForm((s) => ({ ...s, posEnabled: !s.posEnabled }))
                  }
                  disabled={isSaving}
                  className={cn(
                    "relative ml-4 inline-flex h-5 w-9 flex-shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    form.posEnabled ? "bg-primary" : "bg-input",
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow-lg ring-0 transition-transform",
                      form.posEnabled ? "translate-x-4" : "translate-x-0",
                    )}
                  />
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="button" onClick={save} disabled={isSaving}>
              {isSaving ? "Saving…" : initial ? "Save changes" : "Add Branch"}
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
