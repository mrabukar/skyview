# 05 — Frontend (Phase 2 — POS Module)

All new pages live under `web/app/(app)/`. Components follow the existing
pattern: page-level components in `app/(app)/<module>/components/`, shared
components in `components/`. Service layer in `web/service/`, hooks in
`web/hooks/`, types in `web/types/`.

The `branch` ↔ `store` naming bridge in `web/service/client.ts` applies to all
new endpoints that carry branch fields.

---

## 1. New Pages

### POS Screen — `/pos`

The cashier's primary workspace. Optimized for **tablet** (1024×768) but
responsive down to phone and up to desktop.

**Layout: two-panel split**

```
┌─────────────────────────────┬──────────────────────┐
│  MENU                       │  CURRENT ORDER       │
│                             │                      │
│  [Category tabs]            │  #0042               │
│  ┌──────┐ ┌──────┐ ┌─────┐ │                      │
│  │ Item │ │ Item │ │Item │ │  Classic Milk Tea (L) │
│  │ 500  │ │ 400  │ │ 350 │ │    + Boba Pearls      │
│  └──────┘ └──────┘ └─────┘ │    × 2    =  1,100   │
│  ┌──────┐ ┌──────┐         │                      │
│  │ Item │ │ Item │         │  Mango Fruit Tea (M)  │
│  │ 300  │ │ 450  │         │    × 1    =    400   │
│  └──────┘ └──────┘         │                      │
│                             │  ─────────────────── │
│                             │  Subtotal    1,500   │
│                             │  Discount     -150   │
│                             │  TOTAL       1,350   │
│                             │                      │
│                             │  [Discount] [Cancel] │
│                             │  [     PAY      ]    │
└─────────────────────────────┴──────────────────────┘
```

**Left panel — Menu grid:**
- Category tabs along the top (horizontal scroll if many).
- Item cards in a responsive grid. Each card shows: item name, default/cheapest
  price. Tapping an item opens a **size picker** (if multiple sizes) then a
  **toppings selector** (checkboxes, only in-stock toppings).
- After size + toppings selection, the item is added to the order.
- Out-of-stock items are hidden (filtered by `isEnabled && isInStock`).
- Search bar at the top to filter items by name.

**Right panel — Current order:**
- Line items with item name, size, toppings, quantity, line total.
- Quantity can be adjusted (+/−) or the line can be removed (swipe or X button).
- Subtotal, discount (if applied), and total displayed prominently.
- **Discount button**: opens a modal — choose percentage or fixed, enter value.
  If cashier has no `maxDiscountPercent`, button is hidden/disabled.
- **Cancel button**: clears the order (if pending, cancels via API; if still
  building locally, just clears state).
- **Pay button**: opens payment confirmation — optionally select payment method
  (Cash / M-Pesa / Card), then confirm. On success, shows the invoice.

**After payment — Invoice view:**
- Full invoice displayed on screen (see §5 Invoice below).
- Actions: **Print** (browser print), **Share/Download** (PDF via
  `@react-pdf/renderer`), **New Order** (return to empty POS screen).

**Shift guard:**
- On page load, check the current user's shift. If outside shift window, show a
  full-screen message: "Your shift is not active. It starts at HH:mm on [Day]."
  No POS functionality accessible.
- If shift ends while the page is open, intercept the next API call (which will
  403) and show the shift-ended message. Poll or check time client-side to show
  the message proactively.

**Mobile (phone) layout:**
- Single panel: menu grid fills the screen. Current order is a bottom drawer
  that slides up (showing item count + total as a summary bar when collapsed).
- Same functionality, touch-optimized (larger tap targets).

### Menu Items — `/menu-items`

Management page for the org-wide menu item catalog.

**Admin view:**
- Table with columns: Name, Category, Sizes (count), Status (active/inactive),
  Actions.
- Search + category filter.
- **Add Item** button → modal with: name, category (select), description,
  sizes (dynamic list: name + base price for each, add/remove).
- **Edit** → same modal, pre-filled. Can add/remove/edit sizes.
- **Deactivate/Activate** toggle.
- **Delete** (if no orders).
- **Branch Configuration** section within each item's detail: table of branches
  showing enabled status, stock status, and price per size. Admin can toggle
  enabled and set price overrides per branch. (Alternatively, this can be a
  separate "Branch Menu" page — see §2 below.)

