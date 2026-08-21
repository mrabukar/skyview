"use client";

import React, { useMemo, useState } from "react";
import { Download, Printer } from "lucide-react";

import { CustomerMenuPoster } from "./components/customer-menu-poster";
import { CustomerMenuSheet } from "./components/customer-menu-sheet";
import { Combobox } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { useBranchMenu } from "@/hooks/pos/use-branch-menu";
import { useMenuCategories } from "@/hooks/pos/use-menu-categories";
import { useStores } from "@/hooks/stores/list-stores";
import { getMenuItemImageUrl } from "@/service/pos/menu-items";
import { useAppStore } from "@/store/app";
import { cn } from "@/lib/utils";
import { toCustomerMenuItems } from "@/lib/pos/customer-menu";
import type {
  CustomerMenuItem,
  CustomerMenuLayout,
  PosterTopping,
} from "@/lib/pos/customer-menu";

async function toDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function assetUrl(path: string) {
  return typeof window !== "undefined"
    ? `${window.location.origin}${path}`
    : path;
}

async function withItemImages(items: CustomerMenuItem[]) {
  return Promise.all(
    items.map(async (item) => {
      if (!item.imageKey) return { ...item, imageSrc: null };
      try {
        const { url } = await getMenuItemImageUrl(item.imageKey);
        const imageSrc = await toDataUrl(url);
        return { ...item, imageSrc };
      } catch {
        return { ...item, imageSrc: null };
      }
    }),
  );
}

