"use client";

import type { ReportFilters } from "@/hooks/filters/use-report-filters";
import { DateRangeFilter } from "./date-range-filter";
import { StoreFilter } from "./store-filter";

interface ReportFilterBarProps {
  filters: ReportFilters;
  showStoreFilter?: boolean;
  disabled?: boolean;
}

export function ReportFilterBar({
  filters,
  showStoreFilter = true,
  disabled = false,
}: ReportFilterBarProps) {
  return (
    <div style={{ display: "flex", gap: 10 }}>
      <DateRangeFilter filters={filters} disabled={disabled} />
      {showStoreFilter ? (
        <StoreFilter filters={filters} disabled={disabled} />
      ) : null}
    </div>
  );
}