**Manager view:**
- Same table with CRUD for items **they created** (add, edit, deactivate).
- **Add Item** button → same modal as admin, but auto-enables the item at the
  manager's branch(es) on creation.
- **Edit** only appears on items where `createdById` matches the manager.
- **Stock toggle** column: toggle items in/out of stock at their branch(es).
- **Branch config**: enable/disable items and set branch prices for their
  branch(es).

**Cashier view:**
- Read-only (no CRUD).
- **Stock toggle** column only: toggle items in/out of stock at their branch.

### Menu Categories — `/menu-categories`

**Admin view:**
- Simple list/table: Name, Description, Items count, Sort Order, Status.
- CRUD via modals.
- Drag-to-reorder (updates `sortOrder`) — nice to have, not required.

**Manager view:**
- Same table with CRUD for categories **they created** (add, edit, deactivate).
- **Add Category** button → same modal as admin.
- **Edit** only appears on categories where `createdById` matches the manager.

**Cashier view:**
- Read-only list.

### Toppings — `/toppings`

**Admin view:**
- Table: Name, Price, Status (active/inactive), Actions.
- CRUD via modals.

**Manager view:**
- Same table with CRUD for toppings **they created** (add, edit, deactivate).
- Stock toggle per branch (their branch(es) only).

**Cashier view:**
- Read-only table with stock toggle per branch (their branch only).

---

## 2. Branch Menu Configuration

The admin needs a way to configure which items are available at each branch and
set per-branch pricing. Two UX approaches (pick one during implementation):

