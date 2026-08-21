"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog } from "radix-ui";
import { Check, ImagePlus, Pencil, Plus, Trash2, Upload, X } from "lucide-react";

import { MenuItemImage } from "@/components/pos/menu-item-image";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { MenuItemImageCropDialog } from "./menu-item-image-crop-dialog";
import { uploadMenuItemImage } from "@/service/pos/menu-items";
import {
  MENU_ITEM_IMAGE_HINT,
  validateMenuImageSource,
} from "@/lib/pos/menu-item-image";
import { cn } from "@/lib/utils";
import {
  useAddMenuItemSize,
  useUpdateMenuItemSize,
  useDeleteMenuItemSize,
} from "@/hooks/pos/use-menu-items";
import { useAppStore } from "@/store/app";
import type {
  MenuCategory,
  MenuItem,
  MenuItemSize,
  CreateMenuItemInput,
  UpdateMenuItemInput,
  CreateMenuItemSizeInput,
} from "@/types/pos/menu";

// ── shared style constants ─────────────────────────────────────────────────────

const inputCls =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

const contentCls = cn(
  "fixed left-1/2 top-1/2 z-[60] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 border border-border bg-background shadow-lg duration-200",
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
  "sm:rounded-lg",
  // Allow the modal to scroll on small screens
  "flex flex-col max-h-[90dvh] overflow-hidden",
);

const MENU_SIZE_NAMES = ["Small", "Medium", "Large"] as const;
const MENU_SIZE_ITEMS = MENU_SIZE_NAMES.map((name) => ({
  value: name,
  label: name,
}));

function sizeOptionsForRow(taken: string[], current?: string) {
  const options = MENU_SIZE_ITEMS.filter(
    (item) => item.value === current || !taken.includes(item.value),
  );
  if (current && !MENU_SIZE_ITEMS.some((item) => item.value === current)) {
    return [{ value: current, label: current }, ...options];
  }
  return options;
}

// ── local types ────────────────────────────────────────────────────────────────

interface SizeDraft {
  /** Undefined = not yet persisted (create mode) */
  id?: string;
  name: string;
  basePrice: string;
  isActive: boolean;
}

interface SizeErrs {
  name?: string;
  basePrice?: string;
}

interface FormErrs {
  name?: string;
  categoryId?: string;
  sizes?: string;
  sizeRows?: SizeErrs[];
}

interface Props {
  open: boolean;
  mode: "add" | "edit";
  item?: MenuItem;
  categories: MenuCategory[];
  categoriesLoading?: boolean;
  onClose: () => void;
  onSave: (data: CreateMenuItemInput | UpdateMenuItemInput) => void;
  /** Called after a successful image upload or removal (edit mode). */
  onImageChange?: (imageKey: string | null) => Promise<void>;
  isSaving: boolean;
}

// ── component ─────────────────────────────────────────────────────────────────

