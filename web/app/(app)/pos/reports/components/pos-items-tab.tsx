"use client";

import { useMemo, useState } from "react";
import type { ColumnDef, PaginationState } from "@tanstack/react-table";
import { XCircle, TrendingUp } from "lucide-react";

import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { HBars } from "@/components/charts/h-bars";
import { StatCard } from "@/app/(app)/dashboard/components/stat-card";
import { usePosItems } from "@/hooks/reports/use-pos-reports";
import { fmt } from "@/lib/utils";
import type { PosReportQuery, PosItemRow } from "@/types/reports/pos-reports";

interface Props {
  query: PosReportQuery;
}

export function PosItemsTab({ query }: Props) {
  const { data, isPending, isError, error } = usePosItems(query);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const columns = useMemo<ColumnDef<PosItemRow>[]>(
    () => [
      {
        accessorKey: "itemName",
        meta: { label: "Item", align: "left" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Item" />
        ),
        cell: ({ row }) => (
          <span className="strong">{row.original.itemName}</span>
        ),
      },
      {
        accessorKey: "quantitySold",
        meta: { label: "Qty Sold", align: "right" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Qty Sold" />
        ),
        cell: ({ row }) => (
          <span className="num">{row.original.quantitySold.toLocaleString()}</span>
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
        accessorKey: "percentOfTotal",
        meta: { label: "% of Total", align: "right" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="% of Total" />
        ),
        cell: ({ row }) => (
          <span className="muted">
            {row.original.percentOfTotal.toFixed(1)}%
          </span>
        ),
      },
    ],
    [],
  );

  // Top-10 items for the bar chart (already sorted by revenue desc from API)
  const top10 = useMemo(
    () =>
      (data?.items ?? []).slice(0, 10).map((row) => ({
        itemName: row.itemName,
        revenue: row.revenue,
      })),
    [data?.items],
  );

  const pageRows = useMemo(() => {
    const rows = data?.items ?? [];
    const start = pageIndex * pageSize;
    return rows.slice(start, start + pageSize);
  }, [data?.items, pageIndex, pageSize]);

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
          : "Failed to load item sales."}
      </div>
    );
  }

  if (data.items.length === 0) {
    return (
      <p className="muted" style={{ padding: "48px 0", textAlign: "center" }}>
        No POS orders in this period.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <div
        className="stat-grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2"
        style={{ maxWidth: 480 }}
      >
        <StatCard
          icon={TrendingUp}
          color="indigo"
          colorful
          value={fmt(data.totalRevenue)}
          label="Total Revenue"
        />
        <StatCard
          icon={TrendingUp}
          color="teal"
          colorful
          value={data.itemCount.toLocaleString()}
          label="Unique Items"
        />
      </div>

      <Card title="Top 10 Items by Revenue" pad>
        <HBars
          data={top10}
          labelKey="itemName"
          valueKey="revenue"
          format={fmt}
          color="var(--brand-indigo)"
        />
      </Card>

      <Card title="All Items" pad>
        <DataTable
          columns={columns}
          data={pageRows}
          rowCount={data.items.length}
          pageIndex={pageIndex}
          pageSize={pageSize}
          onPaginationChange={(state: PaginationState) => {
            setPageIndex(state.pageIndex);
            setPageSize(state.pageSize);
          }}
          getRowId={(row) => row.menuItemId}
          enableRowSelection={false}
          enableColumnVisibility={false}
          enableExport={false}
          emptyTitle="No items found"
          emptyDescription="No sales data for this period."
        />
      </Card>
    </div>
  );
}
