"use client";

import { memo, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";

import { MenuItemImage } from "@/components/pos/menu-item-image";
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
): { id: string; name: string }[] {
  const seen = new Map<string, string>();
  for (const item of items) {
    if (!seen.has(item.categoryId)) {
      seen.set(item.categoryId, item.categoryName);
    }
  }
  return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
}

const CATEGORY_COLORS = [
  {
    idle: "bg-amber-100 text-amber-800 hover:bg-amber-200",
    active: "bg-amber-500 text-white",
  },
  {
    idle: "bg-sky-100 text-sky-800 hover:bg-sky-200",
    active: "bg-sky-500 text-white",
  },
  {
    idle: "bg-emerald-100 text-emerald-800 hover:bg-emerald-200",
    active: "bg-emerald-500 text-white",
  },
  {
    idle: "bg-violet-100 text-violet-800 hover:bg-violet-200",
    active: "bg-violet-500 text-white",
  },
  {
    idle: "bg-rose-100 text-rose-800 hover:bg-rose-200",
    active: "bg-rose-500 text-white",
  },
  {
    idle: "bg-teal-100 text-teal-800 hover:bg-teal-200",
    active: "bg-teal-500 text-white",
  },
  {
    idle: "bg-orange-100 text-orange-800 hover:bg-orange-200",
    active: "bg-orange-500 text-white",
  },
  {
    idle: "bg-indigo-100 text-indigo-800 hover:bg-indigo-200",
    active: "bg-indigo-500 text-white",
  },
] as const;

export const MenuGrid = memo(function MenuGrid({ items, onItemSelect }: Props) {
  const categories = useMemo(() => buildCategories(items), [items]);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const displayed = useMemo(() => {
    let result = activeCat
      ? items.filter((it) => it.categoryId === activeCat)
      : items;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((it) => it.itemName.toLowerCase().includes(q));
    }
    return result;
  }, [items, activeCat, search]);

  if (items.length === 0) {
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
      <div className="flex-shrink-0 space-y-2.5 px-3 pt-3 pb-2">
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

        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          <CategoryTab
            label="All"
            active={activeCat === null}
            onClick={() => setActiveCat(null)}
          />
          {categories.map((cat, i) => (
            <CategoryTab
              key={cat.id}
              label={cat.name}
              active={activeCat === cat.id}
              onClick={() => setActiveCat(cat.id)}
              colors={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
            />
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
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
  active,
  onClick,
  colors,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  colors?: { idle: string; active: string };
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-8 flex-shrink-0 rounded-full px-3.5 text-sm font-medium transition-colors",
        colors
          ? active
            ? colors.active
            : colors.idle
          : active
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
      )}
    >
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
