"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, X } from "lucide-react";
import type { PurchaseReceiptThumb } from "@/types/purchases/purchase-entry";

interface Props {
  receipts: PurchaseReceiptThumb[];
  startIndex?: number;
  onClose: () => void;
}

/** Full-screen viewer for a purchase's receipts (arrow / swipe through many). */
export function ReceiptLightbox({ receipts, startIndex = 0, onClose }: Props) {
  const [index, setIndex] = useState(startIndex);
  const many = receipts.length > 1;

  const next = useCallback(
    () => setIndex((i) => (i + 1) % receipts.length),
    [receipts.length],
  );
  const prev = useCallback(
    () => setIndex((i) => (i - 1 + receipts.length) % receipts.length),
    [receipts.length],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && many) next();
      if (e.key === "ArrowLeft" && many) prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [many, next, prev, onClose]);

  const current = receipts[index];
  if (!current) return null;
  const isPdf = current.contentType === "application/pdf";

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/85 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        className="absolute right-4 top-4 rounded-md p-2 text-white/80 transition-colors hover:text-white"
        onClick={onClose}
        aria-label="Close"
      >
        <X className="size-6" />
      </button>

      {many ? (
        <button
          type="button"
          className="absolute left-3 rounded-full bg-white/10 p-2 text-white/90 transition-colors hover:bg-white/20"
          onClick={(e) => {
            e.stopPropagation();
            prev();
          }}
          aria-label="Previous"
        >
          <ChevronLeft className="size-6" />
        </button>
      ) : null}

      <div
        className="flex max-h-[90vh] max-w-[92vw] flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {isPdf || !current.url ? (
          <div className="flex flex-col items-center gap-4 rounded-lg bg-background p-10">
            <p className="text-sm text-muted-foreground">{current.originalName}</p>
            {current.url ? (
              <a
                href={current.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <ExternalLink className="size-4" />
                Open PDF
              </a>
            ) : (
              <p className="text-sm text-destructive">Preview unavailable.</p>
            )}
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={current.url}
            alt={current.originalName}
            className="max-h-[86vh] max-w-[92vw] rounded-lg object-contain"
          />
        )}
        {many ? (
          <p className="mt-3 text-center text-sm text-white/70">
            {index + 1} / {receipts.length}
          </p>
        ) : null}
      </div>

      {many ? (
        <button
          type="button"
          className="absolute right-3 rounded-full bg-white/10 p-2 text-white/90 transition-colors hover:bg-white/20"
          onClick={(e) => {
            e.stopPropagation();
            next();
          }}
          aria-label="Next"
        >
          <ChevronRight className="size-6" />
        </button>
      ) : null}
    </div>
  );
}
