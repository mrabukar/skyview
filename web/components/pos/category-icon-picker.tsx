"use client";

import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import {
  DEFAULT_MENU_CATEGORY_ICON,
  MENU_CATEGORY_ICON_NAMES,
  MENU_CATEGORY_ICONS,
  type MenuCategoryIconName,
} from "@/lib/pos/category-icons";

interface Props {
  value: MenuCategoryIconName;
  onChange: (name: MenuCategoryIconName) => void;
}

export function CategoryIconPicker({ value, onChange }: Props) {
  const [query, setQuery] = useState("");

  const names = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MENU_CATEGORY_ICON_NAMES;
    return MENU_CATEGORY_ICON_NAMES.filter((name) =>
      name.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <div className="grid gap-2">
      <label className="text-sm font-medium leading-none">Icon</label>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search icons…"
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <div className="grid max-h-48 grid-cols-7 gap-1.5 overflow-y-auto rounded-md border border-border p-2">
        {names.map((name) => {
          const Icon = MENU_CATEGORY_ICONS[name];
          const selected = name === value;
          return (
            <button
              key={name}
              type="button"
              title={name}
              aria-label={name}
              aria-pressed={selected}
              onClick={() => onChange(name)}
              className={cn(
                "flex aspect-square items-center justify-center rounded-md border transition-colors",
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-transparent bg-muted/60 text-foreground hover:bg-muted",
              )}
            >
              <Icon size={16} />
            </button>
          );
        })}
        {names.length === 0 ? (
          <p className="col-span-7 py-4 text-center text-xs text-muted-foreground">
            No icons match “{query.trim()}”.
          </p>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">
        Shown on the POS category bar. Default is {DEFAULT_MENU_CATEGORY_ICON}.
      </p>
    </div>
  );
}
