"use client";

import * as React from "react";
import { Check, ChevronDown, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface ComboboxItem {
  value: string;
  label: string;
  keywords?: string[];
}

interface ComboboxProps {
  value?: string;
  onValueChange: (value: string | undefined) => void;
  items: ComboboxItem[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  clearOption?: { label: string };
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  popoverClassName?: string;
}

export function Combobox({
  value,
  onValueChange,
  items,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No results found.",
  clearOption,
  loading = false,
  disabled = false,
  className,
  popoverClassName,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);

  const selectedLabel = React.useMemo(() => {
    if (!value) return null;
    return items.find((item) => item.value === value)?.label ?? null;
  }, [items, value]);

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || loading}
          className={cn(
            "h-9 min-w-[180px] justify-between font-normal",
            !selectedLabel && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">
            {loading ? "Loading…" : (selectedLabel ?? placeholder)}
          </span>
          {loading ? (
            <Loader2 className="ml-2 size-4 shrink-0 animate-spin opacity-50" />
          ) : (
            <ChevronDown className="ml-2 size-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          "z-50 flex w-[var(--radix-popover-trigger-width)] min-w-[12rem] flex-col overflow-hidden p-0",
          popoverClassName,
        )}
        align="start"
        side="bottom"
        collisionPadding={12}
      >
        <Command className="max-h-[min(20rem,var(--radix-popover-content-available-height))]">
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList className="min-h-0 flex-1">
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {clearOption && (
                <CommandItem
                  value={clearOption.label}
                  keywords={[clearOption.label, "all"]}
                  onSelect={() => {
                    onValueChange(undefined);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "size-4",
                      !value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {clearOption.label}
                </CommandItem>
              )}
              {items.map((item) => (
                <CommandItem
                  key={item.value}
                  value={item.label}
                  keywords={item.keywords ?? [item.label, item.value]}
                  onSelect={() => {
                    onValueChange(item.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "size-4",
                      value === item.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

interface MultiComboboxProps {
  values: string[];
  onValuesChange: (values: string[]) => void;
  items: ComboboxItem[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  popoverClassName?: string;
}

/** Searchable multi-select combobox — stays open while toggling options. */
export function MultiCombobox({
  values,
  onValuesChange,
  items,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No results found.",
  loading = false,
  disabled = false,
  className,
  popoverClassName,
}: MultiComboboxProps) {
  const [open, setOpen] = React.useState(false);

  const selected = React.useMemo(
    () =>
      values
        .map((id) => items.find((item) => item.value === id))
        .filter((item): item is ComboboxItem => Boolean(item)),
    [items, values],
  );

  const toggle = (id: string) => {
    if (values.includes(id)) {
      onValuesChange(values.filter((v) => v !== id));
    } else {
      onValuesChange([...values, id]);
    }
  };

  const remove = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onValuesChange(values.filter((v) => v !== id));
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || loading}
          className={cn(
            "h-auto min-h-10 min-w-[180px] justify-between gap-2 py-1.5 font-normal",
            selected.length === 0 && "text-muted-foreground",
            className,
          )}
        >
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            {loading ? (
              <span>Loading…</span>
            ) : selected.length === 0 ? (
              <span>{placeholder}</span>
            ) : (
              selected.map((item) => (
                <span
                  key={item.value}
                  className="inline-flex max-w-full items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-xs text-foreground"
                >
                  <span className="truncate">{item.label}</span>
                  <span
                    role="button"
                    tabIndex={-1}
                    className="rounded-sm opacity-60 hover:opacity-100"
                    onClick={(e) => remove(item.value, e)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        remove(
                          item.value,
                          e as unknown as React.MouseEvent,
                        );
                      }
                    }}
                    aria-label={`Remove ${item.label}`}
                  >
                    <X className="size-3" />
                  </span>
                </span>
              ))
            )}
          </div>
          {loading ? (
            <Loader2 className="size-4 shrink-0 animate-spin opacity-50" />
          ) : (
            <ChevronDown className="size-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          "z-50 flex w-[var(--radix-popover-trigger-width)] min-w-[12rem] flex-col overflow-hidden p-0",
          popoverClassName,
        )}
        align="start"
        side="bottom"
        collisionPadding={12}
      >
        <Command className="max-h-[min(20rem,var(--radix-popover-content-available-height))]">
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList className="min-h-0 flex-1">
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {items.map((item) => {
                const isSelected = values.includes(item.value);
                return (
                  <CommandItem
                    key={item.value}
                    value={item.label}
                    keywords={item.keywords ?? [item.label, item.value]}
                    onSelect={() => toggle(item.value)}
                  >
                    <Check
                      className={cn(
                        "size-4",
                        isSelected ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {item.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
