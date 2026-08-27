"use client";

import { memo, useMemo, useState, type ReactNode } from "react";
import { LayoutGrid, Plus, Search } from "lucide-react";

import { MenuItemImage } from "@/components/pos/menu-item-image";
import { getMenuCategoryIcon } from "@/lib/pos/category-icons";
import { cn } from "@/lib/utils";
import type { BranchMenuItemConfig } from "@/types/pos/branch-menu";

interface Props {
  items: BranchMenuItemConfig[];
  onItemSelect: (item: BranchMenuItemConfig) => void;
}

function fmtPrice(item: BranchMenuItemConfig): string {
  const prices = item.sizes
    .filter((s) => s.isActive)
    .map((s) => Number(s.effectivePrice));
  if (prices.length === 0) return "—";
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const fmt = (n: number) =>
    n.toLocaleString("en-KE", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  return min === max ? `KSh ${fmt(min)}` : `KSh ${fmt(min)}–${fmt(max)}`;
}

function buildCategories(
  items: BranchMenuItemConfig[],
): { id: string; name: string; icon: string | null }[] {
  const seen = new Map<string, { name: string; icon: string | null }>();
  for (const item of items) {
    if (!seen.has(item.categoryId)) {
      seen.set(item.categoryId, {
        name: item.categoryName,
        icon: item.categoryIcon ?? null,
      });
    }
  }
  return Array.from(seen.entries()).map(([id, v]) => ({
    id,
    name: v.name,
    icon: v.icon,
  }));
}

/** Soft brand pastels for idle pills; selected always uses primary. */
const CATEGORY_PASTELS = [
  "bg-[var(--tint-indigo)] text-[var(--brand-indigo)] hover:bg-[color-mix(in_srgb,var(--brand-indigo)_12%,var(--tint-indigo))]",
  "bg-[var(--tint-teal)] text-[var(--brand-teal-600)] hover:bg-[color-mix(in_srgb,var(--brand-teal)_18%,var(--tint-teal))]",
  "bg-[var(--tint-violet)] text-[var(--brand-violet-600)] hover:bg-[color-mix(in_srgb,var(--brand-violet)_14%,var(--tint-violet))]",
  "bg-[var(--tint-emerald)] text-emerald-800 hover:bg-emerald-100",
  "bg-[var(--tint-amber)] text-amber-800 hover:bg-amber-100",
  "bg-[var(--tint-rose)] text-rose-800 hover:bg-rose-100",
] as const;

export const MenuGrid = memo(function MenuGrid({ items, onItemSelect }: Props) {
  const sellable = useMemo(
    () => items.filter((it) => it.isEnabled),
    [items],
  );
  const categories = useMemo(() => buildCategories(sellable), [sellable]);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const displayed = useMemo(() => {
    let result = activeCat
      ? sellable.filter((it) => it.categoryId === activeCat)
      : sellable;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((it) => it.itemName.toLowerCase().includes(q));
    }
    return result;
  }, [sellable, activeCat, search]);

  if (sellable.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
        <p className="text-sm font-medium">No items available</p>
        <p className="text-xs">
          Ask your manager to enable items for this branch.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex-shrink-0 space-y-2.5 border-b border-border px-3 pb-3 pt-3">
        <div className="relative">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items…"
            className="flex h-10 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm text-foreground shadow-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="flex min-w-0 gap-2 overflow-x-auto pb-0.5">
          <CategoryTab
            label="All"
            icon={<LayoutGrid size={16} />}
            active={activeCat === null}
            onClick={() => setActiveCat(null)}
            idleClass="bg-[var(--tint-slate)] text-primary hover:bg-[color-mix(in_srgb,var(--brand-indigo)_10%,var(--tint-slate))]"
          />
          {categories.map((cat, i) => {
            const Icon = getMenuCategoryIcon(cat.icon);
            return (
              <CategoryTab
                key={cat.id}
                label={cat.name}
                icon={<Icon size={16} />}
                active={activeCat === cat.id}
                onClick={() => setActiveCat(cat.id)}
                idleClass={CATEGORY_PASTELS[i % CATEGORY_PASTELS.length]}
              />
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pt-3 pb-3">
        {displayed.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No items match your search.
          </p>
        ) : (
          <div className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(148px,1fr))] lg:gap-2 lg:[grid-template-columns:repeat(auto-fill,minmax(132px,1fr))]">
            {displayed.map((item) => (
              <ItemCard
                key={item.menuItemId}
                item={item}
                onClick={() => onItemSelect(item)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

function CategoryTab({
  label,
  icon,
  active,
  onClick,
  idleClass,
}: {
  label: string;
  icon?: ReactNode;
  active: boolean;
  onClick: () => void;
  idleClass?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-2 rounded-md px-4 text-sm font-medium shadow-none transition-colors",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : (idleClass ??
              "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"),
      )}
    >
      {icon ? <span className="shrink-0">{icon}</span> : null}
      {label}
    </button>
  );
}

function ItemCard({
  item,
  onClick,
}: {
  item: BranchMenuItemConfig;
  onClick: () => void;
}) {
  const activeSizes = item.sizes.filter((s) => s.isActive);
  const unavailable = !item.isInStock || activeSizes.length === 0;

  return (
    <button
      type="button"
      onClick={!unavailable ? onClick : undefined}
      disabled={unavailable}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card text-left shadow-sm transition-all",
        unavailable
          ? "cursor-not-allowed opacity-50"
          : "hover:border-primary/40 hover:shadow-md active:scale-[0.98]",
      )}
    >
      <span
        className={cn(
          "absolute right-1.5 top-1.5 z-10 size-1.5 rounded-full ring-2 ring-card",
          unavailable ? "bg-destructive" : "bg-emerald-500",
        )}
        aria-hidden
      />

      <div className="relative flex items-center justify-center px-2 pb-2 pt-3">
        <div className="relative aspect-square w-[78%] max-w-[5.5rem] overflow-hidden bg-card p-0.5 lg:max-w-[5.25rem]">
          <MenuItemImage
            imageKey={item.imageKey}
            src={item.imageUrl}
            alt={item.itemName}
            className="h-full w-full rounded-none bg-transparent"
          />
          {unavailable ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70">
              <span className="rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
                Out of stock
              </span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-between gap-1.5 bg-muted px-2 py-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium leading-tight">
            {item.itemName}
          </p>
          <p className="mt-px truncate whitespace-nowrap text-[10px] font-normal leading-tight text-muted-foreground">
            {fmtPrice(item)}
          </p>
        </div>
        {!unavailable ? (
          <span
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-background text-primary shadow-sm"
            aria-hidden
          >
            <Plus size={13} />
          </span>
        ) : null}
      </div>
    </button>
  );
}
