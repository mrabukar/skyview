# 02 — Business Rules (Phase 2 — POS Module)

Numbering: **BR-POS-{section}.{rule}**. These are the formal rules the backend
must enforce. Frontend validation mirrors them but is never the sole gate.

---

## 1. Cashier Role & Shifts

**BR-POS-1.1** — A cashier belongs to exactly one branch (`branchId` required,
single value — not multi-branch like managers).

**BR-POS-1.2** — Each cashier has a weekly schedule consisting of:
- `shiftDays`: one or more days of the week (e.g., `["saturday", "sunday",
  "monday", "tuesday"]`).
- `shiftStartTime` / `shiftEndTime`: a single daily time window in `HH:mm`
  format, Africa/Nairobi timezone (e.g., `07:00` – `20:00`).
- All three fields are **required** when creating/updating a cashier.

**BR-POS-1.3** — `shiftStartTime` must be earlier than `shiftEndTime` (no
overnight shifts — start < end within one calendar day).

**BR-POS-1.4** — **Login restriction.** When a cashier attempts to sign in, the
system checks the current date/time in Africa/Nairobi:
- If today is not one of their `shiftDays` → reject sign-in with a clear
  message ("Your shift does not include today").
- If the current time is before `shiftStartTime` or after `shiftEndTime` →
  reject sign-in ("Your shift starts at HH:mm / ended at HH:mm").

**BR-POS-1.5** — **Transaction restriction.** If a cashier is already logged in
when their shift window ends (or on a non-working day), the session stays active
but **all POS write operations** (create order, pay order, cancel order) are
blocked with 403 ("Your shift has ended"). Read-only operations (view menu, view
own orders) remain allowed.

**BR-POS-1.6** — A cashier can view: POS screen, Menu Items page, Menu
Categories page, Toppings page, and their own profile/settings. No other pages
are accessible (sales, purchases, expenses, vendors, reports, users, branches,
audit, payroll, receipts, financial — all blocked).

**BR-POS-1.7** — Shift schedule fields (`shiftDays`, `shiftStartTime`,
`shiftEndTime`) are ignored for non-cashier roles. `maxDiscountPercent` is
likewise cashier-only.

---

## 2. Menu Categories

**BR-POS-2.1** — Menu categories belong to the organization (org-wide, shared
across all branches).

**BR-POS-2.2** — Category name is unique per organization (case-insensitive).

**BR-POS-2.3** — **Admins and branch managers** can create categories. Managers
can also edit categories they created (`createdById` = caller). Admins can edit
any category. Cashiers have no catalog write access.

**BR-POS-2.4** — Only admins can **hard-delete** categories (and only if the
category has no items). Managers can **deactivate** (`isActive = false`)
categories they created. Deactivated categories and their items are hidden from
the POS but retained for historical orders.

**BR-POS-2.5** — Categories have a `sortOrder` for display sequencing (default
0; ties broken alphabetically).

**BR-POS-2.6** — Categories track `createdById` (FK → User) for ownership-based
edit permissions.

---

## 3. Menu Items

**BR-POS-3.1** — Menu items belong to the organization (shared catalog).

**BR-POS-3.2** — Each menu item has a name, belongs to one category, and has
**one or more size variants** (e.g., Small, Medium, Large).

**BR-POS-3.3** — Item name is unique per organization (case-insensitive).

**BR-POS-3.4** — Each size variant has a name and a **base price** (in KSh,
`> 0`). Size name is unique within its item.

**BR-POS-3.5** — **Admins and branch managers** can create items (with sizes).
Managers can edit items they created (`createdById` = caller). Admins can edit
any item. Cashiers have no catalog write access.

**BR-POS-3.6** — When a **manager** creates an item, a `BranchMenuItem` record
is **auto-created** for the manager's branch(es) with `isEnabled = true` and
`isInStock = true`. The item is immediately available at the manager's branch
POS. Other branches are unaffected until someone enables it for them.

**BR-POS-3.7** — Only admins can **hard-delete** items (and only if none of its
sizes appear in order lines). Managers can **deactivate** (`isActive = false`)
items they created.

**BR-POS-3.8** — A size variant cannot be deleted if it appears in order lines.
Deactivate instead. Only admins can hard-delete sizes.

**BR-POS-3.9** — Items have a `sortOrder` for display sequencing (default 0).

**BR-POS-3.10** — Items track `createdById` (FK → User) for ownership-based
edit permissions.

---

## 4. Toppings

**BR-POS-4.1** — Toppings belong to the organization (org-wide, shared across
all branches).

**BR-POS-4.2** — Each topping has a name and a **price** (in KSh, `>= 0` — a
free topping is valid).

**BR-POS-4.3** — Topping name is unique per organization (case-insensitive).

**BR-POS-4.4** — **Admins and branch managers** can create toppings. Managers
can edit toppings they created (`createdById` = caller). Admins can edit any
topping. Cashiers have no catalog write access.

