"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { FileText, Pencil, Plus, Settings2, Trash2 } from "lucide-react";

import {
  PurchaseEntryModal,
  type PurchaseEntryFormValues,
} from "./components/purchase-entry-modal";
import { ReceiptLightbox } from "./components/receipt-lightbox";
import { VendorListModal } from "./components/vendor-list-modal";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Button } from "@/components/ui/button";
import { MultiCombobox } from "@/components/ui/combobox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { PageHeader } from "@/components/ui/page-header";
import { SummaryBar } from "@/components/ui/summary-bar";
import {
  useCreatePurchaseEntry,
  useDeletePurchaseEntry,
  usePurchaseEntries,
  useUpdatePurchaseEntry,
} from "@/hooks/purchase-entries/use-purchase-entries";
import { useUploadReceipt } from "@/hooks/receipts/use-receipts";
import { useVendorSpend } from "@/hooks/reports/use-vendor-spend";
import { useStores } from "@/hooks/stores/list-stores";
import { useVendors } from "@/hooks/vendors/use-vendors";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { dateToYmd, getCurrentMonthRange } from "@/lib/filters/dates";
import { fmt } from "@/lib/utils";
import { useAppStore } from "@/store/app";
import type {
  PurchaseEntry,
  PurchaseReceiptThumb,
} from "@/types/purchases/purchase-entry";

/** Purchase day as a clean date, e.g. 2026-08-04 (drops any time part). */
function purchaseDay(value: string): string {
  return value.slice(0, 10);
}

type ModalState = { mode: "add" } | { mode: "edit"; entry: PurchaseEntry };

