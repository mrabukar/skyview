"use client";

import { useMemo, useState } from "react";
import {
  Apple,
  Coffee,
  Crown,
  CupSoda,
  Droplets,
  Snowflake,
  Sparkles,
  Star,
} from "lucide-react";

import { LogoMark } from "@/components/logo";
import { MenuItemImage } from "@/components/pos/menu-item-image";
import { APP_NAME } from "@/lib/page-title";
import {
  POSTER_CARDS_PER_ROW,
  POSTER_DEFAULT_TOPPING_PRICE,
  POSTER_DEFAULT_TOPPINGS,
  POSTER_ICE_LEVELS,
  POSTER_SUGAR_LEVELS,
  categoryMenuBlurb,
  chunkPosterPages,
  customerMenuBlurb,
  filledSizePrices,
  formatMenuPrice,
  uniqueMenuCategories,
  type CustomerMenuItem,
  type PosterCategoryRow,
  type PosterTopping,
} from "@/lib/pos/customer-menu";

const ALL = "__all__";

interface Props {
  items: CustomerMenuItem[];
  branchName: string;
  organizationName?: string | null;
  toppings?: PosterTopping[];
  categoryDescriptions?: Record<string, string | null>;
}

const GLASS =
  "rounded-2xl border border-white/15 bg-black/40 shadow-[0_8px_28px_rgba(0,0,0,0.28)] backdrop-blur-md";

function categoryIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes("milk")) return Coffee;
  if (n.includes("fruit")) return Apple;
  if (n.includes("premium")) return Crown;
  if (n.includes("special")) return Sparkles;
  if (n.includes("topping")) return Star;
  return CupSoda;
}

export function CustomerMenuPoster({
  items,
  branchName,
  organizationName,
  toppings = [],
  categoryDescriptions = {},
}: Props) {
  const [selectedCategory, setSelectedCategory] = useState(ALL);
  const categories = uniqueMenuCategories(items);
  const toppingNames =
    toppings.length > 0
      ? toppings.slice(0, 5).map((t) => t.name)
      : [...POSTER_DEFAULT_TOPPINGS];
  const toppingPrice = toppings[0]?.price ?? POSTER_DEFAULT_TOPPING_PRICE;

  const filtered = useMemo(
    () =>
      selectedCategory === ALL
        ? items
        : items.filter((item) => item.categoryName === selectedCategory),
    [items, selectedCategory],
  );

  const previewPages = chunkPosterPages(filtered);
  const printPages = chunkPosterPages(items);
  const org = (organizationName || APP_NAME).toUpperCase();

  const chrome = {
    org,
    branchName,
    organizationName,
    categories,
    toppingNames,
    toppingPrice,
    categoryDescriptions,
  };

  return (
    <>
      <style
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: `
.poster-script { font-family: "Great Vibes", cursive; }
.customer-menu-poster-print { display: none; }
@media print {
  .navbar,
  .sidebar,
  .customer-menu-actions,
  .page-head,
  [data-sidebar],
  header[role="banner"] {
    display: none !important;
  }
  @page { size: A4 landscape; margin: 0; }
  body, html { background: #12081a !important; margin: 0 !important; }
  .app-main { padding: 0 !important; background: #12081a !important; }
  .app-content { overflow: visible !important; padding: 0 !important; }
  .customer-menu-poster-preview { display: none !important; }
  .customer-menu-poster-print { display: flex !important; flex-direction: column; }
  .customer-menu-poster-sheet { gap: 0 !important; max-width: none !important; }
  .customer-menu-poster-page {
    box-shadow: none !important;
    border: none !important;
    margin: 0 !important;
    width: 100% !important;
    height: 100vh;
    aspect-ratio: auto !important;
    border-radius: 0 !important;
    page-break-after: always;
    break-after: page;
  }
  .customer-menu-poster-page:last-child {
    page-break-after: auto;
    break-after: auto;
  }
  .customer-menu-poster-page,
  .customer-menu-poster-page img {
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
}
`,
        }}
      />

      <div className="customer-menu-poster-preview customer-menu-poster-sheet mx-auto flex max-w-[1120px] flex-col gap-8">
        {(previewPages.length > 0 ? previewPages : [[]]).map(
          (pageRows, pageIdx) => (
            <PosterPage
              key={`preview-${pageIdx}`}
              pageRows={pageRows}
              chrome={chrome}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />
          ),
        )}
      </div>

      <div className="customer-menu-poster-print customer-menu-poster-sheet mx-auto flex-col gap-8">
        {printPages.map((pageRows, pageIdx) => (
          <PosterPage
            key={`print-${pageIdx}`}
            pageRows={pageRows}
            chrome={chrome}
            selectedCategory={ALL}
          />
        ))}
      </div>
    </>
  );
}

