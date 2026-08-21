"use client";

import { LogoMark } from "@/components/logo";
import { MenuItemImage } from "@/components/pos/menu-item-image";
import { APP_NAME } from "@/lib/page-title";
import {
  CUSTOMER_MENU_PAGE_SIZE,
  chunkPages,
  formatMenuPrice,
  groupCustomerMenuByCategory,
  type CustomerMenuItem,
} from "@/lib/pos/customer-menu";

interface Props {
  items: CustomerMenuItem[];
  branchName: string;
  organizationName?: string | null;
}

const ROW =
  "grid grid-cols-[36px_minmax(0,1fr)_44px_44px_44px] items-center gap-x-3";

export function CustomerMenuSheet({
  items,
  branchName,
  organizationName,
}: Props) {
  const pages = chunkPages(items, CUSTOMER_MENU_PAGE_SIZE);
  const org = (organizationName || APP_NAME).toUpperCase();

  return (
    <>
      <style
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: `
@media print {
  .navbar,
  .sidebar,
  .customer-menu-actions,
  .page-head,
  [data-sidebar],
  header[role="banner"] {
    display: none !important;
  }
  body, html { background: #1a0f0c !important; margin: 0 !important; }
  .app-main { padding: 0 !important; background: #1a0f0c !important; }
  .app-content { overflow: visible !important; padding: 0 !important; }
  .customer-menu-sheet { gap: 0 !important; max-width: none !important; }
  .customer-menu-page {
    box-shadow: none !important;
    border: none !important;
    margin: 0 !important;
    width: 100% !important;
    min-height: 100vh;
    border-radius: 0 !important;
    page-break-after: always;
    break-after: page;
  }
  .customer-menu-page:last-child {
    page-break-after: auto;
    break-after: auto;
  }
  .customer-menu-page,
  .customer-menu-page img {
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
}
`,
        }}
      />

      <div className="customer-menu-sheet mx-auto flex max-w-[820px] flex-col gap-8">
        {pages.map((pageItems, pageIdx) => {
          const groups = groupCustomerMenuByCategory(pageItems);
          return (
            <article
              key={pageIdx}
              className="customer-menu-page relative overflow-hidden rounded-xl text-[#fdf6ec] shadow-lg"
              style={{ backgroundColor: "#1a0f0c" }}
            >
              {/* Decorative edges */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/menu/cup-left.png"
                alt=""
                className="pointer-events-none absolute -left-6 bottom-8 w-[220px] opacity-80"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/menu/pour-right.png"
                alt=""
                className="pointer-events-none absolute -right-8 top-16 w-[210px] opacity-80"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/menu/pearls-bottom.png"
                alt=""
                className="pointer-events-none absolute inset-x-0 bottom-0 h-28 w-full object-cover opacity-70"
              />
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "radial-gradient(ellipse at center, rgba(26,15,12,0.15) 0%, rgba(26,15,12,0.72) 70%, #1a0f0c 100%)",
                }}
              />
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-44"
                style={{
                  background:
                    "linear-gradient(to top, #1a0f0c 0%, #1a0f0c 42%, rgba(26,15,12,0.88) 68%, transparent 100%)",
                }}
              />

              <div className="relative z-10 px-10 pb-40 pt-10">
                <header className="mb-10 flex flex-col items-center gap-1.5 text-center">
                  <LogoMark size={48} />
                  <p className="mt-2 text-xs font-semibold tracking-[0.35em] text-[#f9a72a]">
                    MENU
                  </p>
                  <h2 className="text-3xl font-extrabold tracking-[0.18em]">
                    {org}
                  </h2>
                  <p className="text-sm tracking-wide text-[#d4c4b0]">
                    {branchName}
                  </p>
                  <p className="text-[11px] text-[#a89078]">Prices in KSh</p>
                </header>

                <div className="mx-auto max-w-[520px] space-y-8">
                  {groups.map((group) => (
                    <section key={group.categoryName}>
                      <div className="mb-2 flex items-center gap-3">
                        <span
                          className="h-px flex-1 bg-[#f9a72a]/40"
                          aria-hidden
                        />
                        <div className="text-center">
                          <p className="text-[9px] font-semibold uppercase tracking-[0.35em] text-[#a89078]">
                            Category
                          </p>
                          <h3 className="text-base font-bold uppercase tracking-[0.28em] text-[#f9a72a]">
                            {group.categoryName}
                          </h3>
                        </div>
                        <span
                          className="h-px flex-1 bg-[#f9a72a]/40"
                          aria-hidden
                        />
                      </div>
                      <div className={`${ROW} mb-3`}>
                        <span />
                        <span />
                        {(["S", "M", "L"] as const).map((label) => (
                          <span
                            key={label}
                            className="text-center text-[11px] font-semibold tracking-wider text-[#f9a72a]"
                          >
                            {label}
                          </span>
                        ))}
                      </div>

                      <ul className="space-y-2.5">
                        {group.items.map((item) => (
                          <li key={item.id} className={ROW}>
                            <MenuItemImage
                              imageKey={item.imageKey}
                              alt={item.name}
                              className="h-12 w-9 rounded-md bg-black/20 ring-1 ring-[#f9a72a]/30"
                            />
                            <div className="flex min-w-0 items-baseline gap-2">
                              <span className="shrink-0 text-sm font-medium">
                                {item.name}
                              </span>
                              <span
                                className="min-w-0 flex-1 border-b border-dotted border-[#a89078]/50"
                                aria-hidden
                              />
                            </div>
                            {item.prices.map((price, i) => (
                              <span
                                key={i}
                                className="text-center text-sm tabular-nums text-[#fdf6ec]"
                              >
                                {formatMenuPrice(price)}
                              </span>
                            ))}
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
