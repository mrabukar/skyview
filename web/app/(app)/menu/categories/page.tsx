"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { CategoryModal } from "./components/category-modal";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/badge";
import {
  useMenuCategories,
  useCreateMenuCategory,
  useUpdateMenuCategory,
  useDeleteMenuCategory,
} from "@/hooks/pos/use-menu-categories";
import { useAppStore } from "@/store/app";
import type {
  MenuCategory,
  CreateMenuCategoryInput,
  UpdateMenuCategoryInput,
} from "@/types/pos/menu";

interface ModalState {
  mode: "add" | "edit";
  category?: MenuCategory;
}

export default function MenuCategoriesPage() {
  const user = useAppStore((s) => s.user);
  const addToast = useAppStore((s) => s.addToast);
  const addErrorToast = useAppStore((s) => s.addErrorToast);

  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "manager";
  const isCashier = user?.role === "cashier";

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<ModalState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MenuCategory | null>(null);

  const {
    data: categories = [],
    isPending,
    isError,
    error,
  } = useMenuCategories();
  const createCategory = useCreateMenuCategory();
  const updateCategory = useUpdateMenuCategory();
  const deleteCategory = useDeleteMenuCategory();

  // Client-side search — categories are a flat org-wide array.
  const filtered = useMemo(() => {
    if (!search.trim()) return categories;
    const q = search.toLowerCase();
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description ?? "").toLowerCase().includes(q),
    );
  }, [categories, search]);

  const paged = useMemo(
    () => filtered.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize),
    [filtered, pageIndex, pageSize],
  );

  const columns = useMemo<ColumnDef<MenuCategory>[]>(() => {
    const cols: ColumnDef<MenuCategory>[] = [
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
        accessorKey: "description",
        meta: { label: "Description" },
        header: "Description",
        cell: ({ row }) => (
          <span className="muted">{row.original.description ?? "—"}</span>
        ),
        enableSorting: false,
      },
      {
        id: "items",
        meta: {
          label: "Items",
          exportValue: (row: MenuCategory) => String(row._count.items),
        },
        header: "Items",
        cell: ({ row }) => (
          <span className="muted">{row.original._count.items}</span>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "isActive",
        meta: {
          label: "Status",
          exportValue: (row: MenuCategory) =>
            row.isActive ? "Active" : "Inactive",
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
          const cat = row.original;
          const canEdit =
            isAdmin || (isManager && cat.createdById === user?.id);
          const canDelete = isAdmin;
          if (!canEdit && !canDelete) return null;
          return (
            <div className="dt-actions">
              {canEdit ? (
                <button
                  type="button"
                  className="dt-act"
                  title="Edit"
                  onClick={() => setModal({ mode: "edit", category: cat })}
                >
                  <Pencil size={16} />
                </button>
              ) : null}
              {canDelete ? (
                <button
                  type="button"
                  className="dt-act danger"
                  title="Delete"
                  onClick={() => setDeleteTarget(cat)}
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

  const handleSave = async (
    data: CreateMenuCategoryInput | UpdateMenuCategoryInput,
  ) => {
    try {
      if (modal?.mode === "edit" && modal.category) {
        await updateCategory.mutateAsync({
          id: modal.category.id,
          data: data as UpdateMenuCategoryInput,
        });
        addToast({ title: "Category updated" });
      } else {
        await createCategory.mutateAsync(data as CreateMenuCategoryInput);
        addToast({ title: "Category added successfully" });
      }
      setModal(null);
    } catch (e) {
      addErrorToast({
        title: "Failed to save category",
        sub: e instanceof Error ? e.message : "Something went wrong",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCategory.mutateAsync(deleteTarget.id);
      addToast({ title: "Category deleted" });
      setDeleteTarget(null);
    } catch (e) {
      addErrorToast({
        title: "Failed to delete category",
        sub: e instanceof Error ? e.message : "Something went wrong",
      });
    }
  };

  const isSaving = createCategory.isPending || updateCategory.isPending;

  return (
    <>
      <PageHeader
        title="Menu Categories"
        desc="Organise menu items into categories"
        action={
          !isCashier ? (
            <Button onClick={() => setModal({ mode: "add" })}>
              <Plus className="size-4" />
              Add Category
            </Button>
          ) : undefined
        }
      />

      {isError ? (
        <div className="alert-error" style={{ marginBottom: 16 }}>
          {error instanceof Error
            ? error.message
            : "Failed to load categories."}
        </div>
      ) : null}

      <DataTable
        columns={columns}
        data={paged}
        rowCount={filtered.length}
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
        searchPlaceholder="Search categories…"
        isLoading={isPending}
        getRowId={(row) => row.id}
        emptyTitle="No categories found"
        emptyDescription={
          isCashier
            ? "No menu categories are available."
            : "Add your first category to get started."
        }
      />

      {modal ? (
        <CategoryModal
          key={modal.mode === "edit" ? (modal.category?.id ?? "edit") : "new"}
          open
          mode={modal.mode}
          category={modal.category}
          onClose={() => setModal(null)}
          onSave={(data) => void handleSave(data)}
          isSaving={isSaving}
        />
      ) : null}

      {deleteTarget ? (
        <ConfirmDialog
          title="Delete category?"
          message={`"${deleteTarget.name}" will be permanently deleted. This will fail if items are still assigned to it.`}
          confirmLabel="Delete"
          variant="danger"
          isLoading={deleteCategory.isPending}
          onConfirm={() => void handleDelete()}
          onClose={() => setDeleteTarget(null)}
        />
      ) : null}
    </>
  );
}
