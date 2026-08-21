# 06 — Implementation Checklist (Phase 2 — POS Module)

Build order is bottom-up by dependency. Each group must be complete before the
next one starts (schema → backend → frontend). Within a group, tasks can be
parallelized where noted.

---

## Prerequisites

- [ ] Phase 1 verified (all builds + smokes green)
- [ ] Client provides: menu items, categories, toppings, prices per branch,
      and at least one cashier user for testing

---

## Group 1 — Schema & Migration

**Effort: Small** | **Dependency: none**

- [ ] Add `cashier` to `UserRole` enum
- [ ] Add new enums: `OrderStatus`, `PaymentMethod`, `DiscountType`
- [ ] Add cashier fields to User: `shiftDays`, `shiftStartTime`, `shiftEndTime`,
      `maxDiscountPercent`
- [ ] Add POS fields to Branch: `posEnabled`, `nextPosOrderNumber`
- [ ] Create new Prisma models (new files in `api/prisma/models/`):
  - `menu-category.prisma`
  - `menu-item.prisma` (MenuItem + MenuItemSize)
  - `topping.prisma`
  - `branch-menu-item.prisma` (BranchMenuItem + BranchMenuItemPrice)
  - `branch-topping.prisma`
  - `pos-order.prisma` (PosOrder + OrderLine + OrderLineTopping)
- [ ] Add back-relations on Organization, Branch, User
- [ ] Add new models to `TENANT_MODELS` in
      `api/src/prisma/tenant-scoping.extension.ts`
- [ ] Run `pnpm prisma:generate` + create migration `add_pos_module`
- [ ] Verify migration applies cleanly on a fresh DB

---

## Group 2 — Backend: Menu Catalog (parallelizable)

**Effort: Medium** | **Dependency: Group 1**

These three modules can be built in parallel:

### 2a — Menu Categories module
- [ ] DTOs: `CreateMenuCategoryDto`, `UpdateMenuCategoryDto`, query DTO
- [ ] Service: CRUD with org-scoping, unique name validation, deletion guard
      (has items → 409)
- [ ] Controller: `GET`, `POST`, `PATCH`, `DELETE` at `/api/menu-categories`
- [ ] Roles: admin writes, all read
- [ ] Audit log entries: `MENU_CATEGORY_CREATED`, `_UPDATED`, `_DELETED`

### 2b — Menu Items module (+ sizes)
- [ ] DTOs: `CreateMenuItemDto` (with nested sizes), `UpdateMenuItemDto`,
      `CreateMenuItemSizeDto`, `UpdateMenuItemSizeDto`, query DTO
- [ ] Service: CRUD with org-scoping, unique name validation, nested size
      creation, deletion guards (has order lines → 409)
- [ ] Controller: items at `/api/menu-items`, sizes at
      `/api/menu-items/:id/sizes` and `/api/menu-item-sizes/:id`
- [ ] Roles: admin writes, all read
- [ ] Audit log entries

### 2c — Toppings module
- [ ] DTOs: `CreateToppingDto`, `UpdateToppingDto`, query DTO
- [ ] Service: CRUD with org-scoping, unique name validation, deletion guard
- [ ] Controller: `/api/toppings`
- [ ] Roles: admin writes, all read
- [ ] Audit log entries

---

## Group 3 — Backend: Branch Menu Config

**Effort: Medium** | **Dependency: Group 2**

- [ ] DTOs: `UpdateBranchMenuItemDto` (isEnabled, isInStock, prices),
      `BulkEnableBranchMenuItemsDto`, `UpdateBranchToppingDto`
- [ ] Service: read branch menu (join items + branch config + prices + toppings),
      update item config (enable/stock/prices), bulk enable, toggle topping stock
- [ ] Controller: endpoints under `/api/branches/:branchId/menu*` and
      `/api/branches/:branchId/toppings/:toppingId`
- [ ] Roles: admin (enable/disable, pricing), cashier/manager (stock toggle
      only, own branch)
- [ ] Branch access scoping (reuse `branch-scope.util.ts` — cashiers use the
      same single-branch pattern as single-branch managers)
- [ ] Audit log entries

---

## Group 4 — Backend: Auth & Shift Enforcement

**Effort: Small–Medium** | **Dependency: Group 1**

Can be built in parallel with Groups 2–3.

- [ ] Add `cashier` handling to `branch-scope.util.ts` — cashier behaves like a
      single-branch manager for scoping purposes
- [ ] Shift check utility: `isOnShift(user): { onShift: boolean, message: string }`
      — checks current day/time in Africa/Nairobi against `shiftDays`,
      `shiftStartTime`, `shiftEndTime`
- [ ] Better-Auth sign-in hook: reject cashier sign-in when off shift
- [ ] `ShiftGuard` decorator/guard for POS write endpoints (403 when off shift)
- [ ] Users module: accept cashier-specific fields on create/update, validate
      (`shiftDays` non-empty, `shiftStartTime < shiftEndTime`, `branchId`
      required, etc.)
