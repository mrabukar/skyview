# 04 — API Design (Phase 2 — POS Module)

All endpoints are prefixed with `/api`. Authentication is required on every
endpoint (Better-Auth session cookie). Multi-tenant scoping is automatic via
`TENANT_MODELS`. Pagination follows the Phase 1 pattern (`page`, `limit`,
response `meta: { total, page, limit, totalPages }`).

Role abbreviations: **A** = admin, **SA** = super_admin, **M** = branch_manager,
**C** = cashier.

---

## 1. Menu Categories

### `GET /api/menu-categories`

List all menu categories for the organization.

| | |
|---|---|
| **Roles** | A, SA, M, C |
| **Query** | `isActive?: boolean` — filter by active status (default: all) |
| **Response** | `{ data: MenuCategory[] }` |

Sorted by `sortOrder` asc, then `name` asc. Cashiers/managers only see active
categories.

### `POST /api/menu-categories`

Create a new menu category. Sets `createdById` to the caller.

| | |
|---|---|
| **Roles** | A, SA, M |
| **Body** | `{ name: string, description?: string, sortOrder?: number }` |
| **Response** | `201 { data: MenuCategory }` |
| **Errors** | 409 name already exists |

### `PATCH /api/menu-categories/:id`

Update a menu category. Managers can only edit categories they created.

| | |
|---|---|
| **Roles** | A, SA (any), M (own — `createdById` must match caller) |
| **Body** | `{ name?: string, description?: string, sortOrder?: number, isActive?: boolean }` |
| **Response** | `{ data: MenuCategory }` |
| **Errors** | 404 not found, 403 not the creator (manager), 409 name conflict |

### `DELETE /api/menu-categories/:id`

Delete a menu category (only if it has no items). Admin only.

| | |
|---|---|
| **Roles** | A, SA |
| **Response** | `204` |
| **Errors** | 404 not found, 409 has items — deactivate instead |

---

## 2. Menu Items

### `GET /api/menu-items`

List menu items with their size variants.

| | |
|---|---|
| **Roles** | A, SA, M, C |
| **Query** | `categoryId?: string`, `isActive?: boolean`, `search?: string` (name ILIKE) |
| **Response** | `{ data: MenuItem[], meta }` — each item includes `sizes: MenuItemSize[]` and `category: { id, name }` |

Paginated. Sorted by category `sortOrder`, then item `sortOrder`, then name.
Cashiers/managers see only active items in active categories.

### `GET /api/menu-items/:id`

Get a single menu item with sizes and branch configuration.

| | |
|---|---|
| **Roles** | A, SA, M, C |
| **Response** | `{ data: MenuItem }` — includes `sizes`, `category`, and for admins: `branchConfigs: [{ branchId, branchName, isEnabled, isInStock, prices: [{ sizeId, sizeName, branchPrice }] }]` |

### `POST /api/menu-items`

Create a menu item with its size variants. Sets `createdById` to the caller.
When a **manager** creates an item, a `BranchMenuItem` is auto-created for
each of the manager's assigned branches (enabled + in-stock).

| | |
|---|---|
| **Roles** | A, SA, M |
| **Body** | `{ categoryId: string, name: string, description?: string, sortOrder?: number, sizes: [{ name: string, basePrice: number, sortOrder?: number }] }` |
| **Validation** | At least one size required. Each size name unique within the item. Each `basePrice > 0`. |
| **Response** | `201 { data: MenuItem }` — includes created sizes |
| **Errors** | 409 name exists, 400 validation |

### `PATCH /api/menu-items/:id`

Update a menu item (not its sizes — see size endpoints below). Managers can
only edit items they created.

| | |
|---|---|
| **Roles** | A, SA (any), M (own — `createdById` must match caller) |
| **Body** | `{ categoryId?: string, name?: string, description?: string, sortOrder?: number, isActive?: boolean }` |
| **Response** | `{ data: MenuItem }` |
| **Errors** | 404, 403 not the creator (manager), 409 name conflict |

### `DELETE /api/menu-items/:id`

Delete a menu item (only if none of its sizes appear in order lines). Admin only.

| | |
|---|---|
| **Roles** | A, SA |
| **Response** | `204` |
| **Errors** | 404, 409 has orders — deactivate instead |

---

## 3. Menu Item Sizes

### `POST /api/menu-items/:menuItemId/sizes`

Add a size variant to a menu item. Managers can only add sizes to items they
created.

| | |
|---|---|
| **Roles** | A, SA (any item), M (own items only) |
| **Body** | `{ name: string, basePrice: number, sortOrder?: number }` |
| **Response** | `201 { data: MenuItemSize }` |
| **Errors** | 404 item not found, 403 not the item creator (manager), 409 size name exists on this item |

