export const APP_NAME = "Bubble Tea Palace";

export const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/sales": "Daily Sales",
  "/purchases": "Purchases",
  "/expenses": "Expenses",
  "/receipts": "Receipt Centre",
  "/payroll": "Payroll",
  "/financial": "Financial Summary",
  "/vendor-spend": "Vendor Spend",
  "/branches": "Branches",
  "/users": "Users",
  "/users/new": "Add User",
  "/audit": "Audit Log",
  "/settings/profile": "Profile",
  "/settings/password": "Change Password",
  "/settings/organization": "Organization",
  "/super-admin": "Platform",
  "/super-admin/organizations": "Organizations",
  "/super-admin/organizations/new": "New Organization",
  "/login": "Sign In",
  // POS module
  "/pos": "POS Terminal",
  "/pos/history": "Order History",
  "/pos/reports": "POS Reports",
  "/pos/branch-menu": "Branch Menu",
  // Menu management
  "/menu": "Menu",
  "/menu/categories": "Menu Categories",
  "/menu/items": "Menu Items",
  "/menu/print": "Customer Menu",
  "/menu/toppings": "Toppings",
};

export function resolvePageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.startsWith("/super-admin/organizations/")) return "Organization";
  if (pathname.startsWith("/pos/")) return "POS";
  if (pathname.startsWith("/menu/")) return "Menu";
  return "Dashboard";
}

export function formatDocumentTitle(pageTitle: string): string {
  return `${pageTitle} · ${APP_NAME}`;
}
