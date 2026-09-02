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
  const total = vendors.reduce((sum, v) => sum + v.totalAmount, 0);

  return (
    <Card title="Top Vendors by Spend" pad>
      {isPending ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : vendors.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No purchases in this period.
        </p>
      ) : (
        <div>
          {vendors.map((v, index) => (
            <div key={v.vendorId} className="hbar-row">
              <div className="hbar-head">
                <span className="hb-name" title={v.vendorName}>
                  <span className="hb-idx">{index + 1}</span>
                  {v.vendorName}
                </span>
                <span className="hb-val num">{fmt(v.totalAmount)}</span>
              </div>
              <div className="hbar-track">
                <div
                  className="hbar-fill"
                  style={{
                    width: `${max > 0 ? (v.totalAmount / max) * 100 : 0}%`,
                    background:
                      "linear-gradient(90deg, var(--brand-indigo), color-mix(in srgb, var(--brand-indigo) 68%, #000))",
                  }}
                />
              </div>
              <p className="hb-sub">
                {total > 0
                  ? `${((v.totalAmount / total) * 100).toFixed(1)}% of purchase spend`
                  : "—"}
              </p>
            </div>
          ))}
          <Link
            href="/vendor-spend"
            className="mt-3 inline-block text-sm font-semibold text-primary hover:underline"
          >
            View all vendors →
          </Link>
        </div>
      )}
    </Card>
  );
}