### `PATCH /api/menu-item-sizes/:id`

Update a size variant. Managers can only edit sizes on items they created.

| | |
|---|---|
| **Roles** | A, SA (any), M (own items only) |
| **Body** | `{ name?: string, basePrice?: number, sortOrder?: number, isActive?: boolean }` |
| **Response** | `{ data: MenuItemSize }` |
| **Errors** | 404, 403 not the item creator (manager), 409 name conflict |

### `DELETE /api/menu-item-sizes/:id`

Delete a size variant (only if not in any order lines). Admin only.

| | |
|---|---|
| **Roles** | A, SA |
| **Response** | `204` |
| **Errors** | 404, 409 has orders — deactivate instead |

---

## 4. Toppings

### `GET /api/toppings`

List all toppings for the organization.

| | |
|---|---|
| **Roles** | A, SA, M, C |
| **Query** | `isActive?: boolean` |
| **Response** | `{ data: Topping[] }` |

Sorted by `sortOrder` asc, then `name` asc.

### `POST /api/toppings`

Create a topping. Sets `createdById` to the caller.

| | |
|---|---|
| **Roles** | A, SA, M |
| **Body** | `{ name: string, price: number, sortOrder?: number }` |
| **Response** | `201 { data: Topping }` |
| **Errors** | 409 name exists |

### `PATCH /api/toppings/:id`

Update a topping. Managers can only edit toppings they created.

| | |
|---|---|
| **Roles** | A, SA (any), M (own — `createdById` must match caller) |
| **Body** | `{ name?: string, price?: number, sortOrder?: number, isActive?: boolean }` |
| **Response** | `{ data: Topping }` |
| **Errors** | 404, 403 not the creator (manager) |

### `DELETE /api/toppings/:id`

Delete (only if not in any order line toppings). Admin only.

| | |
|---|---|
| **Roles** | A, SA |
| **Response** | `204` |
| **Errors** | 404, 409 has orders — deactivate instead |

---

## 5. Branch Menu Configuration

### `GET /api/branches/:branchId/menu`

Full menu configuration for one branch: all items with availability, stock
status, and effective prices.

| | |
|---|---|
| **Roles** | A, SA, M (own branches), C (own branch) |
| **Response** | See shape below |

```json
{
  "data": [
    {
      "menuItemId": "clx...",
      "itemName": "Classic Milk Tea",
      "categoryId": "clx...",
      "categoryName": "Milk Teas",
      "description": "...",
      "imageKey": null,
      "isEnabled": true,
      "isInStock": true,
      "sizes": [
        {
          "sizeId": "clx...",
          "sizeName": "Small",
          "basePrice": 300,
          "branchPrice": 350,
          "effectivePrice": 350,
          "isActive": true
        },
        {
          "sizeId": "clx...",
          "sizeName": "Large",
          "basePrice": 500,
          "branchPrice": null,
          "effectivePrice": 500,
          "isActive": true
        }
      ]
    }
  ],
  "toppings": [
    {
      "toppingId": "clx...",
      "name": "Boba Pearls",
      "price": 50,
      "isInStock": true
    }
  ]
}
```

For POS display, the frontend filters to only show items/toppings where
`isEnabled`, `isInStock`, and `isActive` are all true.

### `PATCH /api/branches/:branchId/menu-items/:menuItemId`

Configure a menu item for a branch (enable/disable, stock toggle, pricing).

| | |
|---|---|
| **Roles (enable/disable, pricing)** | A, SA, M (own branches) |
| **Roles (stock toggle only)** | A, SA, M (own branches), C (own branch) |
| **Body** | `{ isEnabled?: boolean, isInStock?: boolean, prices?: [{ sizeId: string, price: number }] }` |
| **Response** | `{ data: BranchMenuItemConfig }` |
| **Errors** | 404 branch or item not found |

If no `BranchMenuItem` row exists, one is created (defaults: `isEnabled = true`,
`isInStock = true`). Price entries create/update `BranchMenuItemPrice` rows; to
revert to base price, omit the sizeId from the prices array or pass
`price: null`.

### `POST /api/branches/:branchId/menu-items/bulk`

Bulk-enable multiple menu items for a branch (initial setup convenience).

| | |
|---|---|
| **Roles** | A, SA |
| **Body** | `{ menuItemIds: string[], prices?: [{ menuItemId: string, sizeId: string, price: number }] }` |
| **Response** | `{ data: { configured: number } }` |

Creates `BranchMenuItem` rows for each item (idempotent — skips existing). Sets
prices if provided.

