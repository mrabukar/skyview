"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart } from "lucide-react";

import { ShiftBlock } from "./shift-block";
import { MenuGrid } from "./menu-grid";
import { OrderPanel } from "./order-panel";
import { SizePickerModal } from "./size-picker-modal";
// import { ToppingSelectorModal } from "./topping-selector-modal"; // TOPPINGS HIDDEN
import { DiscountModal } from "./discount-modal";
import { useBranchMenu } from "@/hooks/pos/use-branch-menu";
import { useShiftCheck } from "@/hooks/pos/use-shift-check";
import { useCreatePosOrder } from "@/hooks/pos/use-pos-orders";
import { usePosStore } from "@/store/pos-store";
import { useAppStore } from "@/store/app";
import type { BranchMenuItemConfig, BranchMenuItemSizeConfig } from "@/types/pos/branch-menu";
// import type { CartTopping } from "@/types/pos/order"; // TOPPINGS HIDDEN

interface SelectedItem {
  item: BranchMenuItemConfig;
  size?: BranchMenuItemSizeConfig;
}

/**
 * Core POS terminal UI — cashier catalog + current-order pane.
 * Lives inside the normal app shell (sidebar + navbar).
 * Manages the item-tap flow, cart state, discount, and order creation.
 *
 * Payment flow: "Pay" creates a pending order. The cashier confirms payment
 * later from Order History.
 */