function PosterPage({
  pageRows,
  chrome,
  selectedCategory,
  onSelectCategory,
}: {
  pageRows: PosterCategoryRow[];
  chrome: {
    org: string;
    branchName: string;
    organizationName?: string | null;
    categories: string[];
    toppingNames: string[];
    toppingPrice: number;
    categoryDescriptions: Record<string, string | null>;
  };
  selectedCategory: string;
  onSelectCategory?: (value: string) => void;
}) {
  return (
    <article className="customer-menu-poster-page relative flex aspect-[297/210] w-full flex-col overflow-hidden rounded-xl text-white shadow-lg">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/menu/skyview_bubble_tea_background.png"
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />
      <div className="pointer-events-none absolute inset-0 bg-[#12081a]/25" />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col px-5 py-3.5">
        <header className="mb-2 flex flex-col items-center text-center">
          <LogoMark size={36} />
          <h2 className="mt-1 text-lg font-extrabold tracking-[0.22em]">
            {chrome.org}
          </h2>
          <p className="poster-script text-[22px] leading-none text-white">
            — Bubble Tea Menu —
          </p>
          <p className="mt-0.5 text-[10px] tracking-wide text-white/80">
            Fresh. Chewy. Delicious. · {chrome.branchName}
          </p>
        </header>

        <div className="mb-2.5 flex flex-wrap justify-center gap-1.5">
          <CategoryChip
            label="All Drinks"
            active={selectedCategory === ALL}
            Icon={CupSoda}
            onClick={
              onSelectCategory ? () => onSelectCategory(ALL) : undefined
            }
          />
          {chrome.categories.map((name) => {
            const Icon = categoryIcon(name);
            return (
              <CategoryChip
                key={name}
                label={name}
                active={selectedCategory === name}
                Icon={Icon}
                onClick={
                  onSelectCategory ? () => onSelectCategory(name) : undefined
                }
              />
            );
          })}
        </div>

        {pageRows.length === 0 ? (
          <div className={`${GLASS} flex flex-1 items-center justify-center`}>
            <p className="text-sm text-white/70">No drinks in this category</p>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-2">
            {pageRows.map((row, i) => (
              <CategoryRow
                key={`${row.categoryName}-${i}`}
                row={row}
                description={categoryMenuBlurb(
                  row.categoryName,
                  chrome.categoryDescriptions,
                )}
              />
            ))}
          </div>
        )}

        <div
          className={`${GLASS} mt-2.5 grid grid-cols-3 divide-x divide-dotted divide-white/25`}
        >
          <div className="flex items-start gap-2 px-3 py-2.5">
            <CupSoda size={16} className="mt-0.5 shrink-0 text-pink-400" />
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold">Extra Toppings</p>
                <span className="shrink-0 rounded-full bg-[#c084fc] px-2 py-0.5 text-[9px] font-bold text-[#1a0f0c]">
                  + KSh {formatMenuPrice(chrome.toppingPrice)}
                </span>
              </div>
              <p className="text-[10px] leading-relaxed text-white/70">
                {chrome.toppingNames.join(" · ")}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2 px-3 py-2.5">
            <Sparkles size={16} className="mt-0.5 shrink-0 text-pink-400" />
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold">Less Sugar</p>
                <span className="shrink-0 rounded-full border border-[#f9a72a]/60 px-2 py-0.5 text-[9px] font-bold text-[#f9a72a]">
                  FREE
                </span>
              </div>
              <p className="text-[10px] tracking-wide text-white/70">
                {POSTER_SUGAR_LEVELS.join(" · ")}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2 px-3 py-2.5">
            <Snowflake size={16} className="mt-0.5 shrink-0 text-sky-400" />
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold">Ice Level</p>
                <span className="flex shrink-0 items-center gap-1 rounded-full border border-[#f9a72a]/60 px-2 py-0.5 text-[9px] font-bold text-[#f9a72a]">
                  <Droplets size={10} />
                  FREE
                </span>
              </div>
              <p className="text-[10px] tracking-wide text-white/70">
                {POSTER_ICE_LEVELS.join(" · ")}
              </p>
            </div>
          </div>
        </div>

        <p className="mt-2 text-center text-[10px] text-white/70">
          Thank you for choosing {chrome.organizationName || APP_NAME}. Enjoy
          your drink!
        </p>
      </div>
    </article>
  );
}