export function MenuItemModal({
  open,
  mode,
  item,
  categories,
  categoriesLoading = false,
  onClose,
  onSave,
  onImageChange,
  isSaving,
}: Props) {
  const [name, setName] = useState(item?.name ?? "");
  const [categoryId, setCategoryId] = useState(item?.categoryId ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [isActive, setIsActive] = useState(item?.isActive ?? true);
  // Image key stored when uploading during add mode
  const [pendingImageKey, setPendingImageKey] = useState<string | null>(null);
  const [sizes, setSizes] = useState<SizeDraft[]>(() => toSizeDrafts(item));
  const [errs, setErrs] = useState<FormErrs>({});

  // Image upload state
  const fileRef = useRef<HTMLInputElement>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  // Re-seed when dialog opens.
  useEffect(() => {
    if (open) {
      setName(item?.name ?? "");
      setCategoryId(item?.categoryId ?? "");
      setDescription(item?.description ?? "");
      setIsActive(item?.isActive ?? true);
      setSizes(toSizeDrafts(item));
      setErrs({});
      setImagePreview(null);
      setImageError(null);
      setPendingImageKey(null);
      setCropSrc(null);
    }
  }, [open, item]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;

    const err = validateMenuImageSource(file);
    if (err) {
      setImageError(err);
      return;
    }

    setImageError(null);
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(URL.createObjectURL(file));
  };

  const closeCrop = () => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  };

  const handleCroppedImage = async (file: File, previewUrl: string) => {
    closeCrop();
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(previewUrl);
    setImageUploading(true);
    setImageError(null);
    try {
      const key = await uploadMenuItemImage(file);
      if (mode === "edit" && onImageChange) {
        await onImageChange(key);
      } else {
        setPendingImageKey(key);
      }
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "Upload failed");
      setImagePreview(null);
      URL.revokeObjectURL(previewUrl);
    } finally {
      setImageUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    if (mode === "edit" && onImageChange) {
      setImageUploading(true);
      try {
        await onImageChange(null);
        setImagePreview(null);
      } catch (err) {
        setImageError(err instanceof Error ? err.message : "Failed to remove image");
      } finally {
        setImageUploading(false);
      }
    } else {
      // Add mode — just clear the local preview and pending key.
      setPendingImageKey(null);
      setImagePreview(null);
    }
  };

  // ── size helpers ─────────────────────────────────────────────────────────────

  const addSizeRow = () => {
    if (sizes.length >= MENU_SIZE_NAMES.length) return;
    setSizes((prev) => [
      ...prev,
      { name: "", basePrice: "0", isActive: true },
    ]);
    // Clear sizes-level error when user adds a row.
    setErrs((p) => ({ ...p, sizes: undefined }));
  };

  const removeSizeRow = (idx: number) => {
    setSizes((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateSizeField = <K extends keyof SizeDraft>(
    idx: number,
    field: K,
    value: SizeDraft[K],
  ) => {
    setSizes((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)),
    );
    // Clear per-row error for the changed field.
    setErrs((p) => ({
      ...p,
      sizeRows: p.sizeRows?.map((r, i) =>
        i === idx ? { ...r, [field]: undefined } : r,
      ),
    }));
  };

  // ── validation ────────────────────────────────────────────────────────────────

  const validate = (): FormErrs => {
    const next: FormErrs = {};

    if (!name.trim()) next.name = "Name is required";
    if (!categoryId) next.categoryId = "Category is required";

    // In add mode, at least one size must be defined.
    if (mode === "add") {
      if (sizes.length === 0) {
        next.sizes = "At least one size is required";
      } else {
        const rowErrs = sizes.map<SizeErrs>((s) => {
          const r: SizeErrs = {};
          if (!s.name.trim()) r.name = "Required";
          const p = Number(s.basePrice);
          if (isNaN(p) || p < 0) r.basePrice = "Invalid";
          return r;
        });
        if (rowErrs.some((r) => r.name || r.basePrice)) {
          next.sizeRows = rowErrs;
        }
      }
    }

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
        categoryId,
        description: description.trim() || undefined,
        isActive,
      } satisfies UpdateMenuItemInput);
    } else {
      onSave({
        name: name.trim(),
        categoryId,
        description: description.trim() || undefined,
        ...(pendingImageKey ? { imageKey: pendingImageKey } : {}),
        sizes: sizes.map<CreateMenuItemSizeInput>((s) => ({
          name: s.name.trim(),
          basePrice: Number(s.basePrice),
        })),
      } satisfies CreateMenuItemInput);
    }
  };

  // ── render ────────────────────────────────────────────────────────────────────

  return (
    <>
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/80" />
        <Dialog.Content className={contentCls}>
          {cropSrc ? (
            <>
              <Dialog.Title className="sr-only">Crop menu image</Dialog.Title>
              <Dialog.Description className="sr-only">
                Frame the cup in 3:4 portrait, then confirm the crop.
              </Dialog.Description>
              <MenuItemImageCropDialog
                imageSrc={cropSrc}
                onCancel={closeCrop}
                onConfirm={(file, previewUrl) =>
                  void handleCroppedImage(file, previewUrl)
                }
              />
            </>
          ) : (
            <>
          {/* Header */}
          <div className="flex flex-col gap-1.5 border-b border-border p-6 pb-4">
            <Dialog.Title className="text-lg font-semibold leading-none tracking-tight">
              {mode === "add" ? "Add Menu Item" : "Edit Menu Item"}
            </Dialog.Title>
            <Dialog.Description className="text-sm text-muted-foreground">
              {mode === "add"
                ? "Create a new item and add at least one size."
                : "Update item details. Manage sizes individually."}
            </Dialog.Description>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid gap-4">
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
                  placeholder="e.g. Classic Milk Tea"
                  maxLength={150}
                />
                {errs.name ? (
                  <p className="text-sm text-destructive">{errs.name}</p>
                ) : null}
              </div>

              {/* Category */}
              <div className="grid gap-2">
                <label className="text-sm font-medium leading-none">
                  Category <span className="text-destructive">*</span>
                </label>
                <select
                  className={cn(
                    inputCls,
                    errs.categoryId && "border-destructive",
                  )}
                  value={categoryId}
                  onChange={(e) => {
                    setCategoryId(e.target.value);
                    setErrs((p) => ({ ...p, categoryId: undefined }));
                  }}
                  disabled={categoriesLoading}
                >
                  <option value="">
                    {categoriesLoading ? "Loading…" : "Select category"}
                  </option>
                  {categories
                    .filter((c) => c.isActive)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
                {errs.categoryId ? (
                  <p className="text-sm text-destructive">{errs.categoryId}</p>
                ) : null}
              </div>

              {/* Description */}
              <div className="grid gap-2">
                <label className="text-sm font-medium leading-none">
                  Description
                </label>
                <textarea
                  className={cn(inputCls, "min-h-[72px] resize-y py-2")}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description"
                  maxLength={500}
                />
              </div>

              {/* Item Image */}
              <div className="grid gap-2">
                <label className="text-sm font-medium leading-none">
                  Item Image
                </label>
                <div className="flex items-start gap-4">
                  <div className="relative w-36 shrink-0 overflow-hidden rounded-lg border border-border bg-[repeating-conic-gradient(#e8e0d4_0%_25%,#f7f1e8_0%_50%)] bg-size-[12px_12px]">
                    <div className="aspect-[3/4] w-full">
                      {imagePreview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={imagePreview}
                          alt=""
                          className="h-full w-full object-contain"
                        />
                      ) : mode === "edit" && item?.imageKey ? (
                        <MenuItemImage
                          imageKey={item.imageKey}
                          className="h-full w-full rounded-none"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <ImagePlus size={28} className="opacity-50" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleImageSelect}
                    />
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={imageUploading || isSaving}
                      className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                    >
                      {imageUploading ? (
                        <>
                          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                          Uploading…
                        </>
                      ) : (
                        <>
                          <Upload size={12} />
                          {(mode === "edit" && item?.imageKey) || imagePreview
                            ? "Replace"
                            : "Upload"}
                        </>
                      )}
                    </button>
                    {((mode === "edit" && item?.imageKey) || imagePreview) &&
                      !imageUploading && (
                        <button
                          type="button"
                          onClick={() => void handleRemoveImage()}
                          className="inline-flex items-center gap-1 text-xs text-destructive hover:underline"
                        >
                          <Trash2 size={12} />
                          Remove
                        </button>
                      )}
                    {imageError && (
                      <p className="text-xs text-destructive">{imageError}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {MENU_ITEM_IMAGE_HINT}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Shown with object-contain so the cup is never cut off.
                      Transparent PNG works best — the card supplies the
                      background.
                    </p>
                  </div>
                </div>
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
                    onClick={() => setIsActive((p) => !p)}
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

              {/* Inline sizes editor — create mode only */}
              {mode === "add" ? (
                <div className="grid gap-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium leading-none">
                      Sizes <span className="text-destructive">*</span>
                    </label>
                    <button
                      type="button"
                      className="flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50 disabled:no-underline"
                      onClick={addSizeRow}
                      disabled={sizes.length >= MENU_SIZE_NAMES.length}
                    >
                      <Plus size={14} />
                      Add size
                    </button>
                  </div>

                  {errs.sizes ? (
                    <p className="text-sm text-destructive">{errs.sizes}</p>
                  ) : null}

                  {sizes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No sizes added yet. Click &ldquo;Add size&rdquo; above.
                    </p>
                  ) : (
                    <div className="grid gap-2">
                      {/* Column headers */}
                      <div className="grid grid-cols-[1fr_120px_32px] gap-2 text-xs font-medium text-muted-foreground">
                        <span>Size name</span>
                        <span>Base price (KSh)</span>
                        <span />
                      </div>

                      {sizes.map((size, idx) => {
                        const rowErr = errs.sizeRows?.[idx];
                        const taken = sizes
                          .map((s, i) => (i === idx ? "" : s.name))
                          .filter(Boolean);
                        return (
                          <div
                            key={idx}
                            className="grid grid-cols-[1fr_120px_32px] items-start gap-2"
                          >
                            <div className="grid gap-1">
                              <Combobox
                                value={size.name || undefined}
                                onValueChange={(value) =>
                                  updateSizeField(idx, "name", value ?? "")
                                }
                                items={sizeOptionsForRow(taken, size.name)}
                                placeholder="Select size"
                                searchPlaceholder="Search sizes…"
                                emptyText="No sizes left."
                                className="w-full"
                                popoverClassName="z-[200]"
                              />
                              {rowErr?.name ? (
                                <p className="text-xs text-destructive">
                                  {rowErr.name}
                                </p>
                              ) : null}
                            </div>

                            <div className="grid gap-1">
                              <input
                                type="number"
                                className={cn(
                                  inputCls,
                                  "h-9",
                                  rowErr?.basePrice && "border-destructive",
                                )}
                                value={size.basePrice}
                                onChange={(e) =>
                                  updateSizeField(
                                    idx,
                                    "basePrice",
                                    e.target.value,
                                  )
                                }
                                min={0}
                                step={0.01}
                                placeholder="0.00"
                              />
                              {rowErr?.basePrice ? (
                                <p className="text-xs text-destructive">
                                  {rowErr.basePrice}
                                </p>
                              ) : null}
                            </div>

                            <button
                              type="button"
                              className="mt-0.5 flex h-9 w-8 items-center justify-center rounded-md text-destructive hover:bg-destructive/10"
                              title="Remove size"
                              onClick={() => removeSizeRow(idx)}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Note about editing sizes post-creation */}
                  {sizes.length > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      You can manage sizes after saving from the item&apos;s edit
                      dialog.
                    </p>
                  ) : null}
                </div>
              ) : item ? (
                /* Edit mode: interactive sizes panel */
                <EditSizesPanel item={item} disabled={isSaving} />
              ) : null}
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col-reverse gap-2 border-t border-border p-6 pt-4 sm:flex-row sm:justify-end">
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
                  ? "Add Item"
                  : "Save Changes"}
            </Button>
          </div>

            </>
          )}
          <Dialog.Close
            type="button"
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100"
            onClick={() => {
              closeCrop();
              onClose();
            }}
          >
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
    </>
  );
}

// ── Edit-mode sizes panel ─────────────────────────────────────────────────────

interface EditSizesPanelProps {
  item: MenuItem;
  disabled: boolean;
}

function EditSizesPanel({ item, disabled }: EditSizesPanelProps) {
  const addToast = useAppStore((s) => s.addToast);
  const addErrorToast = useAppStore((s) => s.addErrorToast);

  const addSize = useAddMenuItemSize();
  const updateSize = useUpdateMenuItemSize();
  const deleteSize = useDeleteMenuItemSize();

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editErr, setEditErr] = useState<{ name?: string; price?: string }>({});

  // Adding new size state
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newErr, setNewErr] = useState<{ name?: string; price?: string }>({});

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<MenuItemSize | null>(null);

  const isBusy =
    disabled ||
    addSize.isPending ||
    updateSize.isPending ||
    deleteSize.isPending;

  // ── Start editing ───────────────────────────────────────────────────────────
  const startEdit = (size: MenuItemSize) => {
    setEditingId(size.id);
    setEditName(size.name);
    setEditPrice(String(Number(size.basePrice)));
    setEditErr({});
    // Cancel add mode if open
    setAdding(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditErr({});
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const errs: { name?: string; price?: string } = {};
    if (!editName.trim()) errs.name = "Required";
    const p = Number(editPrice);
    if (isNaN(p) || p < 0) errs.price = "Invalid";
    if (Object.keys(errs).length) {
      setEditErr(errs);
      return;
    }

    try {
      await updateSize.mutateAsync({
        itemId: item.id,
        sizeId: editingId,
        data: { name: editName.trim(), basePrice: p },
      });
      addToast({ title: "Size updated" });
      setEditingId(null);
    } catch (e) {
      addErrorToast({
        title: "Failed to update size",
        sub: e instanceof Error ? e.message : "Something went wrong",
      });
    }
  };

  // ── Add new size ────────────────────────────────────────────────────────────
  const startAdd = () => {
    setAdding(true);
    setNewName("");
    setNewPrice("");
    setNewErr({});
    // Cancel edit if open
    setEditingId(null);
  };

  const cancelAdd = () => {
    setAdding(false);
    setNewErr({});
  };

  const saveAdd = async () => {
    const errs: { name?: string; price?: string } = {};
    if (!newName.trim()) errs.name = "Required";
    const p = Number(newPrice);
    if (isNaN(p) || p < 0) errs.price = "Invalid";
    if (Object.keys(errs).length) {
      setNewErr(errs);
      return;
    }

    try {
      await addSize.mutateAsync({
        itemId: item.id,
        data: { name: newName.trim(), basePrice: p },
      });
      addToast({ title: "Size added" });
      setAdding(false);
    } catch (e) {
      addErrorToast({
        title: "Failed to add size",
        sub: e instanceof Error ? e.message : "Something went wrong",
      });
    }
  };

  // ── Toggle active ───────────────────────────────────────────────────────────
  const toggleActive = async (size: MenuItemSize) => {
    try {
      await updateSize.mutateAsync({
        itemId: item.id,
        sizeId: size.id,
        data: { isActive: !size.isActive },
      });
      addToast({
        title: size.isActive ? "Size deactivated" : "Size activated",
      });
    } catch (e) {
      addErrorToast({
        title: "Failed to update size",
        sub: e instanceof Error ? e.message : "Something went wrong",
      });
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteSize.mutateAsync({
        itemId: item.id,
        sizeId: deleteTarget.id,
      });
      addToast({ title: "Size deleted" });
      setDeleteTarget(null);
    } catch (e) {
      addErrorToast({
        title: "Failed to delete size",
        sub: e instanceof Error ? e.message : "Something went wrong",
      });
      setDeleteTarget(null);
    }
  };

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium leading-none">
          Sizes ({item.sizes.length})
        </label>
        <button
          type="button"
          className="flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50 disabled:no-underline"
          onClick={startAdd}
          disabled={isBusy || adding || item.sizes.length >= MENU_SIZE_NAMES.length}
        >
          <Plus size={14} />
          Add size
        </button>
      </div>

      {item.sizes.length === 0 && !adding ? (
        <p className="text-sm text-muted-foreground">
          No sizes yet. Click &ldquo;Add size&rdquo; above.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border text-sm">
          {item.sizes.map((size) =>
            editingId === size.id ? (
              /* ── Inline edit row ────────────────────────────────────── */
              <li key={size.id} className="p-2">
                <div className="grid grid-cols-[1fr_100px] gap-2">
                  <div className="grid gap-1">
                    <Combobox
                      value={editName || undefined}
                      onValueChange={(value) => {
                        setEditName(value ?? "");
                        setEditErr((p) => ({ ...p, name: undefined }));
                      }}
                      items={sizeOptionsForRow(
                        item.sizes
                          .filter((s) => s.id !== size.id)
                          .map((s) => s.name),
                        editName,
                      )}
                      placeholder="Select size"
                      searchPlaceholder="Search sizes…"
                      emptyText="No sizes left."
                      className="w-full"
                      popoverClassName="z-[200]"
                      disabled={isBusy}
                    />
                    {editErr.name ? (
                      <p className="text-xs text-destructive">{editErr.name}</p>
                    ) : null}
                  </div>
                  <div className="grid gap-1">
                    <input
                      type="number"
                      className={cn(
                        inputCls,
                        "h-8 text-sm",
                        editErr.price && "border-destructive",
                      )}
                      value={editPrice}
                      onChange={(e) => {
                        setEditPrice(e.target.value);
                        setEditErr((p) => ({ ...p, price: undefined }));
                      }}
                      min={0}
                      step={0.01}
                      placeholder="0.00"
                      disabled={isBusy}
                    />
                    {editErr.price ? (
                      <p className="text-xs text-destructive">
                        {editErr.price}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="mt-2 flex justify-end gap-1.5">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted"
                    onClick={cancelEdit}
                    disabled={isBusy}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    onClick={() => void saveEdit()}
                    disabled={isBusy}
                  >
                    {updateSize.isPending ? (
                      <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    ) : (
                      <Check size={12} />
                    )}
                    Save
                  </button>
                </div>
              </li>
            ) : (
              /* ── Display row ────────────────────────────────────────── */
              <li
                key={size.id}
                className={cn(
                  "flex items-center justify-between px-3 py-2",
                  !size.isActive && "opacity-50",
                )}
              >
                <div className="flex items-center gap-2">
                  <span>{size.name}</span>
                  {!size.isActive ? (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                      Inactive
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">
                    KSh{" "}
                    {Number(size.basePrice).toLocaleString("en-KE", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                      title="Edit size"
                      onClick={() => startEdit(size)}
                      disabled={isBusy}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={size.isActive}
                      title={size.isActive ? "Deactivate" : "Activate"}
                      onClick={() => void toggleActive(size)}
                      disabled={isBusy}
                      className={cn(
                        "relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors disabled:opacity-50",
                        size.isActive ? "bg-primary" : "bg-input",
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform",
                          size.isActive ? "translate-x-3.5" : "translate-x-0.5",
                        )}
                      />
                    </button>
                    <button
                      type="button"
                      className="rounded p-1 text-destructive/70 hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                      title="Delete size"
                      onClick={() => setDeleteTarget(size)}
                      disabled={isBusy}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </li>
            ),
          )}

          {/* ── Add new row ──────────────────────────────────────────── */}
          {adding ? (
            <li className="p-2">
              <div className="grid grid-cols-[1fr_100px] gap-2">
                <div className="grid gap-1">
                  <Combobox
                    value={newName || undefined}
                    onValueChange={(value) => {
                      setNewName(value ?? "");
                      setNewErr((p) => ({ ...p, name: undefined }));
                    }}
                    items={sizeOptionsForRow(item.sizes.map((s) => s.name))}
                    placeholder="Select size"
                    searchPlaceholder="Search sizes…"
                    emptyText="No sizes left."
                    className="w-full"
                    popoverClassName="z-[200]"
                    disabled={isBusy}
                  />
                  {newErr.name ? (
                    <p className="text-xs text-destructive">{newErr.name}</p>
                  ) : null}
                </div>
                <div className="grid gap-1">
                  <input
                    type="number"
                    className={cn(
                      inputCls,
                      "h-8 text-sm",
                      newErr.price && "border-destructive",
                    )}
                    value={newPrice}
                    onChange={(e) => {
                      setNewPrice(e.target.value);
                      setNewErr((p) => ({ ...p, price: undefined }));
                    }}
                    min={0}
                    step={0.01}
                    placeholder="0.00"
                    disabled={isBusy}
                  />
                  {newErr.price ? (
                    <p className="text-xs text-destructive">{newErr.price}</p>
                  ) : null}
                </div>
              </div>
              <div className="mt-2 flex justify-end gap-1.5">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted"
                  onClick={cancelAdd}
                  disabled={isBusy}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  onClick={() => void saveAdd()}
                  disabled={isBusy}
                >
                  {addSize.isPending ? (
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  ) : (
                    <Check size={12} />
                  )}
                  Add
                </button>
              </div>
            </li>
          ) : null}
        </ul>
      )}

      {/* ── Delete confirmation ──────────────────────────────────────── */}
      {deleteTarget ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3">
          <p className="text-sm">
            Delete size &ldquo;{deleteTarget.name}&rdquo;? This cannot be undone.
          </p>
          <div className="mt-2 flex justify-end gap-1.5">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteSize.isPending}
            >
              Cancel
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md bg-destructive px-2.5 py-1 text-xs text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
              onClick={() => void confirmDelete()}
              disabled={deleteSize.isPending}
            >
              {deleteSize.isPending ? (
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-destructive-foreground border-t-transparent" />
              ) : (
                <Trash2 size={12} />
              )}
              Delete
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ── helpers ───────────────────────────────────────────────────────────────────

function toSizeDrafts(item?: MenuItem): SizeDraft[] {
  if (!item) return [];
  return item.sizes.map((s) => ({
    id: s.id,
    name: s.name,
    basePrice: s.basePrice,
    isActive: s.isActive,
  }));
}