export function PosTerminal() {
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const addToast = useAppStore((s) => s.addToast);
  const addErrorToast = useAppStore((s) => s.addErrorToast);

  const branchId = user?.storeId ?? "";
  const { data: branchMenu, isPending: menuLoading } = useBranchMenu(branchId);

  const shiftStatus = useShiftCheck();

  // Zustand cart
  const lines = usePosStore((s) => s.lines);
  const discountType = usePosStore((s) => s.discountType);
  const discountValue = usePosStore((s) => s.discountValue);
  const addLine = usePosStore((s) => s.addLine);
  const setDiscount = usePosStore((s) => s.setDiscount);
  const clearCart = usePosStore((s) => s.clearCart);

  // Modal state machine
  const [selected, setSelected] = useState<SelectedItem | null>(null);
  // const [showToppings, setShowToppings] = useState(false); // TOPPINGS HIDDEN
  const [showDiscount, setShowDiscount] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  // Mobile: show order panel tab
  const [mobileView, setMobileView] = useState<"menu" | "order">("menu");

  const createOrder = useCreatePosOrder();

  // ── Item-tap flow ────────────────────────────────────────────────────────────

  const handleItemSelect = useCallback((item: BranchMenuItemConfig) => {
    setSelected({ item });
  }, []);

  // TOPPINGS HIDDEN — size select now adds the item directly (no topping step).
  const handleSizeSelect = useCallback(
    (size: BranchMenuItemSizeConfig) => {
      if (!selected) return;
      addLine({
        menuItemSizeId: size.sizeId,
        itemName: selected.item.itemName,
        sizeName: size.sizeName,
        unitPrice: Number(size.effectivePrice),
        quantity: 1,
        toppings: [], // no toppings
        imageKey: selected.item.imageKey,
      });
      setSelected(null);
      setMobileView("order");
    },
    [selected, addLine],
  );

  /*
  // TOPPINGS HIDDEN — original topping confirm handler
  const handleToppingsConfirm = useCallback(
    (toppings: CartTopping[]) => {
      if (!selected?.item || !selected.size) return;
      const { item, size } = selected;
      addLine({
        menuItemSizeId: size.sizeId,
        itemName: item.itemName,
        sizeName: size.sizeName,
        unitPrice: Number(size.effectivePrice),
        quantity: 1,
        toppings,
      });
      setSelected(null);
      setShowToppings(false);
      setMobileView("order");
    },
    [selected, addLine],
  );
  */

  const closeSizePicker = useCallback(() => setSelected(null), []);
  /*
  // TOPPINGS HIDDEN
  const closeToppingSelector = useCallback(() => {
    setSelected(null);
    setShowToppings(false);
  }, []);
  */

  // ── Discount ─────────────────────────────────────────────────────────────────

  const handleApplyDiscount = useCallback(
    (type: "percentage" | "fixed", value: number) => {
      setDiscount(type, value);
      setShowDiscount(false);
    },
    [setDiscount],
  );

  const handleRemoveDiscount = useCallback(() => {
    setDiscount(null, null);
    setShowDiscount(false);
  }, [setDiscount]);

  // ── Pay → create pending order ──────────────────────────────────────────────

  const handlePay = useCallback(async () => {
    if (lines.length === 0) return;
    setIsPlacingOrder(true);
    try {
      const order = await createOrder.mutateAsync({
        lines: lines.map((l) => ({
          menuItemSizeId: l.menuItemSizeId,
          quantity: l.quantity,
          // TOPPINGS HIDDEN — always send empty
          // toppingIds: l.toppings.length > 0 ? l.toppings.map((t) => t.id) : undefined,
        })),
        discountType: discountType ?? undefined,
        discountValue: discountValue ?? undefined,
      });

      clearCart();
      addToast({ title: `Order #${order.orderNumber} created` });
      router.push("/pos/history");
    } catch (e) {
      addErrorToast({
        title: "Failed to create order",
        sub: e instanceof Error ? e.message : "Something went wrong",
      });
    } finally {
      setIsPlacingOrder(false);
    }
  }, [
    lines,
    discountType,
    discountValue,
    createOrder,
    clearCart,
    addToast,
    addErrorToast,
    router,
  ]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "F5") return;
      if (lines.length === 0 || isPlacingOrder) return;
      if (selected || showDiscount) return;
      e.preventDefault();
      void handlePay();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lines.length, isPlacingOrder, selected, showDiscount, handlePay]);

  // ── Render ───────────────────────────────────────────────────────────────────

  // Shift guard — shown for cashiers only when not on shift.
  if (shiftStatus.isCashier && !shiftStatus.onShift) {
    return (
      <ShiftBlock
        message={shiftStatus.message}
        shiftDays={user?.shiftDays}
        shiftStartTime={user?.shiftStartTime}
        shiftEndTime={user?.shiftEndTime}
      />
    );
  }

  const items = branchMenu?.data ?? [];
  // const toppings = branchMenu?.toppings ?? []; // TOPPINGS HIDDEN

  return (
    <>
      <div className="flex h-full min-h-0 w-full flex-1 overflow-hidden">
        {menuLoading ? (
          <div className="flex h-full w-full items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="flex h-full min-h-0 w-full gap-4 overflow-hidden">
            <div
              className={`min-h-0 min-w-0 flex-1 overflow-hidden rounded-xl border border-border bg-card ${mobileView === "order" ? "hidden lg:flex lg:flex-col" : "flex flex-col"}`}
            >
              <MenuGrid items={items} onItemSelect={handleItemSelect} />
            </div>

            <div
              className={`min-h-0 flex-shrink-0 overflow-hidden rounded-xl border border-border bg-card ${mobileView === "menu" ? "hidden lg:flex lg:w-[380px] lg:flex-col" : "flex w-full flex-col lg:w-[380px]"}`}
            >
              <OrderPanel
                onDiscount={() => setShowDiscount(true)}
                onPay={() => void handlePay()}
                isPlacingOrder={isPlacingOrder}
              />
            </div>
          </div>
        )}
      </div>

      {/* Mobile FAB — toggle between menu and order views */}
      <div className="lg:hidden fixed bottom-6 right-6 z-40">
        {mobileView === "menu" ? (
          <button
            type="button"
            onClick={() => setMobileView("order")}
            className="flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-lg"
          >
            <ShoppingCart size={18} />
            Order ({lines.length})
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setMobileView("menu")}
            className="flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-lg"
          >
            Back to Menu
          </button>
        )}
      </div>

      {/* ── Item-tap modals ───────────────────────────────────────────────── */}
      {selected?.item ? (
        <SizePickerModal
          open
          item={selected.item}
          onSelect={handleSizeSelect}
          onClose={closeSizePicker}
        />
      ) : null}

      {/* TOPPINGS HIDDEN
      {selected?.item && selected.size && showToppings ? (
        <ToppingSelectorModal
          open
          toppings={toppings}
          onConfirm={handleToppingsConfirm}
          onClose={closeToppingSelector}
        />
      ) : null}
      */}

      {/* ── Discount modal ────────────────────────────────────────────────── */}
      <DiscountModal
        open={showDiscount}
        currentType={discountType}
        currentValue={discountValue}
        maxDiscountPercent={user?.maxDiscountPercent ?? null}
        onApply={handleApplyDiscount}
        onRemove={handleRemoveDiscount}
        onClose={() => setShowDiscount(false)}
      />
    </>
  );
}
