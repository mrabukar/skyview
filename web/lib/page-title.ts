export const APP_NAME = "Bubble Tea Palace";

export const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/sales": "Daily Sales",
  "/purchases": "Purchases",
  "/expenses": "Expenses",
  "/payroll": "Payroll",
  "/financial": "Financial Summary",
  "/branches": "Branches",
  "/users": "Users",
  "/audit": "Audit Log",
  "/settings/profile": "Profile",
  "/settings/password": "Change Password",
  "/settings/organization": "Organization",
  "/super-admin": "Platform",
  "/super-admin/organizations": "Organizations",
  "/super-admin/organizations/new": "New Organization",
  "/login": "Sign In",
};

export function resolvePageTitle(pathname: string): string {
  return (
    PAGE_TITLES[pathname] ??
    (pathname.startsWith("/super-admin/organizations/")
      ? "Organization"
      : "Dashboard")
  );
}

export function formatDocumentTitle(pageTitle: string): string {
  return `${pageTitle} · ${APP_NAME}`;
}