async function triggerPdfDownload(args: {
  items: CustomerMenuItem[];
  branchName: string;
  organizationName?: string | null;
  layout: CustomerMenuLayout;
  toppings: PosterTopping[];
  categoryDescriptions: Record<string, string | null>;
}) {
  const withImages = await withItemImages(args.items);
  const [{ pdf }] = await Promise.all([import("@react-pdf/renderer")]);

  let blob: Blob;
  if (args.layout === "poster") {
    const [{ CustomerMenuPosterPdfDocument }, backgroundSrc] =
      await Promise.all([
        import("./components/customer-menu-poster-pdf"),
        toDataUrl(await assetUrl("/menu/skyview_bubble_tea_background.png")),
      ]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    blob = await pdf(
      React.createElement(CustomerMenuPosterPdfDocument, {
        items: withImages,
        branchName: args.branchName,
        organizationName: args.organizationName,
        backgroundSrc,
        toppings: args.toppings,
        categoryDescriptions: args.categoryDescriptions,
      }) as any,
    ).toBlob();
  } else {
    const decoFiles = [
      "/menu/cup-left.png",
      "/menu/pour-right.png",
      "/menu/pearls-bottom.png",
    ] as const;
    const [{ CustomerMenuPdfDocument }, decoSrc] = await Promise.all([
      import("./components/customer-menu-pdf"),
      Promise.all(
        decoFiles.map(async (path) => toDataUrl(await assetUrl(path))),
      ),
    ]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    blob = await pdf(
      React.createElement(CustomerMenuPdfDocument, {
        items: withImages,
        branchName: args.branchName,
        organizationName: args.organizationName,
        deco: {
          left: decoSrc[0],
          right: decoSrc[1],
          bottom: decoSrc[2],
        },
      }) as any,
    ).toBlob();
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `menu-${args.branchName.replace(/\s+/g, "-").toLowerCase()}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function CustomerMenuPage() {
  const user = useAppStore((s) => s.user);
  const addErrorToast = useAppStore((s) => s.addErrorToast);

  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "manager";
  const isCashier = user?.role === "cashier";

  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [layout, setLayout] = useState<CustomerMenuLayout>("classic");

  // Cashiers cannot list branches; use the assigned store from session.
  const { data: allStores, isSuccess: storesLoaded } = useStores(
    { limit: 100 },
    { enabled: !isCashier },
  );

  const branchOptions = useMemo(() => {
    if (isCashier && user?.storeId) {
      return [{ value: user.storeId, label: user.store ?? "Branch" }];
    }
    const stores = (allStores?.data ?? []).filter((s) => s.posEnabled);
    if (isAdmin) return stores.map((s) => ({ value: s.id, label: s.name }));
    if (isManager) {
      const allowed = new Set(user?.storeIds ?? []);
      return stores
        .filter((s) => allowed.has(s.id))
        .map((s) => ({ value: s.id, label: s.name }));
    }
    return [];
  }, [
    allStores?.data,
    isAdmin,
    isCashier,
    isManager,
    user?.store,
    user?.storeId,
    user?.storeIds,
  ]);

  const firstPosId = branchOptions[0]?.value ?? "";
  const branchId = branchOptions.some((o) => o.value === selectedBranchId)
    ? selectedBranchId
    : firstPosId;
  const branchName =
    branchOptions.find((o) => o.value === branchId)?.label ?? "";

  const {
    data: branchMenu,
    isPending,
    isError,
    error,
  } = useBranchMenu(branchId);
  const { data: menuCategories } = useMenuCategories({ isActive: true });

  const items = useMemo(
    () => toCustomerMenuItems(branchMenu?.data ?? []),
    [branchMenu?.data],
  );

  const categoryDescriptions = useMemo(() => {
    const map: Record<string, string | null> = {};
    for (const c of menuCategories ?? []) {
      map[c.name] = c.description;
    }
    return map;
  }, [menuCategories]);

  const toppings = useMemo<PosterTopping[]>(
    () =>
      (branchMenu?.toppings ?? [])
        .filter((t) => t.isInStock)
        .map((t) => ({ name: t.name, price: Number(t.price) })),
    [branchMenu?.toppings],
  );

  const handleDownloadPdf = async () => {
    if (items.length === 0) return;
    setIsPdfLoading(true);
    try {
      await triggerPdfDownload({
        items,
        branchName,
        organizationName: user?.organizationName,
        layout,
        toppings,
        categoryDescriptions,
      });
    } catch (e) {
      addErrorToast({
        title: "PDF download failed",
        sub: e instanceof Error ? e.message : "Something went wrong",
      });
    } finally {
      setIsPdfLoading(false);
    }
  };

  const showPicker =
    (isAdmin || (isManager && branchOptions.length > 1)) &&
    branchOptions.length > 0;

  return (
    <>
      <PageHeader
        title="Customer Menu"
        desc="Print or download a customer menu"
        action={
          showPicker ? (
            <Combobox
              value={branchId || undefined}
              onValueChange={(v) => setSelectedBranchId(v ?? "")}
              items={branchOptions}
              placeholder="Select a branch…"
              searchPlaceholder="Search branches…"
              emptyText="No POS-enabled branches."
              className="w-56"
            />
          ) : undefined
        }
      />

      {!(isCashier || storesLoaded) ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : branchOptions.length === 0 ? (
        <div className="mx-auto max-w-md rounded-xl border border-amber-500/30 bg-amber-500/5 p-8 text-center">
          <p className="text-sm font-semibold">
            {isCashier ? "No branch assigned" : "No POS-enabled branches"}
          </p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {isCashier
              ? "Ask an admin to assign you to a branch, then return here to print its menu."
              : "Enable POS on a branch first, then return here to print its menu."}
          </p>
        </div>
      ) : isPending ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : isError ? (
        <div className="alert-error">
          {error instanceof Error ? error.message : "Failed to load menu."}
        </div>
      ) : items.length === 0 ? (
        <p className="py-20 text-center text-sm text-muted-foreground">
          No enabled items for {branchName}. Enable items on Branch Menu first.
        </p>
      ) : (
        <>
          {/* <div className="customer-menu-actions mb-6 flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex rounded-lg border border-border p-0.5">
              {(
                [
                  ["classic", "Classic"],
                  ["poster", "Poster"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setLayout(value)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    layout === value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
              >
                <Printer className="size-4" />
                Print
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleDownloadPdf()}
                disabled={isPdfLoading}
              >
                <Download className="size-4" />
                {isPdfLoading ? "Generating…" : "PDF"}
              </Button>
            </div>
          </div> */}

          {layout === "poster" ? (
            <CustomerMenuPoster
              items={items}
              branchName={branchName}
              organizationName={user?.organizationName}
              toppings={toppings}
              categoryDescriptions={categoryDescriptions}
            />
          ) : (
            <CustomerMenuSheet
              items={items}
              branchName={branchName}
              organizationName={user?.organizationName}
            />
          )}
        </>
      )}
    </>
  );
}
