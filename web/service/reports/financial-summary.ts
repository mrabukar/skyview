import { apiFetch } from "@/service/client";
import { getLastSixMonthsRange } from "@/lib/filters/dates";
import type {
  FinancialSummaryQuery,
  FinancialSummaryResponse,
} from "@/types/reports/financial-summary";

function toQueryString(params: FinancialSummaryQuery): string {
  const search = new URLSearchParams();

  search.set("fromDate", params.fromDate);
  search.set("toDate", params.toDate);
  if (params.storeId) search.set("storeId", params.storeId);

  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export interface CompanyNetProfitToDate {
  asOf: string;
  netProfit: number;
}

/** Running company-wide net profit through today. Admin only. */
export function getCompanyNetProfitToDate(): Promise<CompanyNetProfitToDate> {
  return apiFetch<CompanyNetProfitToDate>("/api/reports/company-net-profit");
}

export function getFinancialSummary(
  params: FinancialSummaryQuery = getLastSixMonthsRange(),
): Promise<FinancialSummaryResponse> {
  return apiFetch<FinancialSummaryResponse>(
    `/api/reports/financial-summary${toQueryString(params)}`,
  );
}