- [ ] `me.service`: include shift info in the session/me response for frontend
- [ ] Page access: add `pos` and `menu` to `MANAGER_PAGES`; hardcode cashier
      access in the page guard (cashier always has pos + menu)
- [ ] Cashier nav restriction: frontend-side (see Group 7), but the backend
      blocks unauthorized routes via role guard

---

## Group 5 — Backend: POS Orders

**Effort: Hard** | **Dependency: Groups 2, 3, 4**

This is the core module — the most complex backend work.

- [ ] DTOs: `CreatePosOrderDto` (with nested lines + toppings), query DTO,
      `PayOrderDto`, `VoidOrderDto`
- [ ] Service — `createOrder`:
  - [ ] Shift validation
  - [ ] Line item validation (size exists, active, enabled, in-stock at branch)
  - [ ] Topping validation (active, in-stock at branch)
  - [ ] Discount validation (cashier's `maxDiscountPercent`)
  - [ ] Price snapshot (effective branch price for each size, topping prices)
  - [ ] Compute line totals, subtotal, discount amount, total
  - [ ] Atomic order number increment (`Branch.nextPosOrderNumber`)
  - [ ] Transaction: create PosOrder + OrderLines + OrderLineToppings
- [ ] Service — `payOrder`: status transition `pending → paid`, payment method
- [ ] Service — `cancelOrder`: status transition `pending → cancelled`
- [ ] Service — `voidOrder`: status transition `paid → voided`, reason required,
      set voidedById/voidReason/voidedAt
- [ ] Service — `listOrders`: paginated, filtered by branch/status/cashier/date,
      role-scoped
- [ ] Service — `getOrder`: detail with lines + toppings
- [ ] Controller: `POST /api/pos/orders`, `GET`, `GET /:id`,
      `PATCH /:id/pay`, `PATCH /:id/cancel`, `PATCH /:id/void`
- [ ] Roles: cashier creates/pays/cancels own; admin/manager voids
- [ ] Audit log entries: `POS_ORDER_CREATED`, `_PAID`, `_CANCELLED`, `_VOIDED`
- [ ] `@Page("pos")` decorator on order endpoints

---

## Group 6 — Backend: Reports & Daily Sales Integration

**Effort: Medium** | **Dependency: Group 5**

- [ ] POS summary report service + controller
      (`GET /api/reports/pos-summary`)
- [ ] Item-level sales report service + controller
      (`GET /api/reports/pos-items`)
- [ ] Cashier performance report service + controller
      (`GET /api/reports/pos-cashier-performance`)
- [ ] Modify admin dashboard report: include POS revenue for POS-enabled
      branches (aggregate `PosOrder.totalAmount` where `status = paid`)
- [ ] Modify manager dashboard report: same, scoped to assigned branches
- [ ] Modify daily sales creation: reject when `branch.posEnabled = true`
- [ ] Modify branch update: accept `posEnabled` field (admin only)

---

## Group 7 — Frontend: Foundation (parallelizable with Groups 5–6)

**Effort: Medium** | **Dependency: Group 4 (auth/shift API complete)**

Can start once the menu + auth APIs are deployed.

- [ ] Types: `web/types/pos/` — all type definitions
- [ ] Service layer: `web/service/pos/` — API client functions
- [ ] React Query hooks: `web/hooks/pos/` — all hooks
- [ ] Zustand store: `web/store/pos-store.ts` — local POS order state
- [ ] `useShiftCheck` hook: checks shift, returns status for UI gating
- [ ] Nav sidebar: add POS, Menu Items, Menu Categories, Toppings items;
      cashier-specific nav (hide all non-POS items)
- [ ] Bridge: extend `web/service/client.ts` with `branchId`/`storeId` mapping
      for any new endpoints that carry branch fields

---

## Group 8 — Frontend: Menu Management Pages

**Effort: Medium** | **Dependency: Group 7**

- [ ] Menu Categories page (`/menu-categories`)
  - [ ] Admin: CRUD table + modals
  - [ ] Manager/cashier: read-only list
- [ ] Menu Items page (`/menu-items`)
  - [ ] Admin: CRUD table + modals (with nested size management)
  - [ ] Admin: branch configuration section (enable/disable, pricing)
  - [ ] Manager/cashier: read-only + stock toggle for own branch
- [ ] Toppings page (`/toppings`)
  - [ ] Admin: CRUD table + modals
  - [ ] Manager/cashier: stock toggle for own branch
- [ ] Branch menu configuration view (branch-centric — admin only)

---

## Group 9 — Frontend: POS Screen

**Effort: Hard** | **Dependency: Groups 7, 8, and Group 5 (orders API)**

The core POS user experience.

- [ ] POS page layout (`/pos`) — two-panel responsive (tablet/desktop/phone)
- [ ] Menu grid panel:
  - [ ] Category tabs
  - [ ] Item cards with price
  - [ ] Item tap → size picker → topping selector → add to order
  - [ ] Search filter
- [ ] Order panel:
  - [ ] Line items display (name, size, toppings, qty, total)
  - [ ] Quantity adjustment (+/−)
  - [ ] Remove line item
  - [ ] Subtotal / discount / total display
  - [ ] Discount modal (% or fixed, validated against max)
  - [ ] Cancel button
  - [ ] Pay button → payment method selection → confirm
- [ ] Shift guard: full-screen block when off shift
- [ ] Post-payment invoice view
- [ ] Mobile layout: bottom drawer for current order

---

## Group 10 — Frontend: Invoice

**Effort: Small–Medium** | **Dependency: Group 9**

- [ ] Invoice display component (`web/components/pos/invoice.tsx`)
- [ ] Invoice PDF component (`web/components/pos/invoice-pdf.tsx`) using
      `@react-pdf/renderer`
- [ ] Print action (`window.print()` with print-specific CSS)
- [ ] Download PDF action
- [ ] Share action (Web Share API on mobile, fallback to download)
- [ ] Voided order watermark

---

## Group 11 — Frontend: Reports & Dashboard Integration

**Effort: Medium** | **Dependency: Group 6 (reports API), Group 7**

- [ ] POS summary report page/section — revenue chart, order count, avg value,
      payment method breakdown, daily trend
- [ ] Item-level sales report — table sortable by revenue/quantity, category
      filter
- [ ] Cashier performance report — table with key metrics
- [ ] Admin dashboard: add POS revenue card; unified revenue total
      (POS + manual)
- [ ] Manager dashboard: same, scoped to their branches

---

## Group 12 — Frontend: User Management Updates

**Effort: Small** | **Dependency: Group 4**

- [ ] User create/edit modal: show cashier-specific fields when role = cashier
  - [ ] Working days multi-select (checkboxes Mon–Sun)
  - [ ] Shift start/end time pickers
  - [ ] Max discount percent input
  - [ ] Single branch select (not multi-branch)
- [ ] Hide `disabledPages` for cashier role
- [ ] Users table: role badge (cashier vs manager), shift info column
- [ ] Daily sales form: disable submit when selected branch is POS-enabled

---

## Group 13 — Smoke Tests

**Effort: Medium** | **Dependency: all backend groups**

Extend the existing smoke test suite in `api/scripts/smoke/`.

- [ ] Menu categories suite: CRUD, unique name, deletion guard
- [ ] Menu items suite: CRUD with sizes, unique name, deletion guard
- [ ] Toppings suite: CRUD, unique name, deletion guard
- [ ] Branch menu config suite: enable/disable, price override, stock toggle,
      effective price calculation
- [ ] POS orders suite:
  - [ ] Create order with lines + toppings, verify computed totals
  - [ ] Pay order, verify status transition
  - [ ] Cancel pending order
  - [ ] Void paid order (admin/manager), verify reason required
  - [ ] Reject create when cashier off shift
  - [ ] Reject discount exceeding max
  - [ ] Reject create when item not available at branch
- [ ] Auth/shift suite: reject cashier sign-in when off shift
- [ ] Daily sales suite: reject manual entry when branch is POS-enabled
- [ ] Reports suite: verify POS revenue in dashboard, item-level, cashier perf

---

## Group 14 — Verification & Polish

- [ ] `pnpm build` green (api + web)
- [ ] `pnpm lint` green (api + web)
- [ ] `pnpm smoke` all suites green
- [ ] Manual testing:
  - [ ] Create cashier with shift, verify login restriction
  - [ ] Full POS flow: build order, add toppings, discount, pay, view invoice
  - [ ] Void flow: admin voids, verify audit log
  - [ ] Menu management: create items, sizes, toppings, branch config, stock
        toggle
  - [ ] Reports: POS revenue shows alongside manual sales
  - [ ] Tablet responsiveness test
- [ ] Client demo

---

## Migration & Deployment Notes

1. **Install new deps**: none anticipated (all current deps sufficient).
2. **Migration**: `pnpm prisma:generate` then
   `pnpm prisma:migrate --name add_pos_module`. No backfill needed (all new
   data).
3. **Seed**: after migration, optionally run a POS seed script to populate
   sample menu items, categories, and toppings for testing.
4. **Env**: no new environment variables required.
5. **Deploy order**: API first (migration + build), then web (build + restart).
   The POS module is opt-in per branch (`posEnabled`), so deployment doesn't
   disrupt existing functionality.

---

## Effort Summary

| Group | Effort | Estimated |
|---|---|---|
| 1 Schema | Small | 0.5 day |
| 2 Menu catalog (3 modules) | Medium | 2 days |
| 3 Branch config | Medium | 1.5 days |
| 4 Auth/shift | Small–Medium | 1 day |
| 5 POS orders | Hard | 3 days |
| 6 Reports integration | Medium | 2 days |
| 7 Frontend foundation | Medium | 1.5 days |
| 8 Menu pages | Medium | 2 days |
| 9 POS screen | Hard | 3 days |
| 10 Invoice | Small–Medium | 1 day |
| 11 Reports frontend | Medium | 2 days |
| 12 User mgmt updates | Small | 0.5 day |
| 13 Smoke tests | Medium | 2 days |
| 14 Verification | — | 1 day |
| **Total** | | **~23 days** |
