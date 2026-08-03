"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { DailySaleModal, type DailySaleFormValues } from "./components/daily-sale-modal";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { PageHeader } from "@/components/ui/page-header";
import {
  useCreateDailySale,
  useDailySales,
  useDeleteDailySale,
  useUpdateDailySale,
} from "@/hooks/daily-sales/use-daily-sales";
import { useStores } from "@/hooks/stores/list-stores";
import { dateToYmd, getCurrentMonthRange } from "@/lib/filters/dates";
import { fmt } from "@/lib/utils";
import { useAppStore } from "@/store/app";
import type { DailySale } from "@/types/daily-sales/daily-sale";

type ModalState = { mode: "add" } | { mode: "edit"; sale: DailySale };

export default function DailySalesPage() {
  const user = useAppStore((s) => s.user);
  const addToast = useAppStore((s) => s.addToast);
  const addErrorToast = useAppStore((s) => s.addErrorToast);
  const isAdmin = user?.role === "admin";
  const today = useMemo(() => dateToYmd(new Date()), []);
  const defaultRange = useMemo(() => getCurrentMonthRange(), []);

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [storeId, setStoreId] = useState<string | undefined>();
  const [fromDate, setFromDate] = useState(defaultRange.fromDate);
  const [toDate, setToDate] = useState(defaultRange.toDate);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DailySale | null>(null);

  const listQuery = useMemo(
    () => ({
      page: pageIndex + 1,
      limit: pageSize,
      storeId: isAdmin ? storeId : undefined,
      fromDate,
      toDate,
    }),
    [pageIndex, pageSize, storeId, fromDate, toDate, isAdmin],
  );

  const { data: storesData } = useStores({ limit: 100 });
  const { data, isPending, isFetching, isError, error } = useDailySales(listQuery);
  const createSale = useCreateDailySale();
  const updateSale = useUpdateDailySale();
  const deleteSale = useDeleteDailySale();

  const rows = data?.data ?? [];
  const rowCount = data?.meta.total ?? 0;
  const isLoading = isPending || (isFetching && rows.length === 0);

  const storeItems = useMemo(
    () =>
      (storesData?.data ?? []).map((store) => ({
        value: store.id,
        label: store.name,
      })),
    [storesData],
  );

  const columns = useMemo<ColumnDef<DailySale>[]>(
    () => [
      {
        accessorKey: "saleDate",
        meta: { label: "Date" },
        header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
        cell: ({ row }) => (
          <span className="muted flex items-center gap-2">
            {row.original.saleDate}
            {row.original.saleDate === today ? <Badge color="teal">Today</Badge> : null}
          </span>
        ),
      },
      {
        id: "branch",
        accessorFn: (row) => row.store.name,
        meta: { label: "Branch" },
        header: ({ column }) => <DataTableColumnHeader column={column} title="Branch" />,
        cell: ({ row }) => <span className="strong">{row.original.store.name}</span>,
      },
      {
        accessorKey: "totalAmount",
        meta: { label: "Sales total" },
        header: ({ column }) => <DataTableColumnHeader column={column} title="Sales total" />,
        cell: ({ row }) => (
          <span className="strong tabular-nums">{fmt(row.original.totalAmount)}</span>
        ),
      },
      {
        id: "enteredBy",
        accessorFn: (row) => row.enteredBy.name,
        meta: { label: "Entered by" },
        header: ({ column }) => <DataTableColumnHeader column={column} title="Entered by" />,
        cell: ({ row }) => <span className="muted">{row.original.enteredBy.name}</span>,
      },
      {
        accessorKey: "note",
        meta: { label: "Note" },
        header: "Note",
        cell: ({ row }) => (
          <span className="muted line-clamp-1 max-w-[220px]">
            {row.original.note ?? "—"}
          </span>
        ),
        enableSorting: false,
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => {
          const sale = row.original;
          const editable = isAdmin || sale.saleDate === today;
          return (
            <div className="flex items-center justify-end gap-1">
              <Button
                variant="ghost"
                size="icon"
                title={editable ? "Edit entry" : "Managers can only edit today's entry"}
                disabled={!editable}
                onClick={() => setModal({ mode: "edit", sale })}
              >
                <Pencil className="size-4" />
              </Button>
              {isAdmin ? (
                <Button
                  variant="ghost"
                  size="icon"
                  title="Delete entry"
                  onClick={() => setDeleteTarget(sale)}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              ) : null}
            </div>
          );
        },
      },
    ],
    [isAdmin, today],
  );

  const handleSave = async (form: DailySaleFormValues) => {
    try {
      if (modal?.mode === "edit") {
        await updateSale.mutateAsync({
          id: modal.sale.id,
          input: {
            saleDate: form.saleDate,
            totalAmount: Number(form.totalAmount),
            note: form.note.trim() || undefined,
          },
        });
        addToast({ title: "Sales entry updated" });
      } else {
        await createSale.mutateAsync({
          ...(isAdmin ? { storeId: form.storeId } : {}),
          saleDate: form.saleDate,
          totalAmount: Number(form.totalAmount),
          note: form.note.trim() || undefined,
        });
        addToast({ title: "Sales entry added" });
      }
      setModal(null);
    } catch (e) {
      addErrorToast({
        title: "Failed to save sales entry",
        sub: e instanceof Error ? e.message : "Something went wrong",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteSale.mutateAsync(deleteTarget.id);
      addToast({ title: "Sales entry deleted" });
      setDeleteTarget(null);
    } catch (e) {
      addErrorToast({
        title: "Failed to delete entry",
        sub: e instanceof Error ? e.message : "Something went wrong",
      });
    }
  };

  const toolbarExtra = (
    <div className="flex flex-wrap items-center gap-2">
      <DateRangePicker
        fromDate={fromDate}
        toDate={toDate}
        onChange={(range) => {
          setFromDate(range.fromDate);
          setToDate(range.toDate);
          setPageIndex(0);
        }}
      />
      {isAdmin ? (
        <Combobox
          value={storeId}
          onValueChange={(value) => {
            setStoreId(value);
            setPageIndex(0);
          }}
          items={storeItems}
          clearOption={{ label: "All branches" }}
          placeholder="All branches"
          searchPlaceholder="Search branches…"
          emptyText="No branches found."
        />
      ) : null}
    </div>
  );

  return (
    <>
      <PageHeader
        title="Daily Sales"
        desc={
          isAdmin
            ? "One sales total per branch per day, across all branches"
            : `Daily sales totals for ${user?.store ?? "your branch"}`
        }
        action={
          <Button onClick={() => setModal({ mode: "add" })}>
            <Plus className="size-4" />
            Record Today&apos;s Sales
          </Button>
        }
      />

      {isError && (
        <div className="alert-error" style={{ marginBottom: 16 }}>
          {error instanceof Error ? error.message : "Failed to load sales."}
        </div>
      )}

      <DataTable
        columns={columns}
        data={rows}
        rowCount={rowCount}
        pageIndex={pageIndex}
        pageSize={pageSize}
        onPaginationChange={({ pageIndex: nextIndex, pageSize: nextSize }) => {
          setPageIndex(nextIndex);
          setPageSize(nextSize);
        }}
        isLoading={isLoading}
        toolbarExtra={toolbarExtra}
        emptyTitle="No sales entries"
        emptyDescription="Record the first daily sales total for this period."
        getRowId={(row) => row.id}
      />

      {modal && (
        <DailySaleModal
          key={modal.mode === "edit" ? modal.sale.id : "new"}
          open
          mode={modal.mode}
          sale={modal.mode === "edit" ? modal.sale : undefined}
          isAdmin={isAdmin}
          storeItems={storeItems}
          onClose={() => setModal(null)}
          onSave={(form) => void handleSave(form)}
          isSaving={createSale.isPending || updateSale.isPending}
        />
      )}

      {deleteTarget ? (
        <ConfirmDialog
          title="Delete sales entry?"
          message={`Delete the ${deleteTarget.saleDate} entry for ${deleteTarget.store.name}? This cannot be undone.`}
          confirmLabel="Delete"
          isLoading={deleteSale.isPending}
          onConfirm={() => void handleDelete()}
          onClose={() => setDeleteTarget(null)}
        />
      ) : null}
    </>
  );
}
