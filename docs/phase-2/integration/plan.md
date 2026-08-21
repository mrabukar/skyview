# Frontend Integration Plan — Phase 2 (POS Module)

> **Who this is for:** Any developer picking up the frontend side of Phase 2.
> Read this before touching any code. Then read `api-reference.md` (same directory)
> for the full endpoint contract.

---

## Table of Contents

1. [Global Conventions](#1-global-conventions)
2. [Dependency Map](#2-dependency-map)
3. [Phase 1 — Foundation (Group 7)](#3-phase-1--foundation-group-7)
4. [Phase 2 — Menu Management Pages (Group 8)](#4-phase-2--menu-management-pages-group-8)
5. [Phase 3 — POS Screen (Group 9)](#5-phase-3--pos-screen-group-9)
6. [Phase 4 — Invoice (Group 10)](#6-phase-4--invoice-group-10)
7. [Phase 5 — Reports Frontend (Group 11)](#7-phase-5--reports-frontend-group-11)
8. [Phase 6 — User Management Updates (Group 12)](#8-phase-6--user-management-updates-group-12)
9. [Phase 7 — Smoke Tests & Verification (Groups 13-14)](#9-phase-7--smoke-tests--verification-groups-13-14)
10. [Quick-Start Checklist for New Developers](#10-quick-start-checklist-for-new-developers)

---

## 1. Global Conventions

### 1.1 API Base URL

```
http://localhost:4000/api          # development
https://<your-domain>/api          # production (NEXT_PUBLIC_API_URL)
```

All endpoints are prefixed with `/api`. The helper at
`web/lib/api-base-url.ts` resolves the correct base for the current
environment — always use it, never hard-code `localhost`.

### 1.2 Authentication

Sessions use **Better-Auth** — HttpOnly cookie, set automatically on sign-in.
Every API call must include `credentials: "include"`. The existing `apiFetch`
wrapper in `web/service/client.ts` already does this.

Session user is at `GET /api/auth/session/me`. Check it before gating UI.

```ts
// Accessing the current user role (example pattern)
const { data: me } = useSession();
const role = me?.user?.role; // "admin" | "branch_manager" | "cashier"
```

### 1.3 branch vs store naming

The backend uses `branch`/`branchId`. The existing translation layer in
`web/service/client.ts` maps `branchId ↔ storeId` in responses. **When writing
new POS service functions, use the backend's `branchId` in URL paths
and request bodies.** The bridge handles renaming in responses for any
pre-existing endpoints that return `storeId`. New POS endpoints (those that
don't go through the bridge) will return `branchId` directly.

### 1.4 Date/time format

| Context | Format | Example |
|---|---|---|
| Query param dates | `YYYY-MM-DD` (Africa/Nairobi) | `?fromDate=2026-08-01` |
| Response timestamps | ISO 8601 UTC | `"2026-08-20T09:30:00.000Z"` |
| Shift times | `HH:mm` (24-hour, Nairobi) | `"07:00"`, `"20:00"` |
| Shift days | lowercase English weekday | `["monday", "wednesday", "friday"]` |

All business date filtering (reports, daily sales) uses **Africa/Nairobi** timezone.
Do not convert to UTC before sending — send the calendar date string as-is.

### 1.5 Decimal amounts

All monetary fields come from Prisma `Decimal` and are serialised as **string**
in JSON (e.g. `"450.00"`, `"12.50"`). Parse with `Number()` or `parseFloat()`
before arithmetic. Round to 2 dp using `Math.round(v * 100) / 100`.
Never use `parseInt()` on price fields.

### 1.6 Paginated responses

Endpoints that list resources return:

```json
{
  "data": [ /* array of items */ ],
  "meta": {
    "total": 42,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

Query params: `page` (default 1), `limit` (default 20, max 100).

### 1.7 Error format

```json
{
  "statusCode": 400,
  "message": "discountType and discountValue must be provided together",
  "error": "Bad Request"
}
```

`message` can be a `string` or `string[]` (class-validator sends arrays for
multiple validation failures). The existing `throwIfNotOk()` helper in
`client.ts` handles both shapes and throws `ApiError`.

### 1.8 Role matrix quick reference

| Action | super_admin | admin | branch_manager | cashier |
|---|:---:|:---:|:---:|:---:|
| Create/edit/delete categories | ✅ | ✅ | Own only | ❌ |
| Create/edit/delete items | ✅ | ✅ | Own only | ❌ |
| Create/edit/delete toppings | ✅ | ✅ | ❌ | ❌ |
| Enable item at branch / set price | ✅ | ✅ | Own branch | ❌ |
| Toggle item stock | ✅ | ✅ | Own branch | Own branch |
| Toggle topping stock | ✅ | ✅ | Own branch | Own branch |
| Bulk-enable items at branch | ✅ | ✅ | ❌ | ❌ |
| Create POS order | ❌ | ❌ | ❌ | ✅ (on shift) |
| Pay / cancel order | ❌ | ❌ | ❌ | ✅ (own order) |
| Void paid order | ✅ | ✅ | ✅ | ❌ |
| View all orders (org-wide) | ✅ | ✅ | Own branches | Own branch + today |
| POS reports | ✅ | ✅ | Own branches | ❌ |
| Enable POS for a branch | ✅ | ✅ | ❌ | ❌ |

---

## 2. Dependency Map

```
Backend Groups (all done ✅)
  Group 1 — Schema
  Group 2 — Menu Catalog API
  Group 3 — Branch Menu API
  Group 4 — Auth & Shift
  Group 5 — POS Orders API
  Group 6 — Reports & DailySales integration

Frontend Groups (to build)
  Phase 1 (Group 7): Foundation ─────────────────────────────┐
    Types / Service layer / Hooks / Store / Nav / ShiftCheck  │
                                                              │
  Phase 2 (Group 8): Menu Pages ─── depends on Phase 1       │
  Phase 3 (Group 9): POS Screen ─── depends on Phases 1, 2   │
  Phase 4 (Group 10): Invoice ────── depends on Phase 3       │
  Phase 5 (Group 11): Reports UI ─── depends on Phases 1      │
  Phase 6 (Group 12): User Mgmt ──── depends on Phase 1       │
  Phase 7 (Groups 13-14): Tests ──── depends on all above ────┘
```

Phases 2, 5, and 6 can be built in parallel once Phase 1 is complete.
Phase 3 requires Phase 2 (menu must be seeded to test the POS screen).
Phase 4 requires Phase 3.

---

## 3. Phase 1 — Foundation (Group 7)

**Effort:** ~1.5 days | **Unblocks:** everything else

### 3.1 Goal

Lay down all shared infrastructure so other developers can build UI pages
without touching the API layer or type definitions.

### 3.2 Endpoints consumed

All endpoints in `api-reference.md`. Phase 1 does not render any pages;
it only provides the data access layer.

### 3.3 Type definitions — `web/types/pos/`

Create these files. They must match the exact shapes returned by the API
(see `api-reference.md` for confirmed field names):

#### `web/types/pos/menu.ts`
```ts
export interface MenuCategory {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  createdById: string;
  createdBy: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
  _count: { items: number };
}

export interface MenuItemSize {
  id: string;
  name: string;
  basePrice: string;   // Decimal string — parse with Number()
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  imageKey: string | null;
  sortOrder: number;
  isActive: boolean;
  categoryId: string;
  category: { id: string; name: string };
  createdById: string;
  createdBy: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
  sizes: MenuItemSize[];
  _count: { orderLines: number };
}

export interface Topping {
  id: string;
  name: string;
  price: string;  // Decimal string
  sortOrder: number;
  isActive: boolean;
  createdById: string;
  createdBy: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
  _count: { orderLineToppings: number };
}
```

#### `web/types/pos/branch-menu.ts`
```ts
export interface BranchMenuItemSizeConfig {
  sizeId: string;
  sizeName: string;
  basePrice: string;
  branchPrice: string | null;
  effectivePrice: string; // branchPrice ?? basePrice
  isActive: boolean;
}

export interface BranchMenuItemConfig {
  menuItemId: string;
  itemName: string;
  categoryId: string;
  categoryName: string;
  description: string | null;
  imageKey: string | null;
  sortOrder: number;
  isEnabled: boolean;
  isInStock: boolean;
  sizes: BranchMenuItemSizeConfig[];
}

export interface BranchToppingConfig {
  toppingId: string;
  name: string;
  price: string;
  sortOrder: number;
  isInStock: boolean;
}

export interface BranchMenuResponse {
  data: BranchMenuItemConfig[];
  toppings: BranchToppingConfig[];
}
```

#### `web/types/pos/order.ts`
```ts
export type OrderStatus = "pending" | "paid" | "cancelled" | "voided";
export type PaymentMethod = "cash" | "mpesa" | "card";
export type DiscountType = "percentage" | "fixed";

export interface OrderLineTopping {
  id: string;
  toppingId: string;
  toppingName: string;
  price: string;
}

export interface OrderLine {
  id: string;
  menuItemId: string;
  menuItemSizeId: string;
  itemName: string;
  sizeName: string;
  unitPrice: string;
  quantity: number;
  toppingsTotal: string;
  lineTotal: string;
  toppings: OrderLineTopping[];
}

export interface PosOrder {
  id: string;
  orderNumber: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod | null;
  subtotal: string;
  discountType: DiscountType | null;
  discountValue: string | null;
  discountAmount: string | null;
  totalAmount: string;
  branchId: string;
  branch: { id: string; name: string };
  cashierId: string;
  cashier: { id: string; name: string };
  voidedById: string | null;
  voidedBy: { id: string; name: string } | null;
  voidReason: string | null;
  voidedAt: string | null;
  createdAt: string;
  updatedAt: string;
  lines: OrderLine[];
}

// Request payloads
export interface CreateOrderLinePayload {
  menuItemSizeId: string;
  quantity: number;
  toppingIds?: string[];
}

export interface CreateOrderPayload {
  lines: CreateOrderLinePayload[];
  discountType?: DiscountType;
  discountValue?: number;
}

export interface PayOrderPayload {
  paymentMethod?: PaymentMethod;
}

export interface VoidOrderPayload {
  reason: string;
}
```

#### `web/types/pos/reports.ts`
```ts
export interface PosSummaryBranchBreakdown {
  branchId: string;
  branchName: string;
  revenue: number;
  orderCount: number;
  avgOrderValue: number;
}

export interface PosSummaryPaymentBreakdown {
  method: string;
  revenue: number;
  orderCount: number;
}

export interface PosSummaryDayTrend {
  date: string;
  revenue: number;
  orderCount: number;
}

export interface PosSummary {
  period: { from: string; to: string; timezone: string };
  summary: {
    totalRevenue: number;
    orderCount: number;
    avgOrderValue: number;
    totalDiscount: number;
  };
  byBranch: PosSummaryBranchBreakdown[];
  byPaymentMethod: PosSummaryPaymentBreakdown[];
  dailyTrend: PosSummaryDayTrend[];
}

export interface PosItemSale {
  menuItemId: string;
  itemName: string;
  quantitySold: number;
  revenue: number;
  percentOfTotal: number;
}

export interface PosItemSalesReport {
  period: { from: string; to: string; timezone: string };
  totalRevenue: number;
  itemCount: number;
  items: PosItemSale[];
}

export interface CashierPerformance {
  cashierId: string;
  cashierName: string;
  orderCount: number;
  revenue: number;
  avgOrderValue: number;
  totalDiscountGiven: number;
  voidedCount: number;
}

export interface CashierPerformanceReport {
  period: { from: string; to: string; timezone: string };
  cashierCount: number;
  cashiers: CashierPerformance[];
}
```

#### `web/types/pos/index.ts`
```ts
export * from "./menu";
export * from "./branch-menu";
export * from "./order";
export * from "./reports";
```

### 3.4 Service layer — `web/service/pos/`

Each file exports plain async functions that call `apiFetch` (or the
equivalent wrapper). Follow the existing patterns in `web/service/`.

Key functions to implement:

| File | Functions |
|---|---|
| `menu-categories.ts` | `listCategories(params?)`, `getCategory(id)`, `createCategory(dto)`, `updateCategory(id, dto)`, `deleteCategory(id)` |
| `menu-items.ts` | `listMenuItems(params?)`, `getMenuItem(id)`, `createMenuItem(dto)`, `updateMenuItem(id, dto)`, `deleteMenuItem(id)`, `addMenuItemSize(itemId, dto)`, `updateMenuItemSize(itemId, sizeId, dto)`, `deleteMenuItemSize(itemId, sizeId)` |
| `toppings.ts` | `listToppings(params?)`, `getTopping(id)`, `createTopping(dto)`, `updateTopping(id, dto)`, `deleteTopping(id)` |
| `branch-menu.ts` | `getBranchMenu(branchId)`, `updateBranchMenuItem(branchId, menuItemId, dto)`, `bulkEnableBranchItems(branchId, dto)`, `updateBranchTopping(branchId, toppingId, dto)` |
| `pos-orders.ts` | `createOrder(dto)`, `listOrders(params?)`, `getOrder(id)`, `payOrder(id, dto?)`, `cancelOrder(id)`, `voidOrder(id, dto)` |
| `pos-reports.ts` | `getPosSummary(params?)`, `getPosItemSales(params?)`, `getCashierPerformance(params?)` |

### 3.5 React Query hooks — `web/hooks/pos/`

| Hook | Query key | Notes |
|---|---|---|
| `useMenuCategories(params?)` | `["menu-categories", params]` | `staleTime: 60_000` |
| `useMenuItems(params?)` | `["menu-items", params]` | `staleTime: 60_000` |
| `useToppings(params?)` | `["toppings", params]` | `staleTime: 60_000` |
| `useBranchMenu(branchId)` | `["branch-menu", branchId]` | `staleTime: 30_000` |
| `usePosOrders(params?)` | `["pos-orders", params]` | `staleTime: 10_000` |
| `usePosOrder(id)` | `["pos-order", id]` | `staleTime: 0` (order state changes) |
| `useShiftCheck()` | reads from `useSession()` | No separate query — parses `me.onShift`, `me.shiftStartTime`, `me.shiftEndTime` |

Mutation hooks (use `useMutation`, invalidate relevant query keys on success):

| Hook | Invalidates |
|---|---|
| `useCreateOrder()` | `["pos-orders"]` |
| `usePayOrder()` | `["pos-order", id]`, `["pos-orders"]` |
| `useCancelOrder()` | `["pos-order", id]`, `["pos-orders"]` |
| `useVoidOrder()` | `["pos-order", id]`, `["pos-orders"]` |
| `useUpdateBranchMenuItem()` | `["branch-menu", branchId]` |
| `useUpdateBranchTopping()` | `["branch-menu", branchId]` |

### 3.6 Zustand POS store — `web/store/pos-store.ts`

The POS store holds the in-progress order being built on the POS screen.
It does **not** hit the API; it only manages client-side draft state.
The order is submitted to the API when the cashier taps "Pay".

```ts
// Minimal interface — expand as needed
interface DraftOrderLine {
  sizeId: string;
  itemName: string;
  sizeName: string;
  unitPrice: number;      // from effectivePrice
  quantity: number;
  toppingIds: string[];
  toppingNames: string[];
  toppingsUnitCost: number;
  lineTotal: number;      // (unitPrice + toppingsUnitCost) * quantity
}

interface PosStore {
  lines: DraftOrderLine[];
  discount: { type: DiscountType; value: number } | null;

  // Actions
  addLine(line: Omit<DraftOrderLine, "lineTotal">): void;
  removeLine(index: number): void;
  setQuantity(index: number, qty: number): void;
  setDiscount(type: DiscountType, value: number): void;
  clearDiscount(): void;
  clearOrder(): void;

  // Derived (compute on access)
  subtotal: number;
  discountAmount: number;
  total: number;
}
```

> **Note:** `discountAmount` and `total` should be recomputed any time
> `lines` or `discount` changes. Use Zustand's selector pattern or
> `immer` middleware to keep derivations clean.

### 3.7 `useShiftCheck` hook

```ts
// web/hooks/pos/useShiftCheck.ts
export function useShiftCheck() {
  const { data: me } = useSession();
  const user = me?.user;

  return {
    onShift: user?.onShift ?? false,
    shiftStartTime: user?.shiftStartTime ?? null,  // "HH:mm"
    shiftEndTime: user?.shiftEndTime ?? null,        // "HH:mm"
    shiftDays: user?.shiftDays ?? [],
    isCashier: user?.role === "cashier",
  };
}
```

The server already returns `onShift` (computed at request time in Africa/Nairobi
timezone). The frontend can trust this value without re-computing it.

### 3.8 Navigation sidebar updates

Add the following routes to the sidebar nav list. Follow the existing pattern
(check how `page` guards are enforced in the current nav component):

| Label | Path | Roles visible | Page key |
|---|---|---|---|
| POS | `/pos` | admin, branch_manager, cashier | `"pos"` |
| Menu Categories | `/menu-categories` | admin, branch_manager, cashier | `"menu"` |
| Menu Items | `/menu-items` | admin, branch_manager, cashier | `"menu"` |
| Toppings | `/toppings` | admin, branch_manager, cashier | `"menu"` |

**Cashier-specific nav restriction:** Cashiers should only see POS and Menu
links. All other nav items (Daily Sales, Purchases, Expenses, Payroll, Reports,
etc.) must be hidden. Implement this by checking `role === "cashier"` in the
nav rendering logic and filtering to a whitelist of `["pos", "menu"]` page keys.

### 3.9 Acceptance criteria — Phase 1

- [ ] `tsc --noEmit` passes with no new errors
- [ ] All service functions return properly typed responses
- [ ] All hooks use the correct query keys and staleTime values
- [ ] Zustand store correctly computes `subtotal`, `discountAmount`, `total` on every mutation
- [ ] `useShiftCheck` returns `onShift: true` during shift hours and `false` outside them (verify manually)
- [ ] Nav shows only POS + Menu links when logged in as a cashier
- [ ] No `any` casts in new files (use proper types or `unknown`)

---

## 4. Phase 2 — Menu Management Pages (Group 8)

**Effort:** ~2 days | **Depends on:** Phase 1

### 4.1 Goal

Admin/manager-facing pages to manage the menu catalogue and per-branch config.
Cashiers get read-only views with a stock-toggle shortcut.

### 4.2 Pages to build

| Page | Path | What it does |
|---|---|---|
| Menu Categories | `/menu-categories` | List, create, edit, deactivate/delete categories |
| Menu Items | `/menu-items` | List, create, edit, delete items; manage sizes; branch config |
| Toppings | `/toppings` | List, create, edit, delete/deactivate toppings |

### 4.3 Menu Categories page

- Table: name, sortOrder, item count, isActive, created by, actions
- Admin: create/edit/delete buttons. Edit modal has name, description, sortOrder, isActive toggle.
- Manager: create/edit (own items). No delete — deactivate via `PATCH { isActive: false }`.
- Cashier: read-only list (active only)
- Delete guard: if `_count.items > 0`, show message "This category has items. Deactivate it instead."
- On delete success: `204 No Content` → remove row from list

### 4.4 Menu Items page

- Table: name, category, sizes (count), isActive, order lines count, actions
- Create modal: name, category (select), description, sortOrder, sizes (add at least one)
- Edit modal: same fields + isActive toggle
- Size management: inline list under each item with +/- buttons; edit modal per size (name, basePrice, sortOrder, isActive)
- Delete size guard: if it's the last active size, server returns 409 — show "Cannot remove the last active size"
- Branch config section (admin/manager, own branches): 
  - Toggle `isEnabled` and `isInStock` per branch
  - Per-size price override (null = use base price)

### 4.5 Toppings page

- Table: name, price, sortOrder, isActive, order usage count, actions
- Admin: full CRUD. DELETE returns `{ id, action: "deleted" | "deactivated" }` — show "Topping deactivated (still used in past orders)" when `action === "deactivated"`.
- Manager/cashier: stock toggle only (via branch menu endpoint, not toppings endpoint)
- No pagination — `GET /api/toppings` returns a flat array (not paginated)

### 4.6 Acceptance criteria — Phase 2

- [ ] Correct fields shown/hidden per role
- [ ] Name clash → 409 displayed as "A category/item/topping with this name already exists"
- [ ] Category delete guard (has items → 409 shown as user-friendly message)
- [ ] Size delete guard (last active size → 409)
- [ ] Deactivated items not visible to cashier/manager (active-only filter default)
- [ ] Branch price override saves and is visible on next load
- [ ] Stock toggle works for cashier within their branch

---

## 5. Phase 3 — POS Screen (Group 9)

**Effort:** ~3 days | **Depends on:** Phases 1 + 2

### 5.1 Goal

The core cashier experience: build an order, apply a discount, pay.

### 5.2 Layout

Two-panel layout (responsive, works on tablet portrait and desktop landscape):

```
┌─────────────────────────┬────────────────────────┐
│  Menu Grid (left/top)   │  Order Panel (right/   │
│  - Category tabs        │  bottom)               │
│  - Item cards           │  - Line items           │
│  - Item tap flow        │  - Subtotal/discount/   │
│                         │    total               │
│                         │  - Discount + Pay btns  │
└─────────────────────────┴────────────────────────┘
```

On mobile (< 768 px): menu grid full screen; current order accessible via a
floating button / bottom sheet.

### 5.3 Item tap flow

1. Cashier taps item card
2. **Size picker modal**: shows active sizes with `effectivePrice` (from branch menu)
3. **Topping selector** (optional step): shows in-stock toppings with price per unit
4. Confirm → `store.addLine(...)` → modal closes

### 5.4 Shift guard

On mount, call `useShiftCheck()`. If `isCashier && !onShift`, show a full-screen
block component (`<ShiftBlock />`) instead of the POS UI. The block shows:

> "Your shift has not started yet. Your shift is Monday–Friday, 07:00–20:00."

Do NOT show the POS screen at all — not even read-only.

### 5.5 Discount modal

Fields: type (% or KSh fixed), value. Before calling the API, validate on the
client: `value ≤ me.maxDiscountPercent`. Show an inline error if exceeded.
The server also validates — display the server error on 403.

### 5.6 Payment flow

1. Cashier taps "Pay" → payment method modal (Cash / M-Pesa / Card, or "Not recorded")
2. On confirm: `POST /api/pos/orders` with the full order payload
3. Success → clear `pos-store` → navigate to `/pos/invoice/:orderId`
4. On API error (400/403): show toast, stay on POS screen with order intact

### 5.7 Acceptance criteria — Phase 3

- [ ] `GET /api/branches/:branchId/menu` is called with the cashier's own `branchId`
- [ ] Only enabled + in-stock items visible to cashier (server already filters, but also guard client-side)
- [ ] `effectivePrice` (not `basePrice`) is used for all price displays
- [ ] Discount capped at `me.maxDiscountPercent` on client
- [ ] Shift block shown immediately when `onShift === false`
- [ ] Store clears after successful payment
- [ ] Order panel shows correct subtotal → discount → total at all times

---

## 6. Phase 4 — Invoice (Group 10)

**Effort:** ~1 day | **Depends on:** Phase 3

### 6.1 Invoice data source

`GET /api/pos/orders/:id` — returns the full PosOrder with lines and toppings.

### 6.2 Invoice layout

```
Bubble Tea Palace — [Branch Name]          Order #BTP-042
-----------------------------------------------------------
Date: 2026-08-20 10:35    Cashier: Ali Hassan

  Taro Milk Tea (Large)          1 × 450.00      450.00
    + Tapioca Pearls                               20.00
    + Coconut Jelly                                20.00
  Mango Fruit Tea (Regular)      2 × 320.00      640.00
-----------------------------------------------------------
Subtotal                                       1,110.00
Discount (10%)                                  -111.00
Total                                            999.00

Payment: M-Pesa
-----------------------------------------------------------
Thank you!
```

Order number format: `#<orderNumber>` (e.g. `#42`). The `branch.name` gives
the location.

### 6.3 Voided watermark

When `status === "voided"`, overlay a large red "VOIDED" diagonal watermark
and show: `Voided on [voidedAt] by [voidedBy.name]. Reason: [voidReason]`.

### 6.4 Actions

- **Print** — `window.print()` with `@media print` CSS hiding the nav/header
- **Download PDF** — `@react-pdf/renderer` (already likely a dep; check `package.json`)
- **Share** — `navigator.share()` if available, fallback to copy-link

### 6.5 Acceptance criteria — Phase 4

- [ ] Invoice renders all lines with correct toppings and totals
- [ ] Discount row shown only when `discountAmount !== null`
- [ ] Voided watermark shown when `status === "voided"`
- [ ] Print removes nav and prints just the invoice area
- [ ] PDF download works in browser and generates correct layout

---

## 7. Phase 5 — Reports Frontend (Group 11)

**Effort:** ~2 days | **Depends on:** Phase 1

### 7.1 New report pages

| Page | Path | Endpoint |
|---|---|---|
| POS Summary | `/reports/pos-summary` | `GET /api/reports/pos-summary` |
| Item Sales | `/reports/pos-items` | `GET /api/reports/pos-items` |
| Cashier Performance | `/reports/pos-cashier-performance` | `GET /api/reports/pos-cashier-performance` |

All three share the same date range picker + optional branch filter (admin only).

### 7.2 POS Summary page

- KPI cards: Total Revenue, Order Count, Avg Order Value, Total Discount
- Bar/line chart: daily revenue trend (`dailyTrend`)
- Table: by-branch breakdown (revenue, orders, avg)
- Pie/donut chart: payment method mix (`byPaymentMethod`)

### 7.3 Item Sales page

- Total revenue KPI
- Sortable table: itemName, quantitySold, revenue, % of total
- Bar chart: top 10 items by revenue

### 7.4 Cashier Performance page

- Sortable table: cashierName, orders, revenue, avg order value, discounts given, voids

### 7.5 Dashboard updates

In the admin and manager dashboards, the `totalRevenue` stat already includes
POS revenue (the API merges DailySale + PosOrder). No frontend change is needed
for the revenue number itself. Optionally add a POS-specific card showing
`posOrderCount` from the POS summary endpoint.

### 7.6 Acceptance criteria — Phase 5

- [ ] Date range picker defaults to the last 6 months (matches API default)
- [ ] Branch filter appears for admin; hidden for managers (they see their own branches implicitly)
- [ ] Empty state shows "No POS orders in this period" when `orderCount === 0`
- [ ] Charts are responsive (use existing charting library)

---

## 8. Phase 6 — User Management Updates (Group 12)

**Effort:** ~0.5 days | **Depends on:** Phase 1

### 8.1 User create/edit modal updates

When `role === "cashier"`, show these additional fields:

| Field | Input type | Required | Notes |
|---|---|---|---|
| `branchId` | branch select (single) | Yes | Must be active |
| `shiftDays` | multi-checkbox Mon–Sun | Yes | At least one day |
| `shiftStartTime` | time input | Yes | HH:mm 24h |
| `shiftEndTime` | time input | Yes | Must be after start |
| `maxDiscountPercent` | number input 0–100 | No | Null = no discount |

Hide `branchIds` (multi-branch select) and `disabledPages` for cashier role —
they are not applicable.

### 8.2 Users table updates

- Add role badge: color-code cashier differently from manager/admin
- For cashier rows, show: shift days summary (e.g. "Mon–Fri"), shift window (e.g. "07:00–20:00")

### 8.3 Daily sales form

The daily sales form must check whether the selected branch is POS-enabled
before allowing submission. If `branch.posEnabled === true`, disable the
form and show:

> "This branch uses POS — revenue is recorded automatically through POS orders."

This is a UX guard. The API also returns 400, but the user should not reach
that point.

**How to check:** `GET /api/branches/:id` returns `posEnabled` in the branch
object. Call this when the user selects a branch in the form.

### 8.4 Acceptance criteria — Phase 6

- [ ] Cashier-specific fields appear/disappear when role select changes
- [ ] `shiftEndTime` validation: must be after `shiftStartTime`
- [ ] Daily sales form shows the warning and disables submit for posEnabled branches
- [ ] Role badge in users table correctly shows "Cashier" with distinct color

---

## 9. Phase 7 — Smoke Tests & Verification (Groups 13-14)

See `docs/phase-2/06-implementation-checklist.md` Groups 13 and 14 for the
complete test and verification checklist. Key acceptance gates:

- [ ] `pnpm build` passes for both `api/` and `web/` with no errors
- [ ] All existing smoke tests still pass (no regression)
- [ ] New POS smoke suites pass end-to-end
- [ ] Manual tablet/desktop test of the full POS flow (order → pay → invoice)
- [ ] Admin can void an order and sees the correct invoice watermark
- [ ] Cashier blocked from sign-in when outside shift hours

---

## 10. Quick-Start Checklist for New Developers

If you are joining mid-project and need to get up to speed:

1. **Read `docs/phase-2/README.md`** — high-level goals and scope
2. **Read `docs/phase-2/02-business-rules.md`** — the business rules (BR-POS-x.x)
3. **Read `docs/phase-2/integration/api-reference.md`** — every endpoint with examples
4. **Check out the backend** — all Groups 1-6 are merged and built (`pnpm build` in `api/` should be green)
5. **Run the API** — `pnpm dev` in `api/`, then confirm `GET http://localhost:4000/api/auth/session/me` returns your session
6. **Start Phase 1** — create types first, then service functions, then hooks
7. **Test with a real cashier account** — ask an admin to create one via `POST /api/users` with `role: "cashier"` and shift fields set

> Don't skip Phase 1. Every other phase imports from it.
