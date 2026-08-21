"use client";
import { useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { buildLoginUrl } from "@/lib/auth/redirect";
import { isRouteAllowedForRole } from "@/lib/auth/routes";
import { firstEnabledManagerRoute, pageKeyForPath } from "@/lib/auth/pages";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useAppStore } from "@/store/app";
import { formatDocumentTitle, resolvePageTitle } from "@/lib/page-title";
import { Sidebar } from "./sidebar";
import { Navbar } from "./navbar";
import { ToastHost } from "@/components/ui/toast";

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isLoading: authLoading, isFetched, isAuthenticated } = useAuth();
  const user = useAppStore((s) => s.user);
  const collapsed = useAppStore((s) => s.collapsed);
  const setCollapsed = useAppStore((s) => s.setCollapsed);
  const mobileNavOpen = useAppStore((s) => s.mobileNavOpen);
  const setMobileNavOpen = useAppStore((s) => s.setMobileNavOpen);
  const isMobile = useMediaQuery("(max-width: 1023px)");

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname, setMobileNavOpen]);

  const handleToggleNav = () => {
    if (isMobile) {
      setMobileNavOpen(!mobileNavOpen);
    } else {
      setCollapsed(!collapsed);
    }
  };

  const roleDenied =
    isFetched &&
    !authLoading &&
    isAuthenticated &&
    user != null &&
    !isRouteAllowedForRole(user.role, pathname, {
      hasStores: user.hasStores,
    });

  // Per-manager page access: a disabled page is blocked even though the role
  // would normally allow it.
  const ready = isFetched && !authLoading && isAuthenticated && user != null;
  const pageKey = ready ? pageKeyForPath(pathname) : null;
  const pageDenied =
    ready &&
    !roleDenied &&
    user!.role === "manager" &&
    pageKey != null &&
    user!.disabledPages.includes(pageKey);
  const pageFallback =
    pageDenied && user ? firstEnabledManagerRoute(user.disabledPages) : null;

  useEffect(() => {
    if (isFetched && !authLoading && !isAuthenticated) {
      const query = searchParams.toString();
      const returnPath = query ? `${pathname}?${query}` : pathname;
      router.replace(buildLoginUrl(returnPath));
    }
  }, [isFetched, authLoading, isAuthenticated, router, pathname, searchParams]);

  useEffect(() => {
    if (roleDenied) {
      let fallback = "/dashboard";
      if (user?.role === "super_admin") fallback = "/super-admin";
      else if (user?.role === "cashier") fallback = "/pos";
      router.replace(fallback);
    }
  }, [roleDenied, router, user?.role]);

  useEffect(() => {
    if (pageDenied && pageFallback) {
      router.replace(pageFallback);
    }
  }, [pageDenied, pageFallback, router]);

  const title = resolvePageTitle(pathname);

  useEffect(() => {
    if (!isFetched || authLoading || !user || roleDenied) return;
    document.title = formatDocumentTitle(title);
  }, [title, isFetched, authLoading, user, roleDenied]);

  if (!isFetched || authLoading || !user || roleDenied) return null;
  // Redirecting to an allowed page — render nothing to avoid a flash.
  if (pageDenied && pageFallback) return null;

  const posTerminalPage = user.role === "cashier" && pathname === "/pos";

  return (
    <div className={posTerminalPage ? "app-frame pos-terminal-page" : "app-frame"}>
      <Sidebar
        role={user.role}
        collapsed={collapsed}
        mobileOpen={mobileNavOpen}
        storeName={user.store}
        hasStores={user.hasStores}
      />
      {isMobile && mobileNavOpen ? (
        <div
          className="sidebar-overlay"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden
        />
      ) : null}
      <div className="app-main">
        <Navbar
          title={title}
          collapsed={collapsed}
          onToggle={handleToggleNav}
        />
        <div className="app-content">
          <div className="app-content-inner">
            {pageDenied ? <NoAccessScreen /> : children}
          </div>
        </div>
      </div>
      <ToastHost />
    </div>
  );
}

/** Shown when every page has been disabled for a manager. */
function NoAccessScreen() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 text-center">
      <h2 className="text-lg font-semibold">No pages assigned</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        Your account doesn&apos;t have access to any pages yet. Please contact
        your administrator.
      </p>
    </div>
  );
}
