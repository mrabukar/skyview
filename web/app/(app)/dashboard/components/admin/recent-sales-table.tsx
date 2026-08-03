"use client";

import { Store } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { formatSaleDate, toNumber } from "@/lib/reports/format";
import { fmt } from "@/lib/utils";
import type { DashboardRecentSale } from "@/types/reports/admin-dashboard";

interface Props {
  sales: DashboardRecentSale[];
}

export function AdminRecentSalesTable({ sales }: Props) {
  if (sales.length === 0) {
    return (
      <EmptyState
        title="No recent sales"
        sub="No daily sales recorded in the selected period."
      />
    );
  }

  return (
    <div className="dt dash-recent-sales-dt">
      <div className="dt-scroll dash-recent-sales-scroll">
        <table className="dt-table">
          <thead className="dt-head">
            <tr>
              <th className="dt-th-left">Date</th>
              <th className="dt-th-left">Branch</th>
              <th className="dt-th-left">Entered by</th>
              <th className="dt-th-center">Sales total</th>
            </tr>
          </thead>
          <tbody className="dt-body">
            {sales.map((sale) => (
              <tr key={sale.id} className="dt-row">
                <td className="dt-cell-left">
                  <span className="muted">{formatSaleDate(sale.saleDate)}</span>
                </td>
                <td className="dt-cell-left">
                  <span
                    className="muted"
                    style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                  >
                    <Store size={11} />
                    {sale.store.name}
                  </span>
                </td>
                <td className="dt-cell-left">
                  <span className="muted">{sale.soldBy.name}</span>
                </td>
                <td className="dt-cell-center">
                  <span className="num t-indigo strong">
                    {fmt(toNumber(sale.totalAmount))}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
