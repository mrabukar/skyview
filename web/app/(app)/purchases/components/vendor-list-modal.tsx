"use client";

import { useState } from "react";
import { Dialog } from "radix-ui";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  useCreateVendor,
  useDeleteVendor,
  useUpdateVendor,
  useVendors,
} from "@/hooks/vendors/use-vendors";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app";
import type { Vendor } from "@/types/vendors/vendor";

const inputClassName =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

const dialogContentClassName = cn(
  "fixed left-1/2 top-1/2 z-[210] grid w-full max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 border border-border bg-background p-6 shadow-lg duration-200 max-h-[85dvh] overflow-y-auto",
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
  "sm:rounded-lg",
);

interface Props {
  open: boolean;
  onClose: () => void;
}

export function VendorListModal({ open, onClose }: Props) {
  const addToast = useAppStore((s) => s.addToast);
  const addErrorToast = useAppStore((s) => s.addErrorToast);
  const { data, isPending } = useVendors();
  const createVendor = useCreateVendor();
  const updateVendor = useUpdateVendor();
  const deleteVendor = useDeleteVendor();

  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<Vendor | null>(null);

  const vendors = data ?? [];

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      await createVendor.mutateAsync({ name });
      setNewName("");
      addToast({ title: "Vendor added" });
    } catch (e) {
      addErrorToast({
        title: "Failed to add vendor",
        sub: e instanceof Error ? e.message : "Something went wrong",
      });
    }
  };

  const handleRename = async (vendor: Vendor) => {
    const name = editingName.trim();
    if (!name || name === vendor.name) {
      setEditingId(null);
      return;
    }
    try {
      await updateVendor.mutateAsync({ id: vendor.id, input: { name } });
      setEditingId(null);
      addToast({ title: "Vendor renamed" });
    } catch (e) {
      addErrorToast({
        title: "Failed to rename vendor",
        sub: e instanceof Error ? e.message : "Something went wrong",
      });
    }
  };

  const handleDelete = async (vendor: Vendor) => {
    try {
      await deleteVendor.mutateAsync(vendor.id);
      addToast({ title: "Vendor removed" });
      setConfirmDelete(null);
    } catch (e) {
      addErrorToast({
        title: "Failed to remove vendor",
        sub: e instanceof Error ? e.message : "Something went wrong",
      });
    }
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[205] bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className={dialogContentClassName}>
          <div className="flex flex-col gap-1.5 text-left">
            <Dialog.Title className="text-lg font-semibold leading-none tracking-tight">
              Vendors
            </Dialog.Title>
            <Dialog.Description className="text-sm text-muted-foreground">
              Managed list — keeps vendor names consistent in reports.
            </Dialog.Description>
          </div>

          <div className="flex items-center gap-2">
            <input
              className={inputClassName}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New vendor name"
              maxLength={80}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleCreate();
              }}
            />
            <Button
              type="button"
              onClick={() => void handleCreate()}
              disabled={createVendor.isPending || !newName.trim()}
            >
              <Plus className="size-4" />
              Add
            </Button>
          </div>

          <div className="grid gap-1.5">
            {isPending ? (
              <p className="py-3 text-center text-sm text-muted-foreground">Loading…</p>
            ) : vendors.length === 0 ? (
              <p className="py-3 text-center text-sm text-muted-foreground">
                No vendors yet — add the first one above.
              </p>
            ) : (
              vendors.map((vendor) => (
                <div
                  key={vendor.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
                >
                  {editingId === vendor.id ? (
                    <>
                      <input
                        className={inputClassName}
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void handleRename(vendor);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Save"
                        onClick={() => void handleRename(vendor)}
                        disabled={updateVendor.isPending}
                      >
                        <Check className="size-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{vendor.name}</p>
                        {vendor._count ? (
                          <p className="text-xs text-muted-foreground">
                            {vendor._count.purchases} purchase{vendor._count.purchases === 1 ? "" : "s"}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Rename"
                          onClick={() => {
                            setEditingId(vendor.id);
                            setEditingName(vendor.name);
                          }}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Remove (deactivates if used by purchases)"
                          onClick={() => setConfirmDelete(vendor)}
                          disabled={deleteVendor.isPending}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>

          <Dialog.Close
            type="button"
            className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
            onClick={onClose}
          >
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>

      {confirmDelete ? (
        <ConfirmDialog
          title={`Remove ${confirmDelete.name}?`}
          message={
            (confirmDelete._count?.purchases ?? 0) > 0
              ? `"${confirmDelete.name}" is used by existing purchases, so it will be deactivated (hidden from new purchases) rather than deleted.`
              : `"${confirmDelete.name}" will be permanently removed.`
          }
          confirmLabel="Remove"
          isLoading={deleteVendor.isPending}
          onConfirm={() => void handleDelete(confirmDelete)}
          onClose={() => setConfirmDelete(null)}
        />
      ) : null}
    </Dialog.Root>
  );
}
