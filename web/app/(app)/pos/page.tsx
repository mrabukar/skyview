"use client";

import { PosTerminal } from "./components/pos-terminal";
import { PosOrdersTable } from "./components/pos-orders-table";
import { useAppStore } from "@/store/app";

/**
 * /pos — role-aware entry point.
 *
 * Cashier: shows the live POS terminal (shift guard applies).
 * Admin / Manager: shows the POS orders history with status filter.
 * Managers and admins also have a till at /pos/terminal.
 */
export default function PosPage() {
  const user = useAppStore((s) => s.user);

  if (!user) return null;

  if (user.role === "cashier") {
    return <PosTerminal />;
  }

  // Admin and manager see the full orders table.
  return (
    <PosOrdersTable
      title="POS Orders"
      desc={
        user.role === "admin"
          ? "All POS orders across the organisation"
          : (user.storeIds?.length ?? 0) > 1
            ? "POS orders for your branches"
            : `POS orders for ${user.store ?? "your branch"}`
      }
    />
  );
}
