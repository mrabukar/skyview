"use client";

import { useEffect, useState } from "react";
import { Dialog } from "radix-ui";
import { X } from "lucide-react";

import { CategoryIconPicker } from "@/components/pos/category-icon-picker";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_MENU_CATEGORY_ICON,
  isMenuCategoryIconName,
  type MenuCategoryIconName,
} from "@/lib/pos/category-icons";
import { cn } from "@/lib/utils";
import type {
  MenuCategory,
  CreateMenuCategoryInput,
  UpdateMenuCategoryInput,
} from "@/types/pos/menu";

const inputCls =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

const contentCls = cn(
  "fixed left-1/2 top-1/2 z-[60] grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 border border-border bg-background p-6 shadow-lg duration-200",
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
  "sm:rounded-lg",
);

interface Props {
  open: boolean;
  mode: "add" | "edit";
  category?: MenuCategory;
  onClose: () => void;
  onSave: (data: CreateMenuCategoryInput | UpdateMenuCategoryInput) => void;
  isSaving: boolean;
}

function resolveIcon(value: string | null | undefined): MenuCategoryIconName {
  return isMenuCategoryIconName(value) ? value : DEFAULT_MENU_CATEGORY_ICON;
}

export function CategoryModal({
  open,
  mode,
  category,
  onClose,
  onSave,
  isSaving,
}: Props) {
  const [name, setName] = useState(category?.name ?? "");
  const [description, setDescription] = useState(
    category?.description ?? "",
  );
  const [icon, setIcon] = useState<MenuCategoryIconName>(() =>
    resolveIcon(category?.icon),
  );
  const [isActive, setIsActive] = useState(category?.isActive ?? true);
  const [errs, setErrs] = useState<{
    name?: string;
  }>({});

  // Re-seed form when dialog opens or target changes.
  useEffect(() => {
    if (open) {
      setName(category?.name ?? "");
      setDescription(category?.description ?? "");
      setIcon(resolveIcon(category?.icon));
      setIsActive(category?.isActive ?? true);
      setErrs({});
    }
  }, [open, category]);

  const validate = (): typeof errs => {
    const next: typeof errs = {};
    if (!name.trim()) next.name = "Name is required";
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
        description: description.trim() || undefined,
        icon,
        isActive,
      } satisfies UpdateMenuCategoryInput);
    } else {
      onSave({
        name: name.trim(),
        description: description.trim() || undefined,
        icon,
      } satisfies CreateMenuCategoryInput);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/80" />
        <Dialog.Content className={contentCls}>
          <div className="flex flex-col gap-1.5">
            <Dialog.Title className="text-lg font-semibold leading-none tracking-tight">
              {mode === "add" ? "Add Category" : "Edit Category"}
            </Dialog.Title>
            <Dialog.Description className="text-sm text-muted-foreground">
              {mode === "add"
                ? "Create a new menu category."
                : "Update category details."}
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
                placeholder="e.g. Milk Tea"
                maxLength={100}
              />
              {errs.name ? (
                <p className="text-sm text-destructive">{errs.name}</p>
              ) : null}
            </div>

            <CategoryIconPicker value={icon} onChange={setIcon} />

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
                  ? "Add Category"
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
