/**
 * Printable HTML tax invoice.
 * Print CSS lives here via a <style> tag injected into the host document.
 */

import { LogoMark } from "@/components/logo";
import {
  WALK_IN_CUSTOMER,
  discountLabel,
  fmtDateTime,
  fmtInvoiceDate,
  fmtInvoiceId,
  fmtKsh,
  invoiceLineCount,
  invoiceQtyTotal,
  orgDisplayName,
  paymentLabel,
} from "@/lib/pos/invoice";
import type { PosOrder } from "@/types/pos/order";

interface Props {
  order: PosOrder;
  organizationName?: string | null;
}

export function InvoiceCard({
  order,
  organizationName,
}: Props) {
  const isVoided = order.status === "voided";
  const invoiceId = fmtInvoiceId(order.orderNumber, order.createdAt);
  const orgName = orgDisplayName(organizationName);
  const discount = discountLabel(order);
  const contact = [order.store?.name, order.store?.address]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <style
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: `
@media print {
  .page-head,
  .navbar,
  .sidebar,
  .invoice-actions,
  [data-sidebar],
  header[role="banner"] {
    display: none !important;
  }
  body * {
    visibility: hidden;
  }
  .invoice-card,
  .invoice-card * {
    visibility: visible;
  }
  html, body {
    background: white !important;
    margin: 0 !important;
    padding: 0 !important;
  }
  .app-main,
  .app-content,
  .app-content-inner {
    padding: 0 !important;
    margin: 0 !important;
    max-width: none !important;
    overflow: visible !important;
  }
  .invoice-card {
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
    border: none !important;
    box-shadow: none !important;
    border-radius: 0 !important;
    width: 80mm !important;
    max-width: 80mm !important;
    margin: 0 !important;
    padding: 4mm !important;
    background: white !important;
  }
  .invoice-card,
  .invoice-card th {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
}
@page {
  size: 80mm auto;
  margin: 0;
}
`,
        }}
      />

      <div
        className="invoice-card relative mx-auto w-full max-w-lg rounded-xl border border-border bg-background px-6 py-7 shadow-sm"
        id="invoice-card"
      >
        {isVoided ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden rounded-xl"
          >
            <span
              className="select-none text-6xl font-black text-rose-500/15 dark:text-rose-400/15"
              style={{ transform: "rotate(-35deg)", whiteSpace: "nowrap" }}
            >
              VOIDED
            </span>
          </div>
        ) : null}

        {isVoided ? (
          <div className="mb-5 rounded-lg bg-rose-50 p-4 dark:bg-rose-950/40">
            <p className="text-center text-sm font-semibold text-rose-700 dark:text-rose-400">
              ORDER VOIDED
            </p>
            {order.voidedAt ? (
              <p className="mt-1 text-center text-xs text-rose-600 dark:text-rose-500">
                Voided on {fmtDateTime(order.voidedAt)}
                {order.voidedBy ? ` by ${order.voidedBy.name}` : ""}
              </p>
            ) : null}
            {order.voidReason ? (
              <p className="mt-0.5 text-center text-xs text-rose-600 dark:text-rose-500">
                Reason: {order.voidReason}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-col items-center text-center">
          <LogoMark size={48} />
          <p className="mt-3 text-base font-extrabold uppercase tracking-wide">
            {orgName}
          </p>
          {contact ? (
            <p className="mt-1 text-xs text-muted-foreground">{contact}</p>
          ) : null}
        </div>

        <hr className="mt-4 border-t border-dotted border-border" />
        <p className="py-2 text-center text-sm font-bold uppercase tracking-widest">
          Tax Invoice
        </p>
        <hr className="mb-4 border-t border-dotted border-border" />

        <div className="mb-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          <p className="text-muted-foreground">
            Invoice:{" "}
            <span className="font-semibold text-foreground">{invoiceId}</span>
          </p>
          <p className="text-right text-muted-foreground">
            Date:{" "}
            <span className="font-semibold text-foreground">
              {fmtInvoiceDate(order.createdAt)}
            </span>
          </p>
          <p className="text-muted-foreground">
            Customer:{" "}
            <span className="font-semibold text-foreground">
              {WALK_IN_CUSTOMER}
            </span>
          </p>
          <p className="text-right text-muted-foreground">
            Sold By:{" "}
            <span className="font-semibold text-foreground">
              {order.cashier?.name ?? "—"}
            </span>
          </p>
        </div>

        <table className="invoice-lines mb-3 w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="px-2.5 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-white bg-[#3F201B]">
                #
              </th>
              <th className="px-2.5 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-white bg-[#3F201B]">
                Item
              </th>
              <th className="px-2.5 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-white bg-[#3F201B]">
                Qty
              </th>
              <th className="px-2.5 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-white bg-[#3F201B]">
                Rate
              </th>
              <th className="px-2.5 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-white bg-[#3F201B]">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {(order.lines ?? []).map((line, index) => (
              <tr key={line.id} className="align-top border-b border-[#eae1d5]">
                <td className="px-2.5 py-2.5 tabular-nums text-muted-foreground">
                  {index + 1}
                </td>
                <td className="px-2.5 py-2.5">
                  <span className="font-semibold">{line.itemName}</span>
                  {line.sizeName ? (
                    <span className="text-muted-foreground">
                      {" "}
                      ({line.sizeName})
                    </span>
                  ) : null}
                  {line.toppings.length > 0 ? (
                    <ul className="mt-0.5 text-[11px] text-muted-foreground">
                      {line.toppings.map((t) => (
                        <li key={t.id}>+ {t.toppingName}</li>
                      ))}
                    </ul>
                  ) : null}
                </td>
                <td className="px-2.5 py-2.5 text-center tabular-nums">
                  <span className="font-semibold">{line.quantity}</span>
                </td>
                <td className="px-2.5 py-2.5 text-right tabular-nums">
                  {fmtKsh(line.unitPrice)}
                </td>
                <td className="px-2.5 py-2.5 text-right font-semibold tabular-nums">
                  {fmtKsh(line.lineTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {discount ? (
          <p className="mb-3 text-right text-xs text-rose-600 dark:text-rose-400">
            {discount}: −{fmtKsh(order.discountAmount)}
          </p>
        ) : null}

        <hr className="border-t border-dotted border-border" />
        <div className="flex items-center justify-between py-2 text-xs">
          <span>
            Items:{" "}
            <span className="font-semibold">{invoiceLineCount(order)}</span>
          </span>
          <span>
            Qty:{" "}
            <span className="font-semibold">{invoiceQtyTotal(order)}</span>
          </span>
          <span>
            Total:{" "}
            <span className="font-bold">{fmtKsh(order.totalAmount)}</span>
          </span>
        </div>
        <hr className="mb-4 border-t border-dotted border-border" />

        <p className="mb-5 text-xs">
          Payment Mode:{" "}
          <span className="font-semibold">
            {fmtKsh(order.totalAmount)} ({paymentLabel(order.paymentMethod)})
          </span>
        </p>

        <p className="text-center text-xs italic text-muted-foreground">
          Thank You For Shopping With Us. Please Come Again
        </p>
      </div>
    </>
  );
}