### `PATCH /api/branches/:branchId/toppings/:toppingId`

Toggle topping stock status at a branch.

| | |
|---|---|
| **Roles** | A, SA, M (own branches), C (own branch) |
| **Body** | `{ isInStock: boolean }` |
| **Response** | `{ data: { toppingId, isInStock } }` |

Creates a `BranchTopping` row if none exists; updates if one does.

---

## 6. POS Orders

### `POST /api/pos/orders`

Create a new POS order with line items. Status defaults to `pending`.

| | |
|---|---|
| **Roles** | C (shift must be active) |
| **Body** | See below |
| **Response** | `201 { data: PosOrder }` — full order with lines, toppings, computed totals |
| **Errors** | 403 shift not active, 400 validation, 404 item/size/topping not found or not available |

```json
{
  "lines": [
    {
      "menuItemSizeId": "clx...",
      "quantity": 2,
      "toppingIds": ["clx...", "clx..."]
    },
    {
      "menuItemSizeId": "clx...",
      "quantity": 1,
      "toppingIds": []
    }
  ],
  "discountType": "percentage",
  "discountValue": 10
}
```

**Server processing:**
1. Validate cashier is on shift (BR-POS-1.5).
2. Validate at least one line.
3. For each line: validate `menuItemSizeId` is active, enabled, and in-stock at
   the cashier's branch. Validate each `toppingId` is active and in-stock.
4. If discount provided: validate cashier's `maxDiscountPercent` allows it
   (BR-POS-7.4).
5. Snapshot prices: look up effective branch price for each size, topping prices.
6. Compute line totals, subtotal, discount amount, total amount.
7. Atomically: increment `Branch.nextPosOrderNumber`, assign to order.
8. Create `PosOrder` + `OrderLine[]` + `OrderLineTopping[]` in one transaction.
9. Audit log: `POS_ORDER_CREATED`.

### `GET /api/pos/orders`

List POS orders.

| | |
|---|---|
| **Roles** | A, SA (all branches), M (own branches), C (own branch, today only) |
| **Query** | `branchId?: string`, `status?: OrderStatus`, `cashierId?: string`, `from?: date`, `to?: date`, `page`, `limit` |
| **Response** | `{ data: PosOrder[], meta }` |

Sorted by `createdAt` desc. Each order includes summary fields (no lines unless
requesting detail). Cashiers default to their branch + today.

### `GET /api/pos/orders/:id`

Get full order detail including lines and toppings.

| | |
|---|---|
| **Roles** | A, SA, M (own branches), C (own branch) |
| **Response** | `{ data: PosOrder }` — includes `lines[].toppings[]`, computed totals, cashier name, void info if applicable |

### `PATCH /api/pos/orders/:id/pay`

Mark a pending order as paid.

| | |
|---|---|
| **Roles** | C (own order, shift must be active) |
| **Body** | `{ paymentMethod?: "cash" | "mpesa" | "card" }` |
| **Response** | `{ data: PosOrder }` |
| **Errors** | 403 shift not active / not your order, 400 status not pending |

Audit log: `POS_ORDER_PAID`.

### `PATCH /api/pos/orders/:id/cancel`

Cancel a pending order.

| | |
|---|---|
| **Roles** | C (own order) |
| **Response** | `{ data: PosOrder }` |
| **Errors** | 403 not your order, 400 status not pending |

Audit log: `POS_ORDER_CANCELLED`.

### `PATCH /api/pos/orders/:id/void`

Void a paid order (admin/manager only).

| | |
|---|---|
| **Roles** | A, SA, M (own branches) |
| **Body** | `{ reason: string }` — non-empty, required |
| **Response** | `{ data: PosOrder }` |
| **Errors** | 400 status not paid / reason empty, 403 not authorized for this branch |

Sets `status = voided`, `voidedById`, `voidReason`, `voidedAt`. Audit log:
`POS_ORDER_VOIDED` with reason in metadata.

---

## 7. POS Reports

### `GET /api/reports/pos-summary`

POS revenue summary — totals, order count, average order value, breakdowns.

| | |
|---|---|
| **Roles** | A, SA, M (own branches) |
| **Query** | `from: date` (required), `to: date` (required), `branchId?: string` |
| **Response** | See below |

