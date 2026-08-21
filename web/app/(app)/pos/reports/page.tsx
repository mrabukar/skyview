"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ReportFilterBar } from "@/components/filters/report-filter-bar";
import { PageHeader } from "@/components/ui/page-header";
import { useReportFilters } from "@/hooks/filters/use-report-filters";
import { getLastSixMonthsRange } from "@/lib/filters/dates";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app";
import { PosCashierTab } from "./components/pos-cashier-tab";
import { PosItemsTab } from "./components/pos-items-tab";
import { PosSummaryTab } from "./components/pos-summary-tab";

type PosReportTab = "summary" | "items" | "cashiers";

const TABS: { id: PosReportTab; label: string }[] = [
  { id: "summary", label: "Summary" },
  { id: "items", label: "Item Sales" },
  { id: "cashiers", label: "Cashier Performance" },
];

const defaultRange = getLastSixMonthsRange();

export default function PosReportsPage() {
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const filters = useReportFilters(defaultRange);
  const [tab, setTab] = useState<PosReportTab>("summary");

  // Cashiers cannot view POS reports (BR-POS-10).
  useEffect(() => {
    if (user?.role === "cashier") {
      router.replace("/pos");
    }
  }, [user?.role, router]);

  if (!user || user.role === "cashier") return null;

  const isAdmin = user.role === "admin";

  return (
    <>
      <PageHeader
        title="POS Reports"
        desc="Revenue, item sales, and cashier performance for POS-enabled branches"
        action={
          <ReportFilterBar
            filters={filters}
            showStoreFilter={isAdmin}
          />
        }
      />

      <div className="mb-6 flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-shrink-0 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors",
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "summary" ? <PosSummaryTab query={filters.query} /> : null}
      {tab === "items" ? <PosItemsTab query={filters.query} /> : null}
      {tab === "cashiers" ? <PosCashierTab query={filters.query} /> : null}
    </>
  );
}
