"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { MenuItemModal } from "./components/menu-item-modal";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { MenuItemImage } from "@/components/pos/menu-item-image";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useMenuCategories } from "@/hooks/pos/use-menu-categories";
import {
  useMenuItems,
  useCreateMenuItem,
  useUpdateMenuItem,
  useDeleteMenuItem,
} from "@/hooks/pos/use-menu-items";
import { useAppStore } from "@/store/app";
import type {
  MenuItem,
  CreateMenuItemInput,
  UpdateMenuItemInput,
} from "@/types/pos/menu";

interface ModalState {
  mode: "add" | "edit";
  item?: MenuItem;
}

export default function MenuItemsPage() {
  const user = useAppStore((s) => s.user);
  const addToast = useAppStore((s) => s.addToast);
  const addErrorToast = useAppStore((s) => s.addErrorToast);

  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "manager";
  const isCashier = user?.role === "cashier";

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();
  const [modal, setModal] = useState<ModalState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MenuItem | null>(null);

  const debouncedSearch = useDebouncedValue(search, 300);

  const listQuery = useMemo(
    () => ({
      page: pageIndex + 1,
      limit: pageSize,
      search: debouncedSearch || undefined,
      categoryId: categoryFilter || undefined,
    }),
    [pageIndex, pageSize, debouncedSearch, categoryFilter],
  );

  const { data, isPending, isFetching, isError, error } =
    useMenuItems(listQuery);
  const { data: categories = [], isPending: categoriesLoading } =
    useMenuCategories();

  const isLoading = isPending || (isFetching && (data?.data.length ?? 0) === 0);
  const items = data?.data ?? [];
  const rowCount = data?.meta.total ?? 0;

  const createItem = useCreateMenuItem();
  const updateItem = useUpdateMenuItem();
  const deleteItem = useDeleteMenuItem();

  const columns = useMemo<ColumnDef<MenuItem>[]>(() => {
    const cols: ColumnDef<MenuItem>[] = [
      {
        id: "image",
        meta: { label: "Image", export: false },
        header: "",
        cell: ({ row }) => (
          <MenuItemImage
            imageKey={row.original.imageKey}
            alt={row.original.name}
            className="h-9 w-9"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "name",
        meta: { label: "Name" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Name" />
        ),
        cell: ({ row }) => (
          <span className="strong">{row.original.name}</span>
        ),
      },
      {
        id: "category",
        meta: { label: "Category" },
        header: "Category",
        cell: ({ row }) => (
          <span className="muted">{row.original.category.name}</span>
        ),
        enableSorting: false,
      },
      {
        id: "sizes",
        meta: {
          label: "Sizes",
          exportValue: (row: MenuItem) => String(row.sizes.length),
        },
        header: "Sizes",
        cell: ({ row }) => (
          <span className="muted">{row.original.sizes.length}</span>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "isActive",
        meta: {
          label: "Status",
          exportValue: (row: MenuItem) => (row.isActive ? "Active" : "Inactive"),
        },
        header: "Status",
        cell: ({ row }) => <StatusBadge active={row.original.isActive} />,
        enableSorting: false,
      },
      {
        id: "createdBy",
        meta: { label: "Created By" },
        header: "Created By",
        cell: ({ row }) => (
          <span className="muted">{row.original.createdBy.name}</span>
        ),
        enableSorting: false,
      },
    ];

    if (!isCashier) {
      cols.push({
        id: "actions",
        meta: { export: false },
        header: "Actions",
        cell: ({ row }) => {
          const item = row.original;
          const canEdit =
            isAdmin || (isManager && item.createdById === user?.id);
          const canDelete = isAdmin;
          if (!canEdit && !canDelete) return null;
          return (
            <div className="dt-actions">
              {canEdit ? (
                <button
                  type="button"
                  className="dt-act"
                  title="Edit"
                  onClick={() => setModal({ mode: "edit", item })}
                >
                  <Pencil size={16} />
                </button>
              ) : null}
              {canDelete ? (
                <button
                  type="button"
                  className="dt-act danger"
                  title="Delete"
                  onClick={() => setDeleteTarget(item)}
                >
                  <Trash2 size={16} />
                </button>
              ) : null}
            </div>
          );
        },
        enableSorting: false,
        enableHiding: false,
      });
    }

    return cols;
  }, [isAdmin, isManager, isCashier, user?.id]);

  // Category filter chip row shown above the DataTable.
  const toolbarExtra =
    categories.length > 0 ? (
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setCategoryFilter(undefined);
            setPageIndex(0);
          }}
          className={cn(
            "rounded-full border px-3 py-1 text-xs transition-colors",
            !categoryFilter
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background text-foreground hover:bg-muted",
          )}
        >
          All
        </button>
        {categories
          .filter((c) => c.isActive)
          .map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setCategoryFilter(c.id);
                setPageIndex(0);
              }}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition-colors",
                categoryFilter === c.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:bg-muted",
              )}
            >
              {c.name}
            </button>
          ))}
      </div>
    ) : undefined;

  const handleSave = async (
    data: CreateMenuItemInput | UpdateMenuItemInput,
  ) => {
    try {
      if (modal?.mode === "edit" && modal.item) {
        await updateItem.mutateAsync({
          id: modal.item.id,
          data: data as UpdateMenuItemInput,
        });
        addToast({ title: "Item updated" });
      } else {
        await createItem.mutateAsync(data as CreateMenuItemInput);
        addToast({ title: "Item added successfully" });
      }
      setModal(null);
    } catch (e) {
      addErrorToast({
        title: "Failed to save item",
        sub: e instanceof Error ? e.message : "Something went wrong",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteItem.mutateAsync(deleteTarget.id);
      addToast({ title: "Item deleted" });
      setDeleteTarget(null);
    } catch (e) {
      addErrorToast({
        title: "Failed to delete item",
        sub: e instanceof Error ? e.message : "Something went wrong",
      });
    }
  };

  const isSaving = createItem.isPending || updateItem.isPending;

  return (
    <>
      <PageHeader
        title="Menu Items"
        desc="Manage the items that appear in the POS catalogue"
        action={
          !isCashier ? (
            <Button onClick={() => setModal({ mode: "add" })}>
              <Plus className="size-4" />
              Add Item
            </Button>
          ) : undefined
        }
      />

      {isError ? (
        <div className="alert-error" style={{ marginBottom: 16 }}>
          {error instanceof Error
            ? error.message
            : "Failed to load menu items."}
        </div>
      ) : null}

      <DataTable
        columns={columns}
        data={items}
        rowCount={rowCount}
        pageIndex={pageIndex}
        pageSize={pageSize}
        onPaginationChange={({ pageIndex: nextPage, pageSize: nextSize }) => {
          setPageIndex(nextPage);
          setPageSize(nextSize);
        }}
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPageIndex(0);
        }}
        searchPlaceholder="Search items…"
        isLoading={isLoading}
        getRowId={(row) => row.id}
        emptyTitle="No items found"
        emptyDescription={
          isCashier
            ? "No menu items are available."
            : "Add your first item to get started."
        }
        toolbarExtra={toolbarExtra}
      />

      {modal ? (
        <MenuItemModal
          key={modal.mode === "edit" ? (modal.item?.id ?? "edit") : "new"}
          open
          mode={modal.mode}
          item={modal.item}
          categories={categories}
          categoriesLoading={categoriesLoading}
          onClose={() => setModal(null)}
          onSave={(data) => void handleSave(data)}
          onImageChange={
            modal.mode === "edit" && modal.item
              ? async (imageKey) => {
                  await updateItem.mutateAsync({
                    id: modal.item!.id,
                    data: { imageKey },
                  });
                }
              : undefined
          }
          isSaving={isSaving}
        />
      ) : null}

      {deleteTarget ? (
        <ConfirmDialog
          title="Delete menu item?"
          message={`"${deleteTarget.name}" and all its sizes will be permanently deleted.`}
          confirmLabel="Delete"
          variant="danger"
          isLoading={deleteItem.isPending}
          onConfirm={() => void handleDelete()}
          onClose={() => setDeleteTarget(null)}
        />
      ) : null}
    </>
  );
}