**BR-POS-4.5** — Only admins can **hard-delete** toppings (and only if the
topping doesn't appear in any order line toppings). Managers can **deactivate**
(`isActive = false`) toppings they created.

**BR-POS-4.8** — Toppings track `createdById` (FK → User) for ownership-based
edit permissions.

**BR-POS-4.6** — Toppings are a flat list (no categories). Categories can be
added in a future phase without schema change.

**BR-POS-4.7** — Topping price is the same across all branches (org-wide). Per-
branch topping pricing is out of scope (future phase).

---

## 5. Branch Menu Configuration

**BR-POS-5.1** — Each branch independently controls which menu items it carries.
An item is available at a branch only if a `BranchMenuItem` record exists for
that (branch, item) pair with `isEnabled = true`.

**BR-POS-5.2** — When an **admin** creates a menu item, it is **not** available
at any branch until explicitly enabled. When a **manager** creates a menu item,
it is **auto-enabled at the manager's branch(es)** only (BR-POS-3.6). Other
branches are unaffected.

**BR-POS-5.3** — Per-branch **price overrides**: for each size variant of an
item, a branch can set its own price via `BranchMenuItemPrice`. If no override
exists, the base price from `MenuItemSize` applies. The effective price is
`branchOverride ?? basePrice`.

**BR-POS-5.4** — **Stock toggle** (`isInStock`): a cashier or manager at a
branch can mark an item as out-of-stock. Out-of-stock items are hidden from the
POS at that branch. This is independent of `isEnabled` (admin controls whether
the branch carries the item; cashier/manager controls daily stock status).

**BR-POS-5.5** — An item appears in a branch's POS **only if** all of:
- The item is active (`MenuItem.isActive = true`)
- The item's category is active (`MenuCategory.isActive = true`)
- The branch has the item enabled (`BranchMenuItem.isEnabled = true`)
- The branch has the item in stock (`BranchMenuItem.isInStock = true`)

**BR-POS-5.6** — **Topping stock toggle**: each topping is available at all
branches by default. A `BranchTopping` record with `isInStock = false` hides
the topping from that branch's POS. No record (or `isInStock = true`) = available.

**BR-POS-5.7** — Admins and managers (at their own branches) can toggle
`isEnabled` and set price overrides. Cashiers and managers can toggle `isInStock`
(items and toppings) at their own branch(es).

---

## 6. POS Orders

**BR-POS-6.1** — An order belongs to one branch and is created by one cashier.
The branch is the cashier's assigned branch (implicit, not selected).

**BR-POS-6.2** — Order statuses and transitions:
```
pending ──→ paid        (cashier confirms payment)
pending ──→ cancelled   (cashier cancels before payment)
paid    ──→ voided      (admin/manager voids after payment)
```
No other transitions are allowed. Cancelled and voided are terminal states.

**BR-POS-6.3** — A cashier can only create orders **during their active shift**
(current day is a working day AND current time is within the shift window).
See BR-POS-1.5.

**BR-POS-6.4** — Each order has one or more **order lines**. An order with zero
lines is invalid (rejected at creation).

**BR-POS-6.5** — Each order line specifies:
- A `menuItemSizeId` — must be an active, enabled, in-stock size at the
  cashier's branch.
- A `quantity` — positive integer (`>= 1`).
- Zero or more `toppingIds` — each must be an active, in-stock topping at the
  cashier's branch.

**BR-POS-6.6** — **Price snapshots.** At order creation, the system snapshots
onto each order line: `itemName`, `sizeName`, `unitPrice` (the effective branch
price for that size). Each order line topping snapshots: `toppingName`, `price`.
These snapshots are immutable — if prices or names change later, historical
orders retain their original values.

**BR-POS-6.7** — **Line total calculation:**
```
lineSubtotal  = unitPrice × quantity
toppingsTotal = sum(topping prices) × quantity
lineTotal     = lineSubtotal + toppingsTotal
```
Toppings apply **per unit** — if quantity is 2 and boba costs 50, the topping
charge is 100. If two units of the same item need different toppings, they must
be separate lines.

**BR-POS-6.8** — **Order total calculation:**
```
subtotal       = sum of all lineTotal values
discountAmount = (see §7 discount rules)
totalAmount    = subtotal − discountAmount
```
All three are stored on the order as snapshots.

**BR-POS-6.9** — **Order number**: a continuous integer per branch, never
resets. The next number is derived from `Branch.nextPosOrderNumber` and
atomically incremented in the same transaction that creates the order.

**BR-POS-6.10** — **Payment method**: optional (`cash`, `mpesa`, `card`). Set
when the order transitions to `paid`. Null is valid (method not recorded).

**BR-POS-6.11** — **Cancel**: only a cashier can cancel their own pending
orders. Status must be `pending`. No reason required. Cancelled orders are
excluded from revenue reports.

**BR-POS-6.12** — **Pay**: only the creating cashier can pay their own pending
orders (shift must be active — BR-POS-1.5). Status must be `pending`.

**BR-POS-6.13** — **Void**: only an admin or a manager with access to the
order's branch can void a paid order. A `voidReason` (non-empty string) is
**required**. The void is audit-logged. Voided orders remain in the system for
the audit trail but are **excluded from revenue reports**. The cashier creates a
new correct order if needed.

---

## 7. Discounts

**BR-POS-7.1** — Discounts are per-order (not per-line-item).

**BR-POS-7.2** — Discount types: `percentage` (e.g., 10% off the subtotal) or
`fixed` (e.g., 100 KSh off the subtotal).

**BR-POS-7.3** — Admin sets a `maxDiscountPercent` on each cashier's user record
(e.g., 20.00 means up to 20% off). This field is **nullable** — if null or
absent, the cashier **cannot apply any discount**.

**BR-POS-7.4** — Validation:
- Percentage discount: `discountValue` must be `> 0` and
  `<= cashier.maxDiscountPercent`.
- Fixed discount: the effective percentage
  `(discountValue / subtotal × 100)` must be `<= cashier.maxDiscountPercent`.
  This prevents a fixed discount from exceeding the allowed ratio.
- `discountValue` must not exceed the `subtotal` (discount cannot make the total
  negative).

**BR-POS-7.5** — The `discountAmount` (in KSh) is computed and stored:
- Percentage: `subtotal × discountValue / 100`, rounded to 2 decimal places.
- Fixed: `discountValue` directly.

**BR-POS-7.6** — Discount fields on the order (`discountType`, `discountValue`,
`discountAmount`) are set at creation and immutable — they survive void (for
audit purposes).

---

## 8. Branch POS Toggle

**BR-POS-8.1** — Each branch has a `posEnabled` flag (default `false`).

**BR-POS-8.2** — When `posEnabled = true`:
- POS orders can be created at this branch.
- **New** manual daily sales entries (`DailySale`) are **blocked** for this
  branch (400: "This branch uses POS — daily sales are recorded automatically").
- Historical manual daily sales entries are **preserved** and continue appearing
  in reports for their respective dates.

**BR-POS-8.3** — When `posEnabled = false`:
- POS orders cannot be created at this branch.
- Manual daily sales entry works as before.

**BR-POS-8.4** — Only admins can toggle `posEnabled`.

**BR-POS-8.5** — For reporting:
- POS-enabled branch revenue = sum of `totalAmount` from paid (non-voided) POS
  orders.
- Non-POS branch revenue = sum of `totalAmount` from manual `DailySale` entries.
- Both are summed in the unified revenue reports.

---

## 9. Invoices

**BR-POS-9.1** — Every **paid** order can generate an invoice.

**BR-POS-9.2** — Invoice contents:
- Organization name
- Branch name and address
- Order number (formatted: `#0042`)
- Date and time of payment
- Line items: item name, size, toppings (if any), quantity, unit price,
  toppings price, line total
- Subtotal
- Discount (if any): type, value, amount
- **Total amount**
- Payment method (if recorded)
- Cashier name
- Footer: "Thank you for visiting Bubble Tea Palace!"

**BR-POS-9.3** — Invoices are generated **client-side** using the existing
`@react-pdf/renderer` dependency. The API provides all order data; the frontend
renders the PDF.

**BR-POS-9.4** — Invoice actions: **print** (browser print dialog) and
**share/download** (PDF file). Thermal printing is a future phase.

**BR-POS-9.5** — Voided orders display a "VOIDED" watermark on the invoice if
viewed after void.

---

## 10. POS Reports

**BR-POS-10.1** — **Revenue integration**: admin and manager dashboards include
POS revenue alongside manual daily sales. The total revenue for a date range
is the sum of both sources, per branch, without double-counting (BR-POS-8.5).

**BR-POS-10.2** — **Item-level sales report**: shows each menu item's total
quantity sold, revenue, and percentage of total revenue. Filterable by date
range, branch, and category.

**BR-POS-10.3** — **Cashier performance report**: shows each cashier's total
orders, revenue, average order value, total discount given, and voided order
count. Filterable by date range, branch, and cashier.

**BR-POS-10.4** — Reports exclude cancelled and voided orders from revenue
calculations. Voided orders may appear in their own section for audit purposes.

**BR-POS-10.5** — Reports respect role-based scoping: admin sees all branches,
manager sees assigned branches, cashier has no access to reports.

---

## 11. Page Access (extension of Phase 1)

**BR-POS-11.1** — Two new page keys added to the manager page registry:
- `pos` — POS transaction screen
- `menu` — Menu Items + Menu Categories + Toppings pages (single key covers all
  three)

**BR-POS-11.2** — For branch managers: `pos` and `menu` are enabled by default
(empty `disabledPages`). Admin can disable them per manager via the existing
`disabledPages` mechanism.

**BR-POS-11.3** — For cashiers: `pos` and `menu` pages are **always accessible**
regardless of `disabledPages`. The cashier role hardcodes access to these pages
plus their profile. No admin toggle is needed — if a cashier shouldn't access
POS, deactivate the user.

---

## 12. Audit

**BR-POS-12.1** — All POS mutations are audit-logged following the Phase 1
pattern: `POS_ORDER_CREATED`, `POS_ORDER_PAID`, `POS_ORDER_CANCELLED`,
`POS_ORDER_VOIDED`, `MENU_ITEM_CREATED`, `MENU_ITEM_UPDATED`, etc.

**BR-POS-12.2** — Void audit entries include the `voidReason` and the voiding
user's id in `metadata`.