**Option A — Inside Menu Items page:**
Each item's detail/edit view has a "Branch Availability" section: a table of
all branches with toggle (enabled), stock status, and price overrides per size.
Good for item-centric management ("configure Classic Milk Tea across all
branches").

**Option B — Inside Branch detail (new tab):**
Add a "Menu" tab to the branch management page (or a new
`/branches/:id/menu` page). Shows all org items with toggles and prices for
that branch. Good for branch-centric management ("set up Karen's menu").

**Recommendation:** implement **both** access paths — they use the same API
endpoints. Branch-centric is better for initial setup; item-centric is better
for day-to-day changes.

---

## 3. Navigation Updates

### Sidebar — new items

| Nav item | Route | Visible to |
|---|---|---|
| POS | `/pos` | Cashier (always), Manager (if enabled), Admin |
| Menu Items | `/menu-items` | Cashier (always), Manager (if enabled), Admin |
| Menu Categories | `/menu-categories` | Cashier (always), Manager (if enabled), Admin |
| Toppings | `/toppings` | Cashier (always), Manager (if enabled), Admin |

Page keys `pos` and `menu` control visibility for managers (via `disabledPages`).
Cashiers always see these items. Admin always sees everything.

### Sidebar — cashier-specific

A cashier's sidebar shows **only**:
- POS
- Menu Items
- Menu Categories
- Toppings
- Settings (profile)

All other nav items are hidden for the cashier role.

---

## 4. Modified Existing Pages

### Daily Sales (`/sales`)

When the user attempts to add a daily sale, if the selected branch has
`posEnabled = true`, show a toast/alert: "This branch uses POS — daily sales
are recorded automatically." Disable the form submission for that branch.

The branch selector (if visible) should indicate POS-enabled branches (e.g.,
a badge or note).

### Dashboard (`/dashboard`) — Admin

Revenue section: include POS revenue for POS-enabled branches. Show a breakdown:
- POS branches: "POS Revenue" with total from POS orders.
- Non-POS branches: "Manual Sales" with total from daily sales.
- Combined total.

Consider adding a "POS Overview" card: today's orders, today's revenue, active
cashiers.

### Dashboard (`/dashboard`) — Manager

Same revenue integration as admin, scoped to assigned branches. If any assigned
branch is POS-enabled, show POS revenue alongside manual sales.

### User Management (`/users`)

**Create/Edit user modal** — when role is `cashier`:
- Show shift schedule fields:
  - **Working days**: multi-select checkboxes (Mon–Sun).
  - **Shift start**: time picker (HH:mm).
  - **Shift end**: time picker (HH:mm).
- Show **Max discount**: number input (percentage, e.g., 20). Leave empty for
  no discount.
- **Branch**: single select (not multi-select — cashiers are single-branch).
- Hide fields irrelevant to cashiers (e.g., `disabledPages`).

**Users table**: show role badge differentiating cashier from manager. Show
branch assignment.

---

## 5. Invoice Component

A reusable invoice renderer using `@react-pdf/renderer` for PDF generation
and a printable HTML view for browser printing.

**Component:** `web/components/pos/invoice.tsx` (for screen display) and
`web/components/pos/invoice-pdf.tsx` (for `@react-pdf/renderer` PDF).

**Layout:**

```
┌──────────────────────────────┐
│        BUBBLE TEA PALACE     │
│      Hub Mall Karen Branch   │
│     Some Address, Nairobi    │
│                              │
│  Order #0042                 │
│  Date: 20 Aug 2026, 14:35   │
│                              │
│  ──────────────────────────  │
│  Classic Milk Tea (Large)    │
│    + Boba Pearls         50  │
│    + Coconut Jelly       30  │
│              × 2      1,100  │
│                              │
│  Mango Fruit Tea (Medium)    │
│              × 1        400  │
│  ──────────────────────────  │
│  Subtotal              1,500 │
│  Discount (10%)         -150 │
│  ──────────────────────────  │
│  TOTAL                 1,350 │
│                              │
│  Payment: Cash               │
│  Cashier: Ali                │
│                              │
│  Thank you for visiting      │
│  Bubble Tea Palace!          │
│                              │
│         [VOIDED]             │ ← only if voided
└──────────────────────────────┘
```

**Actions (displayed below the invoice):**
- **Print**: `window.print()` — the invoice component has `@media print` styles.
- **Download PDF**: generates a PDF blob via `@react-pdf/renderer` and triggers
  download.
- **Share**: uses the Web Share API on mobile (`navigator.share({ files: [pdf] })`);
  falls back to download on desktop.

---

## 6. New Service / Hooks / Types

Follow the existing pattern in `web/service/`, `web/hooks/`, `web/types/`.

### Types (`web/types/pos/`)
- `menu-category.ts` — `MenuCategory`, `CreateMenuCategoryInput`, etc.
- `menu-item.ts` — `MenuItem`, `MenuItemSize`, `CreateMenuItemInput`, etc.
- `topping.ts` — `Topping`, `CreateToppingInput`, etc.
- `branch-menu.ts` — `BranchMenuConfig`, `BranchMenuItemConfig`, etc.
- `pos-order.ts` — `PosOrder`, `OrderLine`, `OrderLineTopping`,
  `CreateOrderInput`, `OrderStatus`, `PaymentMethod`, `DiscountType`.
- `pos-reports.ts` — report response shapes.

### Service (`web/service/pos/`)
- `menu-categories.ts` — CRUD.
- `menu-items.ts` — CRUD + sizes.
- `toppings.ts` — CRUD.
- `branch-menu.ts` — branch config read/write.
- `orders.ts` — create, list, detail, pay, cancel, void.
- `reports.ts` — POS reports.

### Hooks (`web/hooks/pos/`)
- `use-menu-categories.ts` — React Query hooks for categories.
- `use-menu-items.ts` — React Query hooks for items + sizes.
- `use-toppings.ts` — React Query hooks for toppings.
- `use-branch-menu.ts` — React Query hooks for branch menu config.
- `use-pos-orders.ts` — React Query hooks for orders (create, pay, cancel, void,
  list, detail).
- `use-pos-reports.ts` — React Query hooks for reports.
- `use-shift-check.ts` — checks current user's shift status; returns
  `{ isOnShift, shiftMessage, nextShiftStart }`.

### Zustand Store (`web/store/`)
- `pos-store.ts` — local POS state for the active order being built (lines,
  toppings, discount). Cleared on order submission or cancel. This keeps the
  POS screen fast (no API calls while building an order — only on submit).

---

## 7. Responsive Breakpoints

| Screen | Width | POS layout |
|---|---|---|
| Phone | < 768px | Single panel + bottom drawer for order |
| Tablet | 768–1279px | Two-panel split (60/40) |
| Desktop | ≥ 1280px | Two-panel split (65/35) |

The POS screen should be **full-height** (no scrolling on the page level). The
menu grid and order panel scroll independently.

---

## 8. Accessibility

- All interactive elements have ARIA labels.
- Keyboard navigation for the POS screen (Tab through items, Enter to add).
- Color contrast meets WCAG AA (consistent with existing theme).
- Price displays use the existing KSh formatting helpers.
