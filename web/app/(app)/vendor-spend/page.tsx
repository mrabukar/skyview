"use client";

import { useMemo, useState } from "react";

import { Card } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { PageHeader } from "@/components/ui/page-header";
import { useVendorSpend } from "@/hooks/reports/use-vendor-spend";
import { useStores } from "@/hooks/stores/list-stores";
import { getCurrentMonthRange } from "@/lib/filters/dates";
import { fmt } from "@/lib/utils";
import { useAppStore } from "@/store/app";

export default function VendorSpendPage() {
  const user = useAppStore((s) => s.user);
  const isAdmin = user?.role === "admin";

  const initialRange = useMemo(() => getCurrentMonthRange(), []);
  const [fromDate, setFromDate] = useState(initialRange.fromDate);
  const [toDate, setToDate] = useState(initialRange.toDate);
  const [storeId, setStoreId] = useState<string | undefined>(undefined);

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
    () => ({ fromDate, toDate, storeId: isAdmin ? storeId : undefined }),
    [fromDate, toDate, storeId, isAdmin],
  );
  const { data, isPending, isError, error } = useVendorSpend(query);

  const vendors = data?.vendors ?? [];
  const total = data?.totalAmount ?? 0;
  const totalPurchaseCount = vendors.reduce((sum, v) => sum + v.purchaseCount, 0);

  return (
    <>
      <PageHeader
        title="Vendor Spend"
        desc="Total purchased from each vendor, highest first"
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <DateRangePicker
          fromDate={fromDate}
          toDate={toDate}
          onChange={(range) => {
            setFromDate(range.fromDate);
            setToDate(range.toDate);
          }}
        />
        {isAdmin ? (
          <Combobox
            value={storeId}
            onValueChange={setStoreId}
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
          {error instanceof Error ? error.message : "Failed to load vendor spend."}
        </div>
      ) : isPending ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : vendors.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No purchases recorded in this period.
        </Card>
      ) : (
        <div className="dt">
            <div className="dt-scroll">
              <table className="dt-table">
                <thead className="dt-head">
                  <tr>
                    <th>#</th>
                    <th>Vendor</th>
                    <th>Total purchased</th>
                    <th>Purchases</th>
                    <th>% of total</th>
                  </tr>
                </thead>
                <tbody className="dt-body">
                  {vendors.map((v, index) => (
                    <tr key={v.vendorId} className="dt-row">
                      <td className="tabular-nums text-muted-foreground">
                        {index + 1}
                      </td>
                      <td>
                        <span className="font-medium">{v.vendorName}</span>
                        {!v.isActive ? (
                          <span className="ml-1 text-xs text-muted-foreground">
                            (inactive)
                          </span>
                        ) : null}
                      </td>
                      <td className="font-semibold tabular-nums">
                        {fmt(v.totalAmount)}
                      </td>
                      <td className="tabular-nums">{v.purchaseCount}</td>
                      <td className="tabular-nums text-muted-foreground">
                        {v.percent}%
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="dt-foot">
                  <tr>
                    <td aria-hidden />
                    <td className="dt-foot-label">
                      Total
                      <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                        {data!.vendorCount} vendor
                        {data!.vendorCount === 1 ? "" : "s"}
                      </span>
                    </td>
                    <td className="dt-foot-total tabular-nums">{fmt(total)}</td>
                    <td className="tabular-nums font-semibold">
                      {totalPurchaseCount}
                    </td>
                    <td className="tabular-nums font-semibold">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
      )}
    </>
  );
}
