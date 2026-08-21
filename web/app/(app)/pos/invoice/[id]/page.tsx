"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Download, Printer, Share2 } from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { usePosOrder } from "@/hooks/pos/use-pos-orders";
import { useAppStore } from "@/store/app";
import type { PosOrder } from "@/types/pos/order";

import { InvoiceCard } from "./components/invoice-card";

// ── PDF download (lazy — react-pdf must not run during SSR) ───────────────────

async function buildInvoicePdfBlob(
  order: PosOrder,
  organizationName?: string | null,
): Promise<Blob> {
  const [{ pdf }, { InvoicePdfDocument }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("./components/invoice-pdf"),
  ]);
  // `pdf()` expects ReactElement<DocumentProps>; our wrapper returns the same
  // shape at runtime — the cast bridges the structural mismatch in typings.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return pdf(
    React.createElement(InvoicePdfDocument, { order, organizationName }) as any,
  ).toBlob();
}

async function triggerPdfDownload(order: PosOrder, organizationName?: string | null) {
  const blob = await buildInvoicePdfBlob(order, organizationName);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `invoice-${order.orderNumber}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Print the 80mm receipt PDF so the dialog uses receipt paper, not Letter. */
async function triggerPdfPrint(order: PosOrder, organizationName?: string | null) {
  const blob = await buildInvoicePdfBlob(order, organizationName);
  const url = URL.createObjectURL(blob);
  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "Print receipt");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.src = url;
  document.body.appendChild(iframe);

  await new Promise<void>((resolve, reject) => {
    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        resolve();
      } catch (err) {
        reject(err);
      }
    };
    iframe.onerror = () => reject(new Error("Could not open the receipt for print."));
  });

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
    iframe.remove();
  }, 60_000);
}

// ── Share ──────────────────────────────────────────────────────────────────────

async function shareOrCopy(order: PosOrder, onCopied: () => void) {
  const url = window.location.href;
  const title = `Invoice #${order.orderNumber}`;
  const text = `View invoice #${order.orderNumber} for KSh ${Number(order.totalAmount).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return;
    } catch {
      // User cancelled or share failed — fall through to clipboard.
    }
  }

  // Clipboard fallback.
  try {
    await navigator.clipboard.writeText(url);
    onCopied();
  } catch {
    // Clipboard also unavailable — nothing to do.
  }
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function InvoicePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const addErrorToast = useAppStore((s) => s.addErrorToast);
  const addToast = useAppStore((s) => s.addToast);
  const organizationName = useAppStore((s) => s.user?.organizationName ?? null);

  const { data: order, isPending, isError, error } = usePosOrder(id);

  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [isPrintLoading, setIsPrintLoading] = useState(false);
  const [isShareLoading, setIsShareLoading] = useState(false);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handlePrint = async () => {
    if (!order) return;
    setIsPrintLoading(true);
    try {
      await triggerPdfPrint(order, organizationName);
    } catch (e) {
      addErrorToast({
        title: "Print failed",
        sub: e instanceof Error ? e.message : "Something went wrong",
      });
    } finally {
      setIsPrintLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!order) return;
    setIsPdfLoading(true);
    try {
      await triggerPdfDownload(order, organizationName);
    } catch (e) {
      addErrorToast({
        title: "PDF download failed",
        sub: e instanceof Error ? e.message : "Something went wrong",
      });
    } finally {
      setIsPdfLoading(false);
    }
  };

  const handleShare = async () => {
    if (!order) return;
    setIsShareLoading(true);
    try {
      await shareOrCopy(order, () => {
        addToast({ title: "Link copied to clipboard" });
      });
    } finally {
      setIsShareLoading(false);
    }
  };

  // ── Loading / error states ────────────────────────────────────────────────────

  if (isPending) {
    return (
      <>
        <PageHeader title="Invoice" />
        <div className="flex items-center justify-center py-24">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </>
    );
  }

  if (isError || !order) {
    return (
      <>
        <PageHeader title="Invoice" />
        <div className="alert-error mb-6">
          {error instanceof Error
            ? error.message
            : "Order not found or you don't have access to it."}
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/pos">
            <ArrowLeft className="size-4" />
            Back to POS
          </Link>
        </Button>
      </>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      <PageHeader
        title={`Invoice #${order.orderNumber}`}
        desc={`${order.store?.name ?? ""} · ${new Date(order.createdAt).toLocaleDateString("en-KE", { dateStyle: "medium" })}`}
      />

      {/* ── Back + actions row ─────────────────────────────────────────────── */}
      <div className="invoice-actions mb-6 flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" size="sm" asChild>
          <Link href="/pos">
            <ArrowLeft className="size-4" />
            Back
          </Link>
        </Button>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handlePrint()}
            disabled={isPrintLoading}
            title="Print receipt"
          >
            <Printer className="size-4" />
            {isPrintLoading ? "Preparing…" : "Print"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleDownloadPdf()}
            disabled={isPdfLoading}
            title="Download PDF"
          >
            <Download className="size-4" />
            {isPdfLoading ? "Generating…" : "PDF"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleShare()}
            disabled={isShareLoading}
            title="Share or copy link"
          >
            <Share2 className="size-4" />
            Share
          </Button>
        </div>
      </div>

      {/* ── Invoice card ───────────────────────────────────────────────────── */}
      <InvoiceCard order={order} organizationName={organizationName} />
    </>
  );
}
