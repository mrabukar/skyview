/**
 * Registry of manager-toggleable pages (single source of truth).
 *
 * An admin can hide any of these pages from an individual branch manager by
 * adding its key to that user's `disabledPages`. Admin-only pages (payroll,
 * users, branches, audit, admin dashboard, financial) are intentionally NOT
 * listed here and can never be toggled.
 *
 * To add a future toggleable page: add its key here and tag the controller/
 * route with `@Page('<key>')`. No schema change is needed.
 */
export const MANAGER_PAGES = [
  "dashboard",
  "sales",
  "purchases",
  "expenses",
  "vendors",
  "receipts",
  // POS module (Phase 2) — toggleable for managers; always-on for cashiers
  "pos",
  "menu",
] as const;

export type PageKey = (typeof MANAGER_PAGES)[number];

export function isPageKey(value: unknown): value is PageKey {
  return (
    typeof value === "string" &&
    (MANAGER_PAGES as readonly string[]).includes(value)
  );
}
