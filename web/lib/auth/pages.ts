/**
 * Manager pages an admin can toggle per user. Mirrors the backend page
 * registry (api/src/common/page-access/pages.ts). Only pages with a real route
 * + nav entry are listed here; the `key` must match the backend key.
 */
export interface ManagerPage {
  key: string;
  label: string;
  href: string;
}

export const MANAGER_PAGES: ManagerPage[] = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard" },
  { key: "sales", label: "Daily Sales", href: "/sales" },
  { key: "purchases", label: "Purchases", href: "/purchases" },
  { key: "expenses", label: "Expenses", href: "/expenses" },
  // Receipt Centre retired — receipts now live in the Purchases table.
  // { key: "receipts", label: "Receipt Centre", href: "/receipts" },
];

function matches(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** The page key a path belongs to, or null if it isn't a toggleable page. */
export function pageKeyForPath(pathname: string): string | null {
  return MANAGER_PAGES.find((p) => matches(pathname, p.href))?.key ?? null;
}

/** First manager page not in `disabled`, or null if every page is disabled. */
export function firstEnabledManagerRoute(disabled: string[]): string | null {
  return MANAGER_PAGES.find((p) => !disabled.includes(p.key))?.href ?? null;
}
