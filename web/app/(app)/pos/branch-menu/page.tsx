"use client";

import { useMemo, useState } from "react";
import type { ColumnDef, PaginationState } from "@tanstack/react-table";
import {
  CheckSquare,
  DollarSign,
  Grid3X3,
  List,
  Settings2,
  XCircle,
} from "lucide-react";

import { ItemPricesModal } from "./components/item-prices-modal";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { MenuItemImage } from "@/components/pos/menu-item-image";
import { Combobox } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import {
  useBranchMenu,
  useBulkEnableMenuItems,
  useUpdateBranchMenuItem,
  useUpdateBranchTopping,
} from "@/hooks/pos/use-branch-menu";
import { useStore } from "@/hooks/stores/use-store";
import { useStores } from "@/hooks/stores/list-stores";
import { useAppStore } from "@/store/app";
import { cn } from "@/lib/utils";
import type {
  BranchMenuItemConfig,
  BranchMenuItemSizeConfig,
  BranchToppingConfig,
} from "@/types/pos/branch-menu";

// ── Inline toggle switch ──────────────────────────────────────────────────────

function Switch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={cn(
        "relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-40",
        checked ? "bg-primary" : "bg-input",
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow-lg ring-0 transition-transform",
          checked ? "translate-x-4" : "translate-x-0",
        )}
      />
    </button>
  );
}

// ── Price range helper ────────────────────────────────────────────────────────

function priceRange(sizes: BranchMenuItemSizeConfig[]): string {
  const prices = sizes.filter((s) => s.isActive).map((s) => Number(s.effectivePrice));
  if (prices.length === 0) return "—";
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const f = (n: number) => `KSh ${n.toLocaleString("en-KE", { minimumFractionDigits: 0 })}`;
  return min === max ? f(min) : `${f(min)} – ${f(max)}`;
}

// ── Category builder ──────────────────────────────────────────────────────────

function buildCategories(items: BranchMenuItemConfig[]): { id: string; name: string }[] {
  const seen = new Map<string, string>();
  for (const item of items) {
    if (!seen.has(item.categoryId)) seen.set(item.categoryId, item.categoryName);
  }
  return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
}

// ── Topping row (unchanged) ──────────────────────────────────────────────────

function ToppingRow({
  topping,
  pending,
  onToggleStock,
}: {
  topping: BranchToppingConfig;
  pending: boolean;
  onToggleStock: () => void;
}) {
  return (
    <tr className="border-b border-border last:border-0">
      <td className="py-2.5 pr-4">
        <span className="text-sm font-medium text-foreground">{topping.name}</span>
      </td>
      <td className="py-2.5 pr-4 text-sm text-muted-foreground tabular-nums">
        KSh {Number(topping.price).toLocaleString("en-KE", { minimumFractionDigits: 0 })}
      </td>
      <td className="py-2.5 text-center">
        {pending ? (
          <div className="flex justify-center">
            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <Switch
            checked={topping.isInStock}
            onChange={onToggleStock}
            label={`Toggle ${topping.name} in stock`}
          />
        )}
      </td>
    </tr>
  );
}

// ── Grid card ─────────────────────────────────────────────────────────────────

