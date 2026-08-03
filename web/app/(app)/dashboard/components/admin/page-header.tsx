import { PageHeader } from "@/components/ui/page-header";
import { ReportFilterBar } from "@/components/filters/report-filter-bar";
import type { useReportFilters } from "@/hooks/filters/use-report-filters";

interface Props {
  filters: ReturnType<typeof useReportFilters>;
}

export function DashboardPageHeader({ filters }: Props) {
  return (
    <PageHeader
      className="page-head--band"
      title="Dashboard"
      desc="Sales, purchases, expenses, and profit for the selected period."
      action={<ReportFilterBar filters={filters} />}
    />
  );
}
