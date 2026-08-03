"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";

import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Card } from "@/components/ui/card";
import { formatSaleDate, toNumber } from "@/lib/reports/format";
import { fmt } from "@/lib/utils";
import type { DashboardRecentSale } from "@/types/reports/common";

interface Props {
  sales: DashboardRecentSale[];
}

export function ManagerRecentSalesTable({ sales }: Props) {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const pageRows = useMemo(() => {
    const start = pageIndex * pageSize;
    return sales.slice(start, start + pageSize);
  }, [sales, pageIndex, pageSize]);

  const columns = useMemo<ColumnDef<DashboardRecentSale>[]>(
    () => [
      {
        id: "saleDate",
        accessorFn: (row) => row.saleDate,
        meta: { label: "Date" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Date" />
        ),
        cell: ({ row }) => (
          <span className="muted">{formatSaleDate(row.original.saleDate)}</span>
        ),
      },
      {
        id: "enteredBy",
        accessorFn: (row) => row.soldBy.name,
        meta: { label: "Entered by" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Entered by" />
        ),
        cell: ({ row }) => <span className="muted">{row.original.soldBy.name}</span>,
      },
      {
        id: "totalAmount",
        accessorFn: (row) => toNumber(row.totalAmount),
        meta: { label: "Sales total" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Sales total" />
        ),
        cell: ({ row }) => (
          <span className="num t-indigo strong">
            {fmt(toNumber(row.original.totalAmount))}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <Card title="Recent Daily Sales" pad className="mb-16">
      <DataTable
        columns={columns}
        data={pageRows}
        rowCount={sales.length}
        pageIndex={pageIndex}
        pageSize={pageSize}
        onPaginationChange={({ pageIndex: nextIndex, pageSize: nextSize }) => {
          setPageIndex(nextIndex);
          setPageSize(nextSize);
        }}
        emptyTitle="No sales yet"
        emptyDescription="Record today's sales total to see it here."
        getRowId={(row) => row.id}
      />
    </Card>
  );
}
