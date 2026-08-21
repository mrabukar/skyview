"use client";

import { PosOrdersTable } from "../components/pos-orders-table";
import { useAppStore } from "@/store/app";

/**
 * /pos/history — cashier's order history.
 *
 * The server scopes cashier queries to their own branch and today's orders;
 * we pass storeId so the frontend filter matches the server.
 * Admin/managers are not expected to land here (nav links don't point to it),
 * but if they do they'll see the full orders list without pre-filtering.
 */
export default function PosHistoryPage() {
  const user = useAppStore((s) => s.user);

  const baseQuery =
    user?.role === "cashier" && user.storeId
      ? { storeId: user.storeId, cashierId: user.id }
      : {};

  return (
    <PosOrdersTable
      title="Order History"
      desc="Your completed orders for today"
      baseQuery={baseQuery}
    />
  );
}
