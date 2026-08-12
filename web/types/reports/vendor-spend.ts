export interface VendorSpendQuery {
  fromDate: string;
  toDate: string;
  /** Admin-only branch filter; bridged to `branchId` on the wire. */
  storeId?: string;
}

export interface VendorSpendRow {
  vendorId: string;
  vendorName: string;
  isActive: boolean;
  totalAmount: number;
  purchaseCount: number;
  /** Share of total spend, 0–100 (1 decimal). */
  percent: number;
}

export interface VendorSpendResponse {
  period: { from: string; to: string; timezone: string };
  totalAmount: number;
  vendorCount: number;
  vendors: VendorSpendRow[];
}
