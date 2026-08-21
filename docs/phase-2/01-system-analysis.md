# 01 — System Analysis (Phase 2 — POS Module)

## 1. Purpose

Extend the Skyview Coffee financial recording system with a Point of Sale (POS)
module. The POS captures every sales transaction at the item level — menu item,
size, toppings, quantity, discount, payment method — replacing manual daily
sales entry for branches that opt in.

Branches without POS continue using manual daily sales entry. Both data sources
feed into the same reporting pipeline, so head office sees unified revenue
numbers regardless of how each branch records its sales.

## 2. Actors (updated)

| Actor | Description | Scope |
|---|---|---|
| **Admin** | Owner / back-office staff | All branches, all modules. Manages the menu catalog (items, categories, sizes, toppings). Configures branch POS (toggle, item availability, pricing). Creates cashiers with shift schedules and discount limits. Can void completed POS orders. Sees all POS reports. |
| **Branch Manager** | Runs one or more branches | Own branch(es). POS and menu page access toggleable by admin (via `disabledPages`). Can toggle menu item / topping stock status at their branch(es). Can void completed POS orders at their branch(es). Sees POS data in their dashboard. |
| **Cashier (NEW)** | Runs the POS at one branch | One branch only. Creates and completes POS orders. Applies discounts within their admin-set limit. Toggles item / topping stock status. Can cancel pending orders. **Cannot** void completed orders, manage the catalog, or access any non-POS module. Can only log in and transact during their scheduled shift. |

### Role notes

- Every user has exactly one role (`super_admin`, `admin`, `branch_manager`,
  `cashier`).
- A cashier is assigned to **exactly one branch** (single `branchId`).
- A cashier has a **weekly schedule**: a set of working days + one daily time
  window (e.g., Saturday–Tuesday 07:00–20:00). Outside this window the
  system blocks login and POS transactions.
- Admin and super_admin are unaffected by shift rules.
- Branch managers inherit POS access through the existing `disabledPages`
  mechanism — admin adds `pos` / `menu` to the page registry, toggleable
  per manager.

## 3. New Modules

| Module | What it does | Who writes | Who reads |
|---|---|---|---|
| **Menu Categories** | Org-wide product categories for the POS menu | Admin + manager | All |
| **Menu Items** | Org-wide product catalog with size variants | Admin + manager | All |
| **Toppings** | Org-wide add-ons; per-branch stock toggle | Admin + manager (CRUD); cashier (stock toggle) | All |
| **Branch Menu Config** | Per-branch item availability, pricing, stock status | Admin (availability, pricing); cashier/manager (stock toggle) | All at that branch |
| **POS Orders** | Transaction processing: create, pay, cancel, void | Cashier (create/pay/cancel); admin/manager (void) | Admin (all), manager (own branches), cashier (own orders) |
| **POS Invoices** | Printable / shareable order receipts (PDF) | System-generated | Cashier, customer |
| **POS Reports** | Item-level sales, cashier performance, revenue summary | System-computed | Admin (all), manager (own branches) |

## 4. Modified Existing Modules

| Module | Change |
|---|---|
| **Users** | New `cashier` value in `UserRole` enum. Cashier-specific fields: `shiftDays`, `shiftStartTime`, `shiftEndTime`, `maxDiscountPercent`. Create/update user must handle these for the cashier role. |
| **Branches** | New fields: `posEnabled` (toggle), `nextPosOrderNumber` (atomic counter). |
| **Daily Sales** | When a branch has `posEnabled = true`, block **new** manual daily sales entries for that branch. Historical entries are preserved. |
| **Reports** | Admin and manager dashboards include POS revenue alongside manual daily sales. For POS-enabled branches, daily revenue comes from POS transactions; for non-POS branches, from manual entries. |
| **Page Registry** | Add `pos` and `menu` page keys. Toggleable for branch managers via `disabledPages`. Always-on for cashiers. |
| **Auth** | Shift-based login restriction for cashier role (hook on sign-in). |
| **Branch Scope** | `branch-scope.util.ts` handles `cashier` role alongside `branch_manager` (single branch, same scoping logic). |

## 5. Explicitly Out of Scope (Phase 2)

These are deferred to future phases. The design must not block them but must not
build them now:

- **Offline / queue mode** — requires service worker or native app; planned
  future phase.
- **Thermal printer integration** — hardware-dependent; future phase.
- **Kitchen display / order queue** — not needed for a bubble tea counter.
- **Ingredient inventory / automatic stock deduction** — out of scope per
  Phase 1 decision. The POS stock toggle is manual (on/off), not quantity-based.
- **Loyalty programs / customer accounts** — future phase.
- **Topping categories** — flat list for now; can add categories later without
  schema pain.
- **Per-branch topping pricing** — toppings are org-wide priced. If branches
  need different topping prices later, add a `BranchToppingPrice` model
  (mirrors the item pattern).
- **Per-line-item discounts** — discounts are per-order only.
- **Sugar / ice level customization** — can be added as item modifiers later;
  not in scope now.

## 6. Assumptions

1. Currency (KSh), timezone (Africa/Nairobi), and multi-tenant rules unchanged.
2. POS runs on any modern browser — desktop, tablet, phone. The POS screen is
   **tablet-optimized** (common POS hardware) but responsive.
3. Internet connectivity is **required** for all POS operations (offline is
   future).
4. Each cashier works one branch, with one time window per working day.
5. Toppings are priced the same across all branches (org-wide price).
6. Order numbers are branch-scoped and continuous (never reset between days).
7. Discounts are per-order, not per-line-item.
8. Shift times do not span midnight (start < end within one calendar day).
9. The POS screen is the cashier's primary workflow — it should be fast, minimal
   taps, optimized for throughput.
