"use client";

import { useMemo, useState } from "react";
import { Dialog } from "radix-ui";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { dateToYmd } from "@/lib/filters/dates";
import { cn } from "@/lib/utils";
import type { DailySale } from "@/types/daily-sales/daily-sale";

const inputClassName =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

const dialogContentClassName = cn(
  "fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 border border-border bg-background p-6 shadow-lg duration-200 sm:max-h-[90vh] sm:overflow-y-auto",
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
  "sm:rounded-lg",
);

export interface DailySaleFormValues {
  storeId: string | undefined;
  saleDate: string;
  totalAmount: string;
  note: string;
}

interface Props {
  open: boolean;
  mode: "add" | "edit";
  sale?: DailySale;
  isAdmin: boolean;
  storeItems: { value: string; label: string }[];
  onClose: () => void;
  onSave: (data: DailySaleFormValues) => void;
  isSaving: boolean;
}

function FormField({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <label className="text-sm font-medium leading-none">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </label>
      {children}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

export function DailySaleModal({
  open,
  mode,
  sale,
  isAdmin,
  storeItems,
  onClose,
  onSave,
  isSaving,
}: Props) {
  const isEdit = mode === "edit";
  const today = useMemo(() => dateToYmd(new Date()), []);
  const [form, setForm] = useState<DailySaleFormValues>(() => ({
    storeId: sale?.storeId ?? undefined,
    saleDate: sale?.saleDate ?? today,
    totalAmount: sale ? String(sale.totalAmount) : "",
    note: sale?.note ?? "",
  }));
  const [err, setErr] = useState<Partial<Record<keyof DailySaleFormValues, string>>>({});

  const set = (key: keyof DailySaleFormValues, value: string | undefined) =>
    setForm((state) => ({ ...state, [key]: value }));

  const save = () => {
    const next: Partial<Record<keyof DailySaleFormValues, string>> = {};
    if (isAdmin && !isEdit && !form.storeId) next.storeId = "Branch is required";
    if (!form.saleDate) next.saleDate = "Date is required";
    else if (form.saleDate > today) next.saleDate = "Date cannot be in the future";
    if (!form.totalAmount || Number(form.totalAmount) <= 0)
      next.totalAmount = "Enter a positive amount";
    setErr(next);
    if (Object.keys(next).length) return;
    onSave(form);
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className={dialogContentClassName}>
          <div className="flex flex-col gap-1.5 text-left">
            <Dialog.Title className="text-lg font-semibold leading-none tracking-tight">
              {isEdit ? "Edit Sales Entry" : "Record Daily Sales"}
            </Dialog.Title>
            <Dialog.Description className="text-sm text-muted-foreground">
              {isEdit
                ? "Correct the daily sales total."
                : "One total per branch per day."}
            </Dialog.Description>
          </div>

          <div className="grid gap-4 py-2">
            {isAdmin && !isEdit ? (
              <FormField label="Branch" required error={err.storeId}>
                <Combobox
                  value={form.storeId}
                  onValueChange={(value) => set("storeId", value)}
                  items={storeItems}
                  placeholder="Select branch"
                  searchPlaceholder="Search branches…"
                  emptyText="No branches found."
                  className="w-full"
                  popoverClassName="z-[200]"
                />
              </FormField>
            ) : null}

            {isEdit && sale ? (
              <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                Branch: <span className="font-medium text-foreground">{sale.store.name}</span>
              </p>
            ) : null}

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Date" required error={err.saleDate}>
                <input
                  className={cn(inputClassName, err.saleDate && "border-destructive")}
                  type="date"
                  max={today}
                  value={form.saleDate}
                  onChange={(e) => set("saleDate", e.target.value)}
                />
              </FormField>

              <FormField label="Sales total (KSh)" required error={err.totalAmount}>
                <input
                  className={cn(inputClassName, err.totalAmount && "border-destructive")}
                  type="number"
                  min="0"
                  step="1"
                  value={form.totalAmount}
                  onChange={(e) => set("totalAmount", e.target.value)}
                  placeholder="e.g. 32000"
                />
              </FormField>
            </div>

            <FormField label="Note">
              <textarea
                className={cn(inputClassName, "min-h-[70px] resize-y py-2")}
                value={form.note}
                onChange={(e) => set("note", e.target.value)}
                placeholder="Optional note (e.g. holiday, promotion day)"
                maxLength={300}
              />
            </FormField>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="button" onClick={save} disabled={isSaving}>
              {isSaving ? "Saving…" : isEdit ? "Save Changes" : "Add Entry"}
            </Button>
          </div>

          <Dialog.Close
            type="button"
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
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