function MenuGridCard({
  item,
  showConfig,
  showStockToggle,
  pending,
  onToggleEnabled,
  onToggleStock,
  onPrices,
}: {
  item: BranchMenuItemConfig;
  showConfig: boolean;
  showStockToggle: boolean;
  pending: boolean;
  onToggleEnabled: () => void;
  onToggleStock: () => void;
  onPrices: () => void;
}) {
  const hasPriceOverride = item.sizes.some((s) => s.branchPrice !== null);

  return (
    <div
      className={cn(
        "relative flex flex-col overflow-hidden rounded-xl border border-border bg-background shadow-sm transition-all",
        !item.isEnabled && "opacity-60",
      )}
    >
      {/* 3:4 image well — contain, card supplies the background */}
      <div className="relative aspect-[3/4] overflow-hidden bg-muted">
        <MenuItemImage
          imageKey={item.imageKey}
          alt={item.itemName}
          className="h-full w-full rounded-none"
        />
        {!item.isInStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="rounded-md bg-background/90 px-2 py-1 text-xs font-semibold text-destructive">
              Out of stock
            </span>
          </div>
        )}
        {!item.isEnabled && (
          <div className="absolute right-2 top-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            Disabled
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="line-clamp-2 text-sm font-semibold leading-snug">{item.itemName}</p>
        <p className="text-xs text-muted-foreground">{item.categoryName}</p>
        <p className="mt-auto text-xs font-medium text-primary">
          {priceRange(item.sizes)}
        </p>
      </div>

      {/* Config actions — config mode for admin/manager, stock toggle for cashiers */}
      {(showConfig || showStockToggle) && (
        <div className="flex items-center justify-between border-t border-border px-3 py-2">
          <div className="flex items-center gap-3">
            {showConfig && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground">Enabled</span>
                {pending ? (
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                ) : (
                  <Switch
                    checked={item.isEnabled}
                    onChange={onToggleEnabled}
                    label={`Toggle ${item.itemName} enabled`}
                  />
                )}
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground">Available</span>
              {pending ? (
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              ) : (
                <Switch
                  checked={item.isInStock}
                  onChange={onToggleStock}
                  disabled={showConfig && !item.isEnabled}
                  label={`Toggle ${item.itemName} available`}
                />
              )}
            </div>
          </div>
          {showConfig && (
            <button
              type="button"
              onClick={onPrices}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors",
                hasPriceOverride
                  ? "bg-primary/10 text-primary hover:bg-primary/20"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              <DollarSign size={10} />
              {hasPriceOverride ? "Custom" : "Prices"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type ViewMode = "table" | "grid";

export default function BranchMenuPage() {
  const user = useAppStore((s) => s.user);
  const addToast = useAppStore((s) => s.addToast);
  const addErrorToast = useAppStore((s) => s.addErrorToast);

  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "manager";
  const isCashier = user?.role === "cashier";
  const canConfigure = isAdmin || isManager;

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [configMode, setConfigMode] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Branch selector
  const [selectedBranchId, setSelectedBranchId] = useState<string>(() => {
    if (isCashier) return user?.storeId ?? "";
    return "";
  });

  // Data — cashiers don't have access to /branches, so skip those hooks.
  const { data: allStores, isSuccess: storesLoaded } = useStores(
    { limit: 100 },
    { enabled: !isCashier },
  );

  const branchOptions = useMemo(() => {
    const stores = (allStores?.data ?? []).filter((s) => s.posEnabled);
    if (isAdmin) return stores.map((s) => ({ value: s.id, label: s.name }));
    if (isManager) {
      const allowed = new Set(user?.storeIds ?? []);
      return stores
        .filter((s) => allowed.has(s.id))
        .map((s) => ({ value: s.id, label: s.name }));
    }
    return [];
  }, [allStores?.data, isAdmin, isManager, user?.storeIds]);

  const firstPosId = branchOptions[0]?.value ?? "";
  const branchId = isCashier
    ? selectedBranchId
    : branchOptions.some((o) => o.value === selectedBranchId)
      ? selectedBranchId
      : firstPosId;

  const { data: selectedStore, isPending: storePending } = useStore(
    isCashier ? undefined : (branchId || undefined),
  );
  const { data: branchMenu, isPending: menuPending, isError, error, refetch } = useBranchMenu(branchId);
  // Cashiers always have POS enabled (they wouldn't be assigned otherwise),
  // so skip the store-loading wait for them.
  const isPending = isCashier ? menuPending : (storePending || menuPending);

  // Mutations
  const updateItem = useUpdateBranchMenuItem(branchId);
  const updateTopping = useUpdateBranchTopping(branchId);
  const bulkEnable = useBulkEnableMenuItems(branchId);

  // Per-row pending tracking
  const [pendingItems, setPendingItems] = useState<Set<string>>(new Set());
  const [pendingToppings, setPendingToppings] = useState<Set<string>>(new Set());

  const addItemPending = (id: string) =>
    setPendingItems((s) => new Set(s).add(id));
  const removeItemPending = (id: string) =>
    setPendingItems((s) => { const n = new Set(s); n.delete(id); return n; });

  const addToppingPending = (id: string) =>
    setPendingToppings((s) => new Set(s).add(id));
  const removeToppingPending = (id: string) =>
    setPendingToppings((s) => { const n = new Set(s); n.delete(id); return n; });

  // Price modal state
  const [priceModal, setPriceModal] = useState<BranchMenuItemConfig | null>(null);

  // DataTable pagination (table view)
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleToggleEnabled = async (item: BranchMenuItemConfig) => {
    addItemPending(item.menuItemId);
    try {
      await updateItem.mutateAsync({
        menuItemId: item.menuItemId,
        data: { isEnabled: !item.isEnabled },
      });
    } catch (e) {
      addErrorToast({
        title: "Failed to update item",
        sub: e instanceof Error ? e.message : "Something went wrong",
      });
    } finally {
      removeItemPending(item.menuItemId);
    }
  };

  const handleToggleItemStock = async (item: BranchMenuItemConfig) => {
    addItemPending(item.menuItemId);
    try {
      await updateItem.mutateAsync({
        menuItemId: item.menuItemId,
        data: { isInStock: !item.isInStock },
      });
    } catch (e) {
      addErrorToast({
        title: "Failed to update stock",
        sub: e instanceof Error ? e.message : "Something went wrong",
      });
    } finally {
      removeItemPending(item.menuItemId);
    }
  };

  const handleToggleToppingStock = async (topping: BranchToppingConfig) => {
    addToppingPending(topping.toppingId);
    try {
      await updateTopping.mutateAsync({
        toppingId: topping.toppingId,
        data: { isInStock: !topping.isInStock },
      });
    } catch (e) {
      addErrorToast({
        title: "Failed to update topping stock",
        sub: e instanceof Error ? e.message : "Something went wrong",
      });
    } finally {
      removeToppingPending(topping.toppingId);
    }
  };

  const handleBulkEnable = async () => {
    if (!branchMenu) return;
    const ids = branchMenu.data.map((item) => item.menuItemId);
    try {
      const result = await bulkEnable.mutateAsync({ menuItemIds: ids });
      addToast({
        title: "Bulk enable complete",
        sub: `${result.configured} items configured for this branch`,
      });
    } catch (e) {
      addErrorToast({
        title: "Bulk enable failed",
        sub: e instanceof Error ? e.message : "Something went wrong",
      });
    }
  };

  // ── Derived data ────────────────────────────────────────────────────────────

  const allItems = branchMenu?.data ?? [];
  const toppings = branchMenu?.toppings ?? [];
  const categories = useMemo(() => buildCategories(allItems), [allItems]);
  // Cashiers are always assigned to a POS branch — skip the store check.
  const posEnabled = isCashier || selectedStore?.posEnabled === true;

  // Filter items: config mode shows all, normal mode shows only enabled.
  // Then filter by category and search.
  const filteredItems = useMemo(() => {
    let items = allItems;

    // In normal mode (not config), hide disabled items.
    if (!configMode && canConfigure) {
      items = items.filter((i) => i.isEnabled);
    }
    // Cashiers see enabled items including out-of-stock so they can restock.
    if (isCashier) {
      items = items.filter((i) => i.isEnabled);
    }

    if (categoryFilter) {
      items = items.filter((i) => i.categoryId === categoryFilter);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter(
        (i) =>
          i.itemName.toLowerCase().includes(q) ||
          i.categoryName.toLowerCase().includes(q),
      );
    }

    return items;
  }, [allItems, configMode, canConfigure, isCashier, categoryFilter, search]);

  const enabledCount = allItems.filter((i) => i.isEnabled).length;

  // Page slice for the DataTable (client-side pagination over filtered items).
  const pageRows = useMemo(() => {
    const start = pageIndex * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, pageIndex, pageSize]);

  const selectedBranchName =
    branchOptions.find((o) => o.value === branchId)?.label ??
    (isCashier ? (user?.store ?? "Your branch") : "");

  // ── DataTable columns ─────────────────────────────────────────────────────

  const columns = useMemo<ColumnDef<BranchMenuItemConfig>[]>(() => {
    const cols: ColumnDef<BranchMenuItemConfig>[] = [
      {
        id: "image",
        meta: { label: "Image", export: false },
        header: "",
        cell: ({ row }) => (
          <MenuItemImage
            imageKey={row.original.imageKey}
            alt={row.original.itemName}
            className="h-9 w-9"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        id: "itemName",
        accessorFn: (row) => row.itemName,
        meta: { label: "Item" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Item" />
        ),
        cell: ({ row }) => (
          <div>
            <span className="strong">{row.original.itemName}</span>
            {row.original.description && (
              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                {row.original.description}
              </p>
            )}
          </div>
        ),
      },
      {
        id: "category",
        accessorFn: (row) => row.categoryName,
        meta: { label: "Category" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Category" />
        ),
        cell: ({ row }) => (
          <span className="muted">{row.original.categoryName}</span>
        ),
      },
      {
        id: "price",
        meta: { label: "Price Range" },
        header: "Price",
        cell: ({ row }) => (
          <span className="text-sm tabular-nums">{priceRange(row.original.sizes)}</span>
        ),
        enableSorting: false,
      },
    ];

    // Enabled toggle — admin/manager in config mode
    if (canConfigure && configMode) {
      cols.push({
        id: "isEnabled",
        meta: { label: "Enabled" },
        header: "Enabled",
        cell: ({ row }) => {
          const item = row.original;
          return pendingItems.has(item.menuItemId) ? (
            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          ) : (
            <Switch
              checked={item.isEnabled}
              onChange={() => void handleToggleEnabled(item)}
              label={`Toggle ${item.itemName} enabled`}
            />
          );
        },
        enableSorting: false,
      });
    }

    // Available toggle — all roles
    cols.push({
      id: "isInStock",
      meta: { label: "Available" },
      header: "Available",
      cell: ({ row }) => {
        const item = row.original;
        return pendingItems.has(item.menuItemId) ? (
          <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        ) : (
          <Switch
            checked={item.isInStock}
            onChange={() => void handleToggleItemStock(item)}
            disabled={canConfigure && !item.isEnabled}
            label={`Toggle ${item.itemName} available`}
          />
        );
      },
      enableSorting: false,
    });

    // Prices button — admin/manager
    if (canConfigure) {
      cols.push({
        id: "prices",
        meta: { label: "Prices", export: false },
        header: "Prices",
        cell: ({ row }) => {
          const item = row.original;
          const hasPriceOverride = item.sizes.some((s) => s.branchPrice !== null);
          return (
            <button
              type="button"
              onClick={() => setPriceModal(item)}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors",
                hasPriceOverride
                  ? "bg-primary/10 text-primary hover:bg-primary/20"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              <DollarSign size={12} />
              {hasPriceOverride ? "Custom" : "Prices"}
            </button>
          );
        },
        enableSorting: false,
      });
    }

    return cols;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canConfigure, configMode, pendingItems, isCashier]);

  // ── Category tab bar ──────────────────────────────────────────────────────

  const categoryTabs = (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => { setCategoryFilter(null); setPageIndex(0); }}
        className={cn(
          "rounded-full border px-3 py-1 text-xs transition-colors",
          !categoryFilter
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-background text-foreground hover:bg-muted",
        )}
      >
        All ({filteredItems.length})
      </button>
      {categories.map((cat) => {
        const count = filteredItems.filter((i) => i.categoryId === cat.id).length;
        // Don't show category tab if all items in it are hidden.
        if (categoryFilter === null && count === 0) return null;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => { setCategoryFilter(cat.id); setPageIndex(0); }}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              categoryFilter === cat.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-foreground hover:bg-muted",
            )}
          >
            {cat.name}
          </button>
        );
      })}
    </div>
  );

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      <PageHeader
        title={isCashier ? "Available Menu" : "Branch Menu Config"}
        desc={
          isCashier
            ? "Mark items as available or unavailable for your branch"
            : "Enable items for each branch and set per-branch prices"
        }
      />

      {/* Branch selector — admin or manager with multiple POS branches */}
      {(isAdmin || (isManager && branchOptions.length > 1)) &&
      branchOptions.length > 0 ? (
        <div className="mb-6 max-w-xs">
          <Combobox
            value={branchId || undefined}
            onValueChange={(v) => {
              setSelectedBranchId(v ?? "");
              setCategoryFilter(null);
              setPageIndex(0);
              setConfigMode(false);
            }}
            items={branchOptions}
            placeholder="Select a branch…"
            searchPlaceholder="Search branches…"
            emptyText="No POS-enabled branches."
            className="w-full"
          />
        </div>
      ) : null}

      {/* No POS-enabled branches for this admin/manager */}
      {!isCashier && storesLoaded && branchOptions.length === 0 ? (
        <div className="mx-auto max-w-md rounded-xl border border-amber-500/30 bg-amber-500/5 p-8 text-center">
          <XCircle size={36} className="mx-auto mb-3 text-amber-500" />
          <p className="text-sm font-semibold text-foreground">
            No POS-enabled branches
          </p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {isAdmin ? (
              <>
                Enable POS from the{" "}
                <a
                  href="/branches"
                  className="text-primary underline underline-offset-2"
                >
                  Branches page
                </a>{" "}
                first, then return here to configure the menu.
              </>
            ) : (
              "None of your assigned branches have POS enabled. Ask an admin to enable POS first."
            )}
          </p>
        </div>
      ) : !branchId ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : isPending ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : !posEnabled ? (
        /* Branch does not have POS enabled */
        <div className="mx-auto max-w-md rounded-xl border border-amber-500/30 bg-amber-500/5 p-8 text-center">
          <XCircle size={36} className="mx-auto mb-3 text-amber-500" />
          <p className="text-sm font-semibold text-foreground">POS is not enabled for this branch</p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Enable POS from the{" "}
            <a href="/branches" className="text-primary underline underline-offset-2">
              Branches page
            </a>{" "}
            first, then return here to configure the menu.
          </p>
        </div>
      ) : isError ? (
        <div className="alert-error" style={{ marginTop: 16 }}>
          <XCircle size={16} />
          {error instanceof Error ? error.message : "Failed to load branch menu."}
          <button
            type="button"
            className="ml-auto text-xs underline underline-offset-2"
            onClick={() => void refetch()}
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ── Toolbar ───────────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-3">
            {canConfigure && (
              <span className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{enabledCount}</span>
                {" / "}
                {allItems.length} items enabled
                {selectedBranchName && (
                  <> for <span className="font-medium text-foreground">{selectedBranchName}</span></>
                )}
              </span>
            )}

            <div className="ml-auto flex items-center gap-2">
              {/* Config mode toggle — admin/manager */}
              {canConfigure && (
                <Button
                  size="sm"
                  variant={configMode ? "default" : "outline"}
                  onClick={() => setConfigMode((c) => !c)}
                >
                  <Settings2 size={14} />
                  {configMode ? "Done" : "Config"}
                </Button>
              )}

              {/* Bulk enable — admin in config mode */}
              {isAdmin && configMode && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void handleBulkEnable()}
                  disabled={bulkEnable.isPending || allItems.length === 0}
                >
                  {bulkEnable.isPending ? (
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      Enabling…
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <CheckSquare size={14} />
                      Enable all
                    </span>
                  )}
                </Button>
              )}

              {/* View toggle */}
              <div className="flex rounded-md border border-input">
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={cn(
                    "flex items-center px-2.5 py-1.5 text-xs transition-colors rounded-l-md",
                    viewMode === "table"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:text-foreground",
                  )}
                  title="Table view"
                >
                  <List size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "flex items-center px-2.5 py-1.5 text-xs transition-colors rounded-r-md border-l border-input",
                    viewMode === "grid"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:text-foreground",
                  )}
                  title="Grid view"
                >
                  <Grid3X3 size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* ── Menu items ────────────────────────────────────────────────── */}
          {viewMode === "table" ? (
            <DataTable
              columns={columns}
              data={pageRows}
              rowCount={filteredItems.length}
              pageIndex={pageIndex}
              pageSize={pageSize}
              onPaginationChange={(state: PaginationState) => {
                setPageIndex(state.pageIndex);
                setPageSize(state.pageSize);
              }}
              searchValue={search}
              onSearchChange={(v) => { setSearch(v); setPageIndex(0); }}
              searchPlaceholder="Search items…"
              getRowId={(row) => row.menuItemId}
              enableRowSelection={false}
              enableColumnVisibility={false}
              enableExport={false}
              toolbarExtra={categoryTabs}
              emptyTitle={configMode ? "No items in the catalogue" : "No enabled items"}
              emptyDescription={
                configMode
                  ? "Add items from the Menu Items page first."
                  : "Click Config to enable items for this branch."
              }
            />
          ) : (
            /* Grid view */
            <div className="space-y-4">
              {/* Search + categories */}
              <div className="space-y-3">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search items…"
                  className="flex h-9 w-full max-w-xs rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                {categoryTabs}
              </div>

              {filteredItems.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm font-medium text-muted-foreground">
                    {configMode ? "No items in the catalogue" : "No enabled items"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {configMode
                      ? "Add items from the Menu Items page first."
                      : "Click Config to enable items for this branch."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {filteredItems.map((item) => (
                    <MenuGridCard
                      key={item.menuItemId}
                      item={item}
                      showConfig={canConfigure && configMode}
                      showStockToggle={isCashier}
                      pending={pendingItems.has(item.menuItemId)}
                      onToggleEnabled={() => void handleToggleEnabled(item)}
                      onToggleStock={() => void handleToggleItemStock(item)}
                      onPrices={() => setPriceModal(item)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TOPPINGS HIDDEN
          <Card title="Toppings — Stock Status" pad>
            {toppings.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No toppings configured for this branch.
              </p>
            ) : (
              <div className="overflow-x-auto -mx-4 px-4">
                <table className="w-full min-w-[320px] text-left">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="pb-2 pr-4 text-xs font-medium text-muted-foreground">Topping</th>
                      <th className="pb-2 pr-4 text-xs font-medium text-muted-foreground">Price</th>
                      <th className="pb-2 text-center text-xs font-medium text-muted-foreground">
                        In Stock
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {toppings.map((topping) => (
                      <ToppingRow
                        key={topping.toppingId}
                        topping={topping}
                        pending={pendingToppings.has(topping.toppingId)}
                        onToggleStock={() => void handleToggleToppingStock(topping)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
          */}
        </div>
      )}

      {/* Price override modal */}
      {priceModal && branchId ? (
        <ItemPricesModal
          open
          branchId={branchId}
          item={priceModal}
          onClose={() => setPriceModal(null)}
        />
      ) : null}
    </>
  );
}