function CategoryRow({
  row,
  description,
}: {
  row: PosterCategoryRow;
  description: string;
}) {
  const Icon = categoryIcon(row.categoryName);
  return (
    <section
      className={`${GLASS} grid min-h-0 flex-1 grid-cols-[18%_1fr] gap-2 px-2.5 py-2`}
    >
      <div className="flex flex-col items-center justify-center px-2 text-center">
        <span className="mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-[#f9a72a]/20 text-[#f9a72a]">
          <Icon size={16} />
        </span>
        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em]">
          {row.categoryName}
        </p>
        <p className="mt-0.5 line-clamp-2 text-[9px] leading-snug text-white/60">
          {description}
        </p>
      </div>
      <div
        className="grid min-h-0 gap-2"
        style={{
          gridTemplateColumns: `repeat(${POSTER_CARDS_PER_ROW}, minmax(0, 1fr))`,
        }}
      >
        {row.items.map((item) => (
          <DrinkCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

function DrinkCard({ item }: { item: CustomerMenuItem }) {
  const prices = filledSizePrices(item.prices);
  return (
    <div className="flex min-h-0 items-center gap-2 rounded-xl border border-white/12 bg-black/35 px-2 py-1.5">
                  <MenuItemImage
                    imageKey={item.imageKey}
                    alt={item.name}
                    className="h-16 w-12 shrink-0 rounded-lg bg-black/25 ring-1 ring-white/15"
                  />
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="truncate text-[11px] font-bold leading-tight">
          {item.name}
        </p>
        <p className="mt-0.5 line-clamp-2 text-[9px] leading-snug text-white/65">
          {customerMenuBlurb(item)}
        </p>
        <div className="mt-auto grid grid-cols-3 gap-1 pt-1.5 text-center">
          {(["S", "M", "L"] as const).map((label, i) => (
            <div key={label}>
              <p className="mb-0.5 text-[8px] font-semibold tracking-wide text-white/55">
                {label}
              </p>
              <p className="rounded-md border border-fuchsia-400/30 bg-black/55 py-0.5 text-[10px] font-semibold tabular-nums">
                {formatMenuPrice(prices[i])}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CategoryChip({
  label,
  active,
  Icon,
  onClick,
}: {
  label: string;
  active?: boolean;
  Icon: typeof CupSoda;
  onClick?: () => void;
}) {
  const className = `inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
    active
      ? "border-[#f9a72a] bg-[#f9a72a]/15 text-white shadow-[0_0_14px_rgba(249,167,42,0.45)]"
      : "border-white/20 bg-black/35 text-white/85 hover:border-white/40"
  }`;

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        <Icon
          size={11}
          className={active ? "text-[#f9a72a]" : "text-white/70"}
        />
        {label}
      </button>
    );
  }

  return (
    <span className={className}>
      <Icon
        size={11}
        className={active ? "text-[#f9a72a]" : "text-white/70"}
      />
      {label}
    </span>
  );
}
