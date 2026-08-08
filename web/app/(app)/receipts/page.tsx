"use client";

import { useMemo, useState } from "react";
import { FileText, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { PageHeader } from "@/components/ui/page-header";
import { useReceiptCentre, useDeleteReceipt } from "@/hooks/receipts/use-receipts";
import { useStores } from "@/hooks/stores/list-stores";
import { getCurrentMonthRange } from "@/lib/filters/dates";
import { useAppStore } from "@/store/app";
import type { Receipt } from "@/types/receipts/receipt";

const PAGE_SIZE = 24;

export default function ReceiptsPage() {
  const user = useAppStore((s) => s.user);
  const addToast = useAppStore((s) => s.addToast);
  const addErrorToast = useAppStore((s) => s.addErrorToast);
  const isAdmin = user?.role === "admin";

  const initialRange = useMemo(() => getCurrentMonthRange(), []);
  const [page, setPage] = useState(1);
  const [storeId, setStoreId] = useState<string | undefined>(undefined);
  const [fromDate, setFromDate] = useState(initialRange.fromDate);
  const [toDate, setToDate] = useState(initialRange.toDate);
  const [confirmDelete, setConfirmDelete] = useState<Receipt | null>(null);

  const { data: storesData } = useStores({ limit: 100 });
  const storeItems = useMemo(
    () =>
      (storesData?.data ?? []).map((store) => ({
        value: store.id,
        label: store.name,
      })),
    [storesData],
  );

  const query = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      storeId: isAdmin ? storeId : undefined,
      fromDate,
      toDate,
    }),
    [page, storeId, fromDate, toDate, isAdmin],
  );

  const { data, isPending, isError, error } = useReceiptCentre(query);
  const remove = useDeleteReceipt();

  const receipts = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const totalPages = data?.meta.totalPages ?? 1;

  const handleDelete = async (receipt: Receipt) => {
    try {
      await remove.mutateAsync(receipt.id);
      addToast({ title: "Receipt removed" });
      setConfirmDelete(null);
    } catch (e) {
      addErrorToast({
        title: "Could not remove receipt",
        sub: e instanceof Error ? e.message : "Something went wrong",
      });
    }
  };

  return (
    <>
      <PageHeader
        title="Receipt Centre"
        desc="Receipts attached to purchases — view, download, or remove"
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <DateRangePicker
          fromDate={fromDate}
          toDate={toDate}
          onChange={(range) => {
            setFromDate(range.fromDate);
            setToDate(range.toDate);
            setPage(1);
          }}
        />
        {isAdmin ? (
          <Combobox
            value={storeId}
            onValueChange={(value) => {
              setStoreId(value);
              setPage(1);
            }}
            items={storeItems}
            clearOption={{ label: "All branches" }}
            placeholder="All branches"
            searchPlaceholder="Search branches…"
            emptyText="No branches found."
          />
        ) : null}
      </div>

      {isError ? (
        <div className="alert-error">
          {error instanceof Error ? error.message : "Failed to load receipts."}
        </div>
      ) : isPending ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : receipts.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No receipts found. Attach receipts when recording a purchase.
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {receipts.map((r) => (
              <Card key={r.id} className="overflow-hidden">
                <a
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block aspect-[4/3] bg-muted"
                  title="Open receipt"
                >
                  {r.contentType === "application/pdf" ? (
                    <div className="flex h-full items-center justify-center">
                      <FileText className="size-10 text-muted-foreground" />
                    </div>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.url}
                      alt={r.originalName}
                      className="h-full w-full object-cover"
                    />
                  )}
                </a>
                <div className="grid gap-1 p-3">
                  <p className="truncate text-sm font-medium" title={r.itemName ?? ""}>
                    {r.itemName ?? "Purchase"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {r.vendorName ?? "—"} · {r.storeName ?? "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.purchaseDate ?? r.createdAt.slice(0, 10)}
                  </p>
                  <div className="mt-1 flex items-center justify-between">
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      View
                    </a>
                    <button
                      type="button"
                      className="rounded-md p-1 text-muted-foreground transition-colors hover:text-destructive"
                      onClick={() => setConfirmDelete(r)}
                      aria-label="Remove receipt"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {total} receipt{total === 1 ? "" : "s"}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      {confirmDelete ? (
        <ConfirmDialog
          title="Remove this receipt?"
          message={`"${confirmDelete.originalName}" will be permanently deleted.`}
          confirmLabel="Remove"
          isLoading={remove.isPending}
          onConfirm={() => void handleDelete(confirmDelete)}
          onClose={() => setConfirmDelete(null)}
        />
      ) : null}
    </>
  );
}
