"use client";

import Link from "next/link";

import { Card } from "@/components/ui/card";
import { useVendorSpend } from "@/hooks/reports/use-vendor-spend";
import { fmt } from "@/lib/utils";

interface Props {
  fromDate: string;
  toDate: string;
  storeId?: string;
  limit?: number;
}

export function TopVendorsCard({
  fromDate,
  toDate,
  storeId,
  limit = 5,
}: Props) {
  const { data, isPending } = useVendorSpend({ fromDate, toDate, storeId });
  const vendors = (data?.vendors ?? []).slice(0, limit);
  const max = vendors.length > 0 ? vendors[0].totalAmount : 0;

  return (
    <Card title="Top Vendors by Spend" pad>
      {isPending ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : vendors.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No purchases in this period.
        </p>
      ) : (
        <div className="grid gap-2.5">
          {vendors.map((v, index) => (
            <div key={v.vendorId} className="grid gap-1">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate font-medium">
                  {index + 1}. {v.vendorName}
                </span>
                <span className="shrink-0 font-semibold tabular-nums">
                  {fmt(v.totalAmount)}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{
                    width: `${max > 0 ? (v.totalAmount / max) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          ))}
          <Link
            href="/vendor-spend"
            className="mt-1 text-sm text-primary hover:underline"
          >
            View all vendors →
          </Link>
        </div>
      )}
    </Card>
  );
}
