"use client";

import { useMemo, useRef, useState } from "react";
import { Dialog } from "radix-ui";
import { Camera, Paperclip, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { CameraCapturePanel } from "@/components/receipts/camera-capture-panel";
import { dateToYmd } from "@/lib/filters/dates";
import { cn, fmt } from "@/lib/utils";
import { useAppStore } from "@/store/app";
import type { PurchaseEntry } from "@/types/purchases/purchase-entry";
import { RECEIPT_ACCEPT, RECEIPT_MAX_SIZE } from "@/types/receipts/receipt";
import { ReceiptManager } from "./receipt-manager";

const inputClassName =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

const dialogContentClassName = cn(
  "fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 border border-border bg-background p-6 shadow-lg duration-200 max-h-[90dvh] overflow-y-auto",
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
  "sm:rounded-lg",
);

export interface PurchaseEntryFormValues {
  storeId: string | undefined;
  itemName: string;
  quantity: string;
  unitPrice: string;
  vendorId: string | undefined;
  purchaseDate: string;
  note: string;
  /** Optional receipts to attach on create (add mode only). */
  receiptFiles: File[];
}

/** The text form fields (receipts are tracked in their own state). */
type FormFields = Omit<PurchaseEntryFormValues, "receiptFiles">;

interface Props {
  open: boolean;
  mode: "add" | "edit";
  entry?: PurchaseEntry;
  isAdmin: boolean;
  /** Show required branch picker on create (admin, or multi-branch manager). */
  showStoreField?: boolean;
  storeItems: { value: string; label: string }[];
  vendorItems: { value: string; label: string }[];
  vendorsLoading?: boolean;
  onClose: () => void;
  onSave: (data: PurchaseEntryFormValues) => void;
  isSaving: boolean;
  onManageVendors?: () => void;
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

export function PurchaseEntryModal({
  open,
  mode,
  entry,
  isAdmin,
  showStoreField,
  storeItems,
  vendorItems,
  vendorsLoading = false,
  onClose,
  onSave,
  isSaving,
  onManageVendors,
}: Props) {
  const isEdit = mode === "edit";
  const pickStore = showStoreField ?? isAdmin;
  const today = useMemo(() => dateToYmd(new Date()), []);
  const addErrorToast = useAppStore((s) => s.addErrorToast);
  const receiptInputRef = useRef<HTMLInputElement>(null);
  const [receiptFiles, setReceiptFiles] = useState<File[]>([]);

  const addReceiptFile = (file: File): void => {
    if (!RECEIPT_ACCEPT.split(",").includes(file.type)) {
      addErrorToast({
        title: "Unsupported file",
        sub: "Use a JPG, PNG, WebP image or a PDF.",
      });
      return;
    }
    if (file.size > RECEIPT_MAX_SIZE) {
      addErrorToast({ title: "File too large", sub: "Maximum size is 10 MB." });
      return;
    }
    setReceiptFiles((prev) => [...prev, file]);
  };

  const removeReceiptAt = (index: number) =>
    setReceiptFiles((prev) => prev.filter((_, i) => i !== index));
  // Swaps the dialog body for `CameraCapturePanel` in place, rather than
  // opening a second Dialog — see that component's doc comment for why.
  const [cameraOpen, setCameraOpen] = useState(false);
  const cameraCaptureRef = useRef<(file: File) => void>(() => {});
  const openCamera = (onCapture: (file: File) => void) => {
    cameraCaptureRef.current = onCapture;
    setCameraOpen(true);
  };
  const [form, setForm] = useState<FormFields>(() => ({
    storeId: entry?.storeId ?? undefined,
    itemName: entry?.itemName ?? "",
    quantity: entry ? String(entry.quantity) : "",
    unitPrice: entry ? String(entry.unitPrice) : "",
    vendorId: entry?.vendorId ?? undefined,
    purchaseDate: entry?.purchaseDate ?? today,
    note: entry?.note ?? "",
  }));
  const [err, setErr] = useState<Partial<Record<keyof FormFields, string>>>({});

  const set = (key: keyof FormFields, value: string | undefined) =>
    setForm((state) => ({ ...state, [key]: value }));

  const pickReceipt = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // allow re-picking the same file(s)
    for (const file of files) addReceiptFile(file);
  };

  const total =
    Number(form.quantity) > 0 && Number(form.unitPrice) > 0
      ? Number(form.quantity) * Number(form.unitPrice)
      : null;

  const save = () => {
    const next: Partial<Record<keyof PurchaseEntryFormValues, string>> = {};
    if (pickStore && !isEdit && !form.storeId)
      next.storeId = "Branch is required";
    if (!form.itemName.trim()) next.itemName = "Item name is required";
    if (!form.quantity || Number(form.quantity) <= 0)
      next.quantity = "Enter a positive quantity";
    if (!form.unitPrice || Number(form.unitPrice) <= 0)
      next.unitPrice = "Enter a positive price";
    if (!form.vendorId) next.vendorId = "Vendor is required";
    if (!form.purchaseDate) next.purchaseDate = "Date is required";
    else if (form.purchaseDate > today)
      next.purchaseDate = "Date cannot be in the future";
    setErr(next);
    if (Object.keys(next).length) return;
    onSave({ ...form, receiptFiles });
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) return;
        // Escape / overlay click while the camera is up should back out
        // to the form, not close the whole modal underneath it.
        if (cameraOpen) {
          setCameraOpen(false);
          return;
        }
        onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className={dialogContentClassName}>
          <div className="flex flex-col gap-1.5 text-left">
            <Dialog.Title className="text-lg font-semibold leading-none tracking-tight">
              {cameraOpen
                ? "Take Photo"
                : isEdit
                  ? "Edit Purchase"
                  : "Record Purchase"}
            </Dialog.Title>
            <Dialog.Description
              className={cn(
                "text-sm text-muted-foreground",
                cameraOpen && "sr-only",
              )}
            >
              {cameraOpen
                ? "Use your camera to take a photo of the receipt."
                : isEdit
                  ? "Update the supply purchase details."
                  : "What was bought for the branch — e.g. 10 packs of cups."}
            </Dialog.Description>
          </div>

          {cameraOpen ? (
            <CameraCapturePanel
              onClose={() => setCameraOpen(false)}
              onCapture={(file) => cameraCaptureRef.current(file)}
            />
          ) : (
            <>
              <div className="grid gap-4 py-2">
                {pickStore && !isEdit ? (
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

                {isEdit && entry ? (
                  <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                    Branch:{" "}
                    <span className="font-medium text-foreground">
                      {entry.store.name}
                    </span>
                  </p>
                ) : null}

                <FormField label="Item" required error={err.itemName}>
                  <input
                    className={cn(
                      inputClassName,
                      err.itemName && "border-destructive",
                    )}
                    value={form.itemName}
                    onChange={(e) => set("itemName", e.target.value)}
                    placeholder="e.g. Paper cups 16oz (pack of 50)"
                    maxLength={200}
                  />
                </FormField>

                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Quantity" required error={err.quantity}>
                    <input
                      className={cn(
                        inputClassName,
                        err.quantity && "border-destructive",
                      )}
                      type="number"
                      min="0"
                      step="1"
                      value={form.quantity}
                      onChange={(e) => set("quantity", e.target.value)}
                      placeholder="e.g. 10"
                    />
                  </FormField>
                  <FormField
                    label="Unit price (KSh)"
                    required
                    error={err.unitPrice}
                  >
                    <input
                      className={cn(
                        inputClassName,
                        err.unitPrice && "border-destructive",
                      )}
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.unitPrice}
                      onChange={(e) => set("unitPrice", e.target.value)}
                      placeholder="e.g. 450"
                    />
                  </FormField>
                </div>

                {total != null ? (
                  <p className="rounded-md bg-muted px-3 py-2 text-sm">
                    Total: <span className="font-semibold">{fmt(total)}</span>
                  </p>
                ) : null}

                <FormField label="Vendor" required error={err.vendorId}>
                  <div className="flex items-center gap-2">
                    <Combobox
                      value={form.vendorId}
                      onValueChange={(value) => set("vendorId", value)}
                      items={vendorItems}
                      placeholder="Select vendor"
                      searchPlaceholder="Search vendors…"
                      emptyText="No vendors found."
                      loading={vendorsLoading}
                      className="w-full"
                      popoverClassName="z-[200]"
                    />
                    {onManageVendors ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={onManageVendors}
                      >
                        Manage
                      </Button>
                    ) : null}
                  </div>
                </FormField>

                <FormField
                  label="Purchase date"
                  required
                  error={err.purchaseDate}
                >
                  <input
                    className={cn(
                      inputClassName,
                      err.purchaseDate && "border-destructive",
                    )}
                    type="date"
                    max={today}
                    value={form.purchaseDate}
                    onChange={(e) => set("purchaseDate", e.target.value)}
                  />
                </FormField>

                <FormField label="Note">
                  <textarea
                    className={cn(
                      inputClassName,
                      "min-h-[70px] resize-y py-2",
                    )}
                    value={form.note}
                    onChange={(e) => set("note", e.target.value)}
                    placeholder="Optional note (e.g. invoice number)"
                    maxLength={300}
                  />
                </FormField>

                {isEdit && entry ? (
                  <ReceiptManager
                    purchaseId={entry.id}
                    onRequestCamera={openCamera}
                  />
                ) : (
                  <FormField label="Receipts">
                    <div className="grid gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => receiptInputRef.current?.click()}
                        >
                          <Paperclip className="size-4" />
                          Add files
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            openCamera((file) => addReceiptFile(file))
                          }
                        >
                          <Camera className="size-4" />
                          Take Photo
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          {receiptFiles.length > 0
                            ? `${receiptFiles.length} selected`
                            : "Optional — attach several images or PDFs"}
                        </span>
                      </div>

                      {receiptFiles.length > 0 ? (
                        <div className="grid gap-1.5">
                          {receiptFiles.map((file, index) => (
                            <div
                              key={`${file.name}-${index}`}
                              className="flex items-center gap-2 rounded-md border border-border px-3 py-2"
                            >
                              <span
                                className="min-w-0 flex-1 truncate text-sm"
                                title={file.name}
                              >
                                {file.name}
                              </span>
                              <button
                                type="button"
                                className="rounded-md p-1 text-muted-foreground hover:text-destructive"
                                onClick={() => removeReceiptAt(index)}
                                aria-label="Remove file"
                              >
                                <X className="size-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      <input
                        ref={receiptInputRef}
                        type="file"
                        accept={RECEIPT_ACCEPT}
                        multiple
                        className="hidden"
                        onChange={pickReceipt}
                      />
                    </div>
                  </FormField>
                )}
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
                    : isEdit
                      ? "Save Changes"
                      : "Record Purchase"}
                </Button>
              </div>
            </>
          )}

          <Dialog.Close
            type="button"
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
