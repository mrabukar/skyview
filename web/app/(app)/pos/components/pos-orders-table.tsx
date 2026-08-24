"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { CheckCircle2, Ban, Receipt, XCircle } from "lucide-react";

import { ConfirmPaymentModal } from "./confirm-payment-modal";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Combobox } from "@/components/ui/combobox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";
import {
  usePosOrders,
  usePayPosOrder,
  useVoidPosOrder,
  useCancelPosOrder,
} from "@/hooks/pos/use-pos-orders";
import { useStores } from "@/hooks/stores/list-stores";
import { useAppStore } from "@/store/app";
import { paymentLabel } from "@/lib/pos/invoice";
import type { PosOrder, PosOrderQuery, OrderStatus, PaymentMethod } from "@/types/pos/order";

// ── Formatting helpers ─────────────────────────────────────────────────────────

function fmtAmount(val: string | number): string {
  const n = Number(val);
  if (isNaN(n)) return String(val);
  return `KSh ${n.toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function OrderStatusBadge({ status }: { status: PosOrder["status"] }) {
  const cfg: Record<OrderStatus, { label: string; cls: string }> = {
    pending: {
      label: "Pending",
      cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    },
    paid: {
      label: "Paid",
      cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    },
    cancelled: { label: "Cancelled", cls: "bg-muted text-muted-foreground" },
    voided: {
      label: "Voided",
      cls: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
    },
  };
  const { label, cls } = cfg[status] ?? {
    label: status,
    cls: "bg-muted text-muted-foreground",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}
    >
      {label}
    </span>
  );
}

// ── Status filter chips ────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: OrderStatus | undefined; label: string }[] = [
  { value: undefined, label: "All" },
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "cancelled", label: "Cancelled" },
  { value: "voided", label: "Voided" },
];

// ── Component ──────────────────────────────────────────────────────────────────

interface Props {
  title?: string;
  desc?: string;
  /** Pre-applied filters (e.g. storeId for history view). */
  baseQuery?: Partial<PosOrderQuery>;
}

/**
 * Re-usable POS orders table.
 * Used by admin/manager at /pos and by cashier at /pos/history.
 */
export function PosOrdersTable({
  title = "POS Orders",
  desc,
  baseQuery = {},
}: Props) {
  const user = useAppStore((s) => s.user);
  const addToast = useAppStore((s) => s.addToast);
  const addErrorToast = useAppStore((s) => s.addErrorToast);

  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "manager";
  const isCashier = user?.role === "cashier";
  const managerMulti = isManager && (user?.storeIds?.length ?? 0) > 1;
  const showBranchFilter = isAdmin || managerMulti;
  const canVoid = isAdmin || isManager;
  const canCancelAnyPending = isAdmin || isManager;

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | undefined>(
    undefined,
  );
  const [storeId, setStoreId] = useState<string | undefined>();
  const [voidTarget, setVoidTarget] = useState<PosOrder | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [voidErr, setVoidErr] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<PosOrder | null>(null);
  const [cancelTarget, setCancelTarget] = useState<PosOrder | null>(null);

  const listQuery = useMemo<PosOrderQuery>(
    () => ({
      ...baseQuery,
      page: pageIndex + 1,
      limit: pageSize,
      status: statusFilter,
      ...(showBranchFilter && storeId ? { storeId } : {}),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pageIndex, pageSize, statusFilter, storeId, showBranchFilter, JSON.stringify(baseQuery)],
  );

  const { data: storesData, isPending: storesPending } = useStores(
    { limit: 100 },
    { enabled: isAdmin },
  );

  const branchItems = useMemo(() => {
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

  const { data, isPending, isFetching, isError, error } =
    usePosOrders(listQuery);
  const payOrder = usePayPosOrder();
  const voidOrder = useVoidPosOrder();
  const cancelOrder = useCancelPosOrder();

  const isLoading =
    isPending || (isFetching && (data?.data.length ?? 0) === 0);
  const rows = data?.data ?? [];
  const rowCount = data?.meta.total ?? 0;

  const columns = useMemo<ColumnDef<PosOrder>[]>(() => {
    const cols: ColumnDef<PosOrder>[] = [
      {
        accessorKey: "orderNumber",
        meta: { label: "Order #" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Order #" />
        ),
        cell: ({ row }) => (
          <span className="strong">#{row.original.orderNumber}</span>
        ),
      },
      {
        accessorKey: "createdAt",
        meta: {
          label: "Date",
          exportValue: (row: PosOrder) => fmtDate(row.createdAt),
        },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Date" />
        ),
        cell: ({ row }) => (
          <span className="muted">{fmtDate(row.original.createdAt)}</span>
        ),
      },
      {
        id: "cashier",
        meta: { label: "Cashier" },
        header: "Cashier",
        cell: ({ row }) => (
          <span className="muted">{row.original.cashier?.name ?? "—"}</span>
        ),
        enableSorting: false,
      },
    ];

    if (isAdmin || managerMulti) {
      cols.push({
        id: "branch",
        meta: { label: "Branch" },
        header: "Branch",
        cell: ({ row }) => (
          <span className="muted">{row.original.store?.name ?? "—"}</span>
        ),
        enableSorting: false,
      });
    }

    cols.push(
      {
        accessorKey: "status",
        meta: {
          label: "Status",
          exportValue: (row: PosOrder) => row.status,
        },
        header: "Status",
        cell: ({ row }) => (
          <OrderStatusBadge status={row.original.status} />
        ),
        enableSorting: false,
      },
      {
        id: "paymentMethod",
        meta: { label: "Payment" },
        header: "Payment",
        cell: ({ row }) => {
          const pm = row.original.paymentMethod;
          return (
            <span className="muted">{pm ? paymentLabel(pm) : "—"}</span>
          );
        },
        enableSorting: false,
      },
      {
        accessorKey: "totalAmount",
        meta: {
          label: "Total",
          exportValue: (row: PosOrder) => fmtAmount(row.totalAmount),
        },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Total" />
        ),
        cell: ({ row }) => (
          <span className="strong">{fmtAmount(row.original.totalAmount)}</span>
        ),
      },
      {
        id: "actions",
        meta: { export: false },
        header: "Actions",
        cell: ({ row }) => {
          const order = row.original;
          const canCancelPending =
            order.status === "pending" &&
            (canCancelAnyPending ||
              (isCashier && order.cashierId === user?.id));
          return (
            <div className="dt-actions">
              {isCashier && order.status === "pending" ? (
                <button
                  type="button"
                  className="dt-act"
                  title="Confirm payment"
                  onClick={() => setConfirmTarget(order)}
                >
                  <CheckCircle2 size={16} className="text-emerald-600" />
                </button>
              ) : null}
              {order.status === "paid" ? (
                <Link
                  href={`/pos/invoice/${order.id}`}
                  className="dt-act"
                  title="View receipt"
                >
                  <Receipt size={16} />
                </Link>
              ) : null}
              {canCancelPending ? (
                <button
                  type="button"
                  className="dt-act danger"
                  title="Cancel order"
                  onClick={() => setCancelTarget(order)}
                >
                  <XCircle size={16} />
                </button>
              ) : null}
              {canVoid && order.status === "paid" ? (
                <button
                  type="button"
                  className="dt-act danger"
                  title="Void order"
                  onClick={() => {
                    setVoidTarget(order);
                    setVoidReason("");
                    setVoidErr(null);
                  }}
                >
                  <Ban size={16} />
                </button>
              ) : null}
            </div>
          );
        },
        enableSorting: false,
        enableHiding: false,
      },
    );

    return cols;
  }, [isAdmin, isCashier, managerMulti, canVoid, canCancelAnyPending, user?.id]);

  // ── Confirm payment handler ──────────────────────────────────────────────────

  const handleConfirmPayment = async (method: PaymentMethod) => {
    if (!confirmTarget) return;
    try {
      await payOrder.mutateAsync({
        id: confirmTarget.id,
        data: { paymentMethod: method },
      });
      addToast({ title: `Order #${confirmTarget.orderNumber} paid (${paymentLabel(method)})` });
      setConfirmTarget(null);
    } catch (e) {
      addErrorToast({
        title: "Payment failed",
        sub: e instanceof Error ? e.message : "Something went wrong",
      });
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    try {
      await cancelOrder.mutateAsync(cancelTarget.id);
      addToast({ title: `Order #${cancelTarget.orderNumber} cancelled` });
      setCancelTarget(null);
    } catch (e) {
      addErrorToast({
        title: "Failed to cancel order",
        sub: e instanceof Error ? e.message : "Something went wrong",
      });
    }
  };

  // ── Void handler ─────────────────────────────────────────────────────────────

  const handleVoid = async () => {
    if (!voidTarget) return;
    if (!voidReason.trim()) {
      setVoidErr("A reason is required to void an order.");
      return;
    }
    try {
      await voidOrder.mutateAsync({
        id: voidTarget.id,
        data: { reason: voidReason.trim() },
      });
      addToast({ title: `Order #${voidTarget.orderNumber} voided` });
      setVoidTarget(null);
    } catch (e) {
      addErrorToast({
        title: "Failed to void order",
        sub: e instanceof Error ? e.message : "Something went wrong",
      });
    }
  };

  // ── Status filter toolbar ─────────────────────────────────────────────────────

  const toolbarExtra = (
    <div className="flex flex-wrap items-center gap-2">
      {showBranchFilter ? (
        <Combobox
          value={storeId}
          onValueChange={(value) => {
            setStoreId(value);
            setPageIndex(0);
          }}
          items={branchItems}
          clearOption={{ label: "All branches" }}
          placeholder="All branches"
          searchPlaceholder="Search branches…"
          emptyText="No branches found."
          loading={isAdmin && storesPending}
        />
      ) : null}
      {STATUS_OPTIONS.map((opt) => (
        <button
          key={String(opt.value)}
          type="button"
          onClick={() => {
            setStatusFilter(opt.value);
            setPageIndex(0);
          }}
          className={cn(
            "rounded-full border px-3 py-1 text-xs transition-colors",
            statusFilter === opt.value
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background text-foreground hover:bg-muted",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );

  return (
    <>
      <PageHeader
        title={title}
        desc={
          desc ??
          (isAdmin
            ? "All POS orders across the organisation"
            : managerMulti
              ? "POS orders for your branches"
              : "POS orders for your branch")
        }
      />

      {isError ? (
        <div className="alert-error" style={{ marginBottom: 16 }}>
          {error instanceof Error
            ? error.message
            : "Failed to load orders."}
        </div>
      ) : null}

      <DataTable
        columns={columns}
        data={rows}
        rowCount={rowCount}
        pageIndex={pageIndex}
        pageSize={pageSize}
        onPaginationChange={({ pageIndex: nextPage, pageSize: nextSize }) => {
          setPageIndex(nextPage);
          setPageSize(nextSize);
        }}
        isLoading={isLoading}
        getRowId={(row) => row.id}
        emptyTitle="No orders found"
        emptyDescription="No POS orders match the current filters."
        toolbarExtra={toolbarExtra}
      />

      {/* Confirm payment modal — shown on pending orders */}
      {confirmTarget ? (
        <ConfirmPaymentModal
          open
          orderNumber={confirmTarget.orderNumber}
          total={confirmTarget.totalAmount}
          isLoading={payOrder.isPending}
          onConfirm={(method) => void handleConfirmPayment(method)}
          onClose={() => setConfirmTarget(null)}
        />
      ) : null}

      {cancelTarget ? (
        <ConfirmDialog
          title={`Cancel Order #${cancelTarget.orderNumber}?`}
          message="This pending order will be cancelled. This cannot be undone."
          confirmLabel="Cancel Order"
          isLoading={cancelOrder.isPending}
          onConfirm={() => void handleCancel()}
          onClose={() => setCancelTarget(null)}
        />
      ) : null}

      {/* Void dialog — inline because it needs a reason textarea */}
      {voidTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-lg">
            <h3 className="mb-1 text-base font-semibold">
              Void Order #{voidTarget.orderNumber}?
            </h3>
            <p className="mb-4 text-sm text-muted-foreground">
              This action cannot be undone. The order will be permanently marked
              as voided.
            </p>

            <div className="mb-4 grid gap-2">
              <label className="text-sm font-medium">
                Reason <span className="text-destructive">*</span>
              </label>
              <textarea
                className="flex min-h-[80px] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={voidReason}
                onChange={(e) => {
                  setVoidReason(e.target.value);
                  setVoidErr(null);
                }}
                placeholder="Enter a reason for voiding this order…"
                maxLength={500}
              />
              {voidErr ? (
                <p className="text-sm text-destructive">{voidErr}</p>
              ) : null}
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
                onClick={() => setVoidTarget(null)}
                disabled={voidOrder.isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50"
                onClick={() => void handleVoid()}
                disabled={voidOrder.isPending}
              >
                {voidOrder.isPending ? "Voiding…" : "Void Order"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