export default function PurchasesPage() {
  const user = useAppStore((s) => s.user);
  const addToast = useAppStore((s) => s.addToast);
  const addErrorToast = useAppStore((s) => s.addErrorToast);
  const isAdmin = user?.role === "admin";
  const managerMulti =
    user?.role === "manager" && (user.storeIds?.length ?? 0) > 1;
  const showStoreField = isAdmin || managerMulti;
  const today = useMemo(() => dateToYmd(new Date()), []);
  const defaultRange = useMemo(() => getCurrentMonthRange(), []);

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [storeIds, setStoreIds] = useState<string[]>([]);
  const [vendorIds, setVendorIds] = useState<string[]>([]);
  const [fromDate, setFromDate] = useState(defaultRange.fromDate);
  const [toDate, setToDate] = useState(defaultRange.toDate);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PurchaseEntry | null>(null);
  const [lightbox, setLightbox] = useState<{
    receipts: PurchaseReceiptThumb[];
    index: number;
  } | null>(null);
  const [showVendors, setShowVendors] = useState(false);

  const debouncedSearch = useDebouncedValue(search, 300);

  const listQuery = useMemo(
    () => ({
      page: pageIndex + 1,
      limit: pageSize,
      search: debouncedSearch || undefined,
      storeIds: showStoreField ? storeIds : undefined,
      vendorIds,
      fromDate,
      toDate,
    }),
    [
      pageIndex,
      pageSize,
      debouncedSearch,
      storeIds,
      vendorIds,
      fromDate,
      toDate,
      showStoreField,
    ],
  );

  const { data: storesData } = useStores({ limit: 100 });
  const { data: vendorsData, isPending: vendorsPending } = useVendors();
  const { data, isPending, isFetching, isError, error } = usePurchaseEntries(listQuery);
  const vendorSpendQuery = useMemo(
    () => ({
      fromDate,
      toDate,
      storeId: showStoreField && storeIds.length > 0 ? storeIds.join(",") : undefined,
    }),
    [fromDate, toDate, storeIds, showStoreField],
  );
  const { data: vendorSpendData } = useVendorSpend(vendorSpendQuery, {
    enabled: vendorIds.length > 0,
  });
  const createEntry = useCreatePurchaseEntry();
  const updateEntry = useUpdatePurchaseEntry();
  const deleteEntry = useDeletePurchaseEntry();
  const uploadReceipt = useUploadReceipt();

  const rows = data?.data ?? [];
  const rowCount = data?.meta.total ?? 0;
  const isLoading = isPending || (isFetching && rows.length === 0);
  const vendors = vendorsData ?? [];

  const storeItems = useMemo(() => {
    if (isAdmin) {
      return (storesData?.data ?? []).map((store) => ({
        value: store.id,
        label: store.name,
      }));
    }
    return (user?.stores ?? []).map((store) => ({
      value: store.id,
      label: store.name,
    }));
  }, [isAdmin, storesData?.data, user?.stores]);

  const vendorItems = useMemo(
    () => vendors.map((v) => ({ value: v.id, label: v.name })),
    [vendors],
  );

  const vendorTotals = useMemo(() => {
    if (vendorIds.length === 0) return null;
    const byId = new Map((vendorSpendData?.vendors ?? []).map((v) => [v.vendorId, v]));
    const rows = vendorIds
      .map((id) => {
        const spend = byId.get(id);
        const label = spend?.vendorName ?? vendorItems.find((v) => v.value === id)?.label ?? id;
        return { id, label, totalAmount: spend?.totalAmount ?? 0 };
      })
      .sort((a, b) => b.totalAmount - a.totalAmount);
    const total = rows.reduce((sum, r) => sum + r.totalAmount, 0);
    return { rows, total };
  }, [vendorIds, vendorSpendData, vendorItems]);

  const columns = useMemo<ColumnDef<PurchaseEntry>[]>(
    () => [
      {
        accessorKey: "purchaseDate",
        meta: { label: "Date" },
        header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
        cell: ({ row }) => (
          <span className="muted">{purchaseDay(row.original.purchaseDate)}</span>
        ),
      },
      {
        accessorKey: "itemName",
        meta: { label: "Item" },
        header: ({ column }) => <DataTableColumnHeader column={column} title="Item" />,
        cell: ({ row }) => <span className="strong">{row.original.itemName}</span>,
      },
      {
        id: "vendor",
        accessorFn: (row) => row.vendor.name,
        meta: { label: "Vendor" },
        header: ({ column }) => <DataTableColumnHeader column={column} title="Vendor" />,
        cell: ({ row }) => <span>{row.original.vendor.name}</span>,
      },
      {
        id: "branch",
        accessorFn: (row) => row.store.name,
        meta: { label: "Branch" },
        header: ({ column }) => <DataTableColumnHeader column={column} title="Branch" />,
        cell: ({ row }) => <span className="muted">{row.original.store.name}</span>,
      },
      {
        accessorKey: "quantity",
        meta: { label: "Qty" },
        header: ({ column }) => <DataTableColumnHeader column={column} title="Qty" />,
        cell: ({ row }) => <span className="tabular-nums">{row.original.quantity}</span>,
      },
      {
        accessorKey: "unitPrice",
        meta: { label: "Unit price" },
        header: ({ column }) => <DataTableColumnHeader column={column} title="Unit price" />,
        cell: ({ row }) => <span className="tabular-nums">{fmt(row.original.unitPrice)}</span>,
      },
      {
        accessorKey: "totalCost",
        meta: { label: "Total" },
        header: ({ column }) => <DataTableColumnHeader column={column} title="Total" />,
        cell: ({ row }) => (
          <span className="strong tabular-nums">{fmt(row.original.totalCost)}</span>
        ),
      },
      {
        id: "createdBy",
        accessorFn: (row) => row.createdBy.name,
        meta: { label: "By" },
        header: ({ column }) => <DataTableColumnHeader column={column} title="By" />,
        cell: ({ row }) => <span className="muted">{row.original.createdBy.name}</span>,
      },
      {
        id: "receipt",
        header: "Receipt",
        enableSorting: false,
        cell: ({ row }) => {
          const receipts = row.original.receipts ?? [];
          if (receipts.length === 0) {
            return <span className="muted text-xs">—</span>;
          }
          const first = receipts[0];
          const isImage =
            first.contentType.startsWith("image/") && Boolean(first.url);
          return (
            <button
              type="button"
              title="View receipt"
              className="relative flex size-10 items-center justify-center overflow-hidden rounded-md border border-border bg-muted"
              onClick={() => setLightbox({ receipts, index: 0 })}
            >
              {isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={first.url} alt="" className="size-full object-cover" />
              ) : (
                <FileText className="size-4 text-muted-foreground" />
              )}
              {receipts.length > 1 ? (
                <span className="absolute -right-1 -top-1 rounded-full bg-primary px-1 text-[10px] font-medium leading-4 text-primary-foreground">
                  +{receipts.length - 1}
                </span>
              ) : null}
            </button>
          );
        },
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => {
          const entry = row.original;
          const editable = isAdmin || purchaseDay(entry.purchaseDate) === today;
          return (
            <div className="flex items-center justify-end gap-1">
              <Button
                variant="ghost"
                size="icon"
                title={editable ? "Edit purchase" : "Managers can only edit today's purchases"}
                disabled={!editable}
                onClick={() => setModal({ mode: "edit", entry })}
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                title={editable ? "Delete purchase" : "Managers can only remove today's purchases"}
                disabled={!editable}
                onClick={() => setDeleteTarget(entry)}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          );
        },
      },
    ],
    [isAdmin, today],
  );

  const handleSave = async (form: PurchaseEntryFormValues) => {
    try {
      const base = {
        itemName: form.itemName.trim(),
        quantity: Number(form.quantity),
        unitPrice: Number(form.unitPrice),
        vendorId: form.vendorId ?? "",
        purchaseDate: form.purchaseDate,
        note: form.note.trim() || undefined,
      };
      if (modal?.mode === "edit") {
        await updateEntry.mutateAsync({ id: modal.entry.id, input: base });
        addToast({ title: "Purchase updated" });
      } else {
        const created = await createEntry.mutateAsync({
          ...base,
          ...(showStoreField ? { storeId: form.storeId } : {}),
        });
        if (form.receiptFiles.length > 0 && created?.id) {
          const results = await Promise.allSettled(
            form.receiptFiles.map((file) =>
              uploadReceipt.mutateAsync({ purchaseId: created.id, file }),
            ),
          );
          const failed = results.filter((r) => r.status === "rejected").length;
          if (failed > 0) {
            addErrorToast({
              title: `${failed} of ${form.receiptFiles.length} receipts didn't upload`,
              sub: "You can attach them later by editing the purchase.",
            });
          }
        }
        addToast({ title: "Purchase recorded" });
      }
      setModal(null);
    } catch (e) {
      addErrorToast({
        title: "Failed to save purchase",
        sub: e instanceof Error ? e.message : "Something went wrong",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteEntry.mutateAsync(deleteTarget.id);
      addToast({ title: "Purchase deleted" });
      setDeleteTarget(null);
    } catch (e) {
      addErrorToast({
        title: "Failed to delete purchase",
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
      <MultiCombobox
        values={vendorIds}
        onValuesChange={(values) => {
          setVendorIds(values);
          setPageIndex(0);
        }}
        items={vendorItems}
        placeholder="All vendors"
        searchPlaceholder="Search vendors…"
        emptyText="No vendors found."
        loading={vendorsPending}
      />
      {showStoreField ? (
        <MultiCombobox
          values={storeIds}
          onValuesChange={(values) => {
            setStoreIds(values);
            setPageIndex(0);
          }}
          items={storeItems}
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
        title="Purchases"
        desc={
          isAdmin
            ? "Supplies bought for each branch — cups, syrups, milk, packaging"
            : managerMulti
              ? "Supplies bought for your assigned branches"
              : `Supplies bought for ${user?.store ?? "your branch"}`
        }
        action={
          <div className="flex items-center gap-2">
            {isAdmin ? (
              <Button variant="outline" onClick={() => setShowVendors(true)}>
                <Settings2 className="size-4" />
                Manage Vendors
              </Button>
            ) : null}
            <Button onClick={() => setModal({ mode: "add" })}>
              <Plus className="size-4" />
              Record Purchase
            </Button>
          </div>
        }
      />

      {isError && (
        <div className="alert-error" style={{ marginBottom: 16 }}>
          {error instanceof Error ? error.message : "Failed to load purchases."}
        </div>
      )}

      {vendorTotals && (
        <div style={{ marginBottom: 16 }}>
          <SummaryBar
            items={[
              ...vendorTotals.rows.map((r) => ({ k: r.label, v: fmt(r.totalAmount) })),
              ...(vendorTotals.rows.length > 1
                ? [{ k: "Total", v: fmt(vendorTotals.total) }]
                : []),
            ]}
          />
        </div>
      )}

      <DataTable
        columns={columns}
        data={rows}
        rowCount={rowCount}
        pageIndex={pageIndex}
        pageSize={pageSize}
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPageIndex(0);
        }}
        searchPlaceholder="Search item, vendor, note…"
        onPaginationChange={({ pageIndex: nextIndex, pageSize: nextSize }) => {
          setPageIndex(nextIndex);
          setPageSize(nextSize);
        }}
        isLoading={isLoading}
        toolbarExtra={toolbarExtra}
        emptyTitle="No purchases"
        emptyDescription="Record the first supply purchase for this period."
        getRowId={(row) => row.id}
      />

      {modal && (
        <PurchaseEntryModal
          key={modal.mode === "edit" ? modal.entry.id : "new"}
          open
          mode={modal.mode}
          entry={modal.mode === "edit" ? modal.entry : undefined}
          isAdmin={isAdmin}
          showStoreField={showStoreField}
          storeItems={storeItems}
          vendorItems={vendorItems}
          vendorsLoading={vendorsPending}
          onClose={() => setModal(null)}
          onSave={(form) => void handleSave(form)}
          isSaving={createEntry.isPending || updateEntry.isPending || uploadReceipt.isPending}
          onManageVendors={isAdmin ? () => setShowVendors(true) : undefined}
        />
      )}

      <VendorListModal open={showVendors} onClose={() => setShowVendors(false)} />

      {deleteTarget ? (
        <ConfirmDialog
          title="Delete purchase?"
          message={`Delete "${deleteTarget.itemName}" (${purchaseDay(deleteTarget.purchaseDate)}, ${deleteTarget.store.name})? This cannot be undone.`}
          confirmLabel="Delete"
          isLoading={deleteEntry.isPending}
          onConfirm={() => void handleDelete()}
          onClose={() => setDeleteTarget(null)}
        />
      ) : null}

      {lightbox ? (
        <ReceiptLightbox
          receipts={lightbox.receipts}
          startIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      ) : null}
    </>
  );
}
