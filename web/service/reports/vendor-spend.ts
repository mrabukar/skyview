import { apiFetch } from "@/service/client";
import type {
  VendorSpendQuery,
  VendorSpendResponse,
} from "@/types/reports/vendor-spend";

function toQueryString(params: VendorSpendQuery): string {
  const search = new URLSearchParams();
  search.set("fromDate", params.fromDate);
  search.set("toDate", params.toDate);
  // Bridge renames storeId → branchId on the way out.
  if (params.storeId) search.set("storeId", params.storeId);
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function getVendorSpend(
  params: VendorSpendQuery,
): Promise<VendorSpendResponse> {
  return apiFetch<VendorSpendResponse>(
    `/api/reports/vendor-spend${toQueryString(params)}`,
  );
}
