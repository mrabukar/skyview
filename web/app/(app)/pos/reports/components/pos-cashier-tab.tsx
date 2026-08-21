"use client";

import { useMemo, useState } from "react";
import type { ColumnDef, PaginationState } from "@tanstack/react-table";
import { Users, XCircle } from "lucide-react";

import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { StatCard } from "@/app/(app)/dashboard/components/stat-card";
import { usePosCashierPerformance } from "@/hooks/reports/use-pos-reports";
import { fmt } from "@/lib/utils";
import type {
  PosCashierRow,
  PosReportQuery,
} from "@/types/reports/pos-reports";

interface Props {
  query: PosReportQuery;
}

export function PosCashierTab({ query }: Props) {
  const { data, isPending, isError, error } = usePosCashierPerformance(query);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const columns = useMemo<ColumnDef<PosCashierRow>[]>(
    () => [
      {
        accessorKey: "cashierName",
        meta: { label: "Cashier", align: "left" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Cashier" />
        ),
        cell: ({ row }) => (
          <span className="strong">{row.original.cashierName}</span>
        ),
      },
      {
        accessorKey: "orderCount",
        meta: { label: "Orders", align: "right" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Orders" />
        ),
        cell: ({ row }) => (
          <span className="num">
            {row.original.orderCount.toLocaleString()}
          </span>
        ),
      },
      {
        accessorKey: "revenue",
        meta: { label: "Revenue", align: "right" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Revenue" />
        ),
        cell: ({ row }) => (
          <span className="num strong">{fmt(row.original.revenue)}</span>
        ),
      },
      {
        accessorKey: "avgOrderValue",
        meta: { label: "Avg Order", align: "right" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Avg Order" />
        ),
        cell: ({ row }) => (
          <span className="num">{fmt(row.original.avgOrderValue)}</span>
        ),
      },
      {
        accessorKey: "totalDiscountGiven",
        meta: { label: "Discounts", align: "right" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Discounts" />
        ),
        cell: ({ row }) => (
          <span className="num">
            {fmt(row.original.totalDiscountGiven)}
          </span>
        ),
      },
      {
        accessorKey: "voidedCount",
        meta: { label: "Voids", align: "right" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Voids" />
        ),
        cell: ({ row }) => (
          <span className="num">
            {row.original.voidedCount.toLocaleString()}
          </span>
        ),
      },
    ],
    [],
  );

  const pageRows = useMemo(() => {
    const rows = data?.cashiers ?? [];
    const start = pageIndex * pageSize;
    return rows.slice(start, start + pageSize);
  }, [data?.cashiers, pageIndex, pageSize]);

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="alert-error" style={{ marginTop: 16 }}>
        <XCircle size={16} />
        {error instanceof Error
          ? error.message
          : "Failed to load cashier performance."}
      </div>
    );
  }

  if (data.cashiers.length === 0) {
    return (
      <p className="muted" style={{ padding: "48px 0", textAlign: "center" }}>
        No POS orders in this period.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <div
        className="stat-grid grid-cols-1 md:grid-cols-1 lg:grid-cols-1"
        style={{ maxWidth: 240 }}
      >
        <StatCard
          icon={Users}
          color="teal"
          colorful
          value={data.cashierCount.toLocaleString()}
          label="Cashiers"
        />
      </div>

      <Card title="Cashier Performance" pad>
        <DataTable
          columns={columns}
          data={pageRows}
          rowCount={data.cashiers.length}
          pageIndex={pageIndex}
          pageSize={pageSize}
          onPaginationChange={(state: PaginationState) => {
            setPageIndex(state.pageIndex);
            setPageSize(state.pageSize);
          }}
          getRowId={(row) => row.cashierId}
          enableRowSelection={false}
          enableColumnVisibility={false}
          enableExport={false}
          emptyTitle="No cashiers found"
          emptyDescription="No cashier activity for this period."
        />
      </Card>
    </div>
  );
}