```json
{
  "totalRevenue": 500000,
  "totalOrders": 450,
  "avgOrderValue": 1111.11,
  "totalDiscount": 25000,
  "byBranch": [
    {
      "branchId": "clx...",
      "branchName": "Hub Mall Karen",
      "revenue": 150000,
      "orders": 130,
      "avgOrderValue": 1153.85
    }
  ],
  "byPaymentMethod": [
    { "method": "cash", "revenue": 200000, "count": 180 },
    { "method": "mpesa", "revenue": 250000, "count": 220 },
    { "method": null, "revenue": 50000, "count": 50 }
  ],
  "byDay": [
    { "date": "2026-08-20", "revenue": 25000, "orders": 22 }
  ]
}
```

Only includes `paid` orders (excludes `pending`, `cancelled`, `voided`).

### `GET /api/reports/pos-items`

Item-level sales report.

| | |
|---|---|
| **Roles** | A, SA, M (own branches) |
| **Query** | `from: date`, `to: date`, `branchId?: string`, `categoryId?: string` |
| **Response** | See below |

```json
{
  "data": [
    {
      "menuItemId": "clx...",
      "itemName": "Classic Milk Tea",
      "categoryName": "Milk Teas",
      "quantitySold": 120,
      "revenue": 60000,
      "percentOfTotal": 15.5,
      "topSize": "Large",
      "topToppings": ["Boba Pearls", "Coconut Jelly"]
    }
  ],
  "totalQuantity": 780,
  "totalRevenue": 387000
}
```

Uses snapshot `itemName` from order lines (not current item name) for accuracy.
Sorted by revenue desc.

### `GET /api/reports/pos-cashier-performance`

Cashier performance report.

| | |
|---|---|
| **Roles** | A, SA, M (own branches) |
| **Query** | `from: date`, `to: date`, `branchId?: string`, `cashierId?: string` |
| **Response** | See below |

```json
{
  "data": [
    {
      "cashierId": "clx...",
      "cashierName": "Ali",
      "branchName": "Hub Mall Karen",
      "totalOrders": 85,
      "totalRevenue": 95000,
      "avgOrderValue": 1117.65,
      "totalDiscountGiven": 5000,
      "voidedOrders": 1,
      "cancelledOrders": 3
    }
  ]
}
```

---

## 8. Modified Existing Endpoints

### `POST /api/daily-sales` (modified)

Before creating a manual daily sale, check the branch's `posEnabled` flag. If
`true`, reject with 400:

```json
{ "message": "This branch uses POS — daily sales are recorded automatically" }
```

Historical daily sales are unaffected (read endpoints unchanged).

### `GET /api/reports/dashboard` / `GET /api/reports/manager-dashboard` (modified)

Revenue calculations include POS data:
- For branches with `posEnabled = true`: revenue = sum of `PosOrder.totalAmount`
  where `status = paid` (not voided).
- For branches with `posEnabled = false`: revenue = sum of `DailySale.totalAmount`
  (unchanged).
- Both are summed for total org revenue.

### `PATCH /api/branches/:id` (modified)

Accept `posEnabled` field (admin only). When toggling to `true`, no special
migration needed — POS is simply unlocked. When toggling to `false`, existing
POS orders are preserved (historical); manual daily sales entry is re-enabled
going forward.

### `POST /api/users` / `PATCH /api/users/:id` (modified)

Accept cashier-specific fields when `role = cashier`:
- `shiftDays: string[]` — required, 1–7 valid day names
- `shiftStartTime: string` — required, HH:mm format
- `shiftEndTime: string` — required, HH:mm format, must be > shiftStartTime
- `maxDiscountPercent?: number` — 0.00–100.00, nullable
- `branchId: string` — required (single branch, not multi-branch)

These fields are ignored/cleared for non-cashier roles.

### Auth sign-in hook (modified)

Add a `before` hook on Better-Auth sign-in:
1. Look up the user.
2. If `role = cashier`:
   a. Check current day (Africa/Nairobi) is in `shiftDays` → reject if not.
   b. Check current time (Africa/Nairobi) is between `shiftStartTime` and
      `shiftEndTime` → reject if not.
3. Non-cashier roles: no shift check.

### Page registry (modified)

Add to `MANAGER_PAGES` in `api/src/common/page-access/pages.ts`:

```typescript
export const MANAGER_PAGES = [
  "dashboard",
  "sales",
  "purchases",
  "expenses",
  "vendors",
  "receipts",
  "pos",    // NEW
  "menu",   // NEW — covers menu items + categories + toppings
] as const;
```

---

## 9. Error Codes Summary

| Code | Meaning |
|---|---|
| 400 | Validation error (missing fields, invalid values, wrong status transition, POS-enabled branch blocking manual sales) |
| 403 | Shift not active, branch access denied, role not allowed, discount exceeds max |
| 404 | Entity not found |
| 409 | Unique constraint conflict (name exists), deletion blocked (has dependents) |
