"use client";

import { useState } from "react";
import { Dialog } from "radix-ui";
import { Banknote, CreditCard, Nfc, Smartphone, Wallet, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PaymentMethod } from "@/types/pos/order";

const contentCls = cn(
  "fixed left-1/2 top-1/2 z-[60] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 border border-border bg-background p-6 shadow-lg duration-200",
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
  "sm:rounded-lg grid gap-4",
);

interface MethodOption {
  value: PaymentMethod | null;
  label: string;
  icon: React.ElementType;
  description: string;
}

const METHODS: MethodOption[] = [
  {
    value: "cash",
    label: "Cash",
    icon: Banknote,
    description: "Physical cash payment",
  },
  {
    value: "mpesa",
    label: "M-Pesa",
    icon: Smartphone,
    description: "Mobile money transfer",
  },
  {
    value: "card",
    label: "Card",
    icon: CreditCard,
    description: "Debit or credit card",
  },
  {
    value: "pesapal",
    label: "Pesapal",
    icon: Wallet,
    description: "Pesapal online payment",
  },
  {
    value: "pdq",
    label: "PDQ",
    icon: Nfc,
    description: "Card machine (PDQ)",
  },
  {
    value: null,
    label: "Not recorded",
    icon: X,
    description: "Payment method not captured",
  },
];

interface Props {
  open: boolean;
  total: number;
  isLoading?: boolean;
  onConfirm: (method: PaymentMethod | null) => void;
  onClose: () => void;
}

export function PaymentModal({
  open,
  total,
  isLoading = false,
  onConfirm,
  onClose,
}: Props) {
  const [selected, setSelected] = useState<PaymentMethod | null>("cash");

  const fmtTotal = total.toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/80" />
        <Dialog.Content className={contentCls}>
          <div className="flex flex-col gap-1">
            <Dialog.Title className="text-lg font-semibold leading-none tracking-tight">
              Confirm Payment
            </Dialog.Title>
            <Dialog.Description className="text-sm text-muted-foreground">
              Total due:{" "}
              <strong className="text-foreground">KSh {fmtTotal}</strong>
            </Dialog.Description>
          </div>

          <div className="grid gap-2">
            {METHODS.map((m) => {
              const Icon = m.icon;
              const isOn = selected === m.value;
              return (
                <button
                  key={String(m.value)}
                  type="button"
                  onClick={() => setSelected(m.value)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors",
                    isOn
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-muted",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full",
                      isOn
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Icon size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{m.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {m.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => onConfirm(selected)}
              disabled={isLoading}
            >
              {isLoading ? "Processing…" : "Confirm & Pay"}
            </Button>
          </div>

          <Dialog.Close
            type="button"
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100"
            onClick={onClose}
          >
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
