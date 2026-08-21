# Phase 2 API Reference — POS Module

> **Base URL:** `http://localhost:4000/api` (dev) · `https://<domain>/api` (prod)  
> **Auth:** Better-Auth session cookie — all requests need `credentials: "include"`.  
> **Content-Type:** `application/json` for all request bodies.

All amounts are in **Kenyan Shillings (KSh)**. Decimal fields are returned as
`string` from the API (Prisma `Decimal` → JSON). Parse with `Number()` before
arithmetic.

---

## Table of Contents

1. [Auth & Session (modified)](#1-auth--session)
2. [Users (modified)](#2-users)
3. [Branches (modified)](#3-branches)
4. [Menu Categories](#4-menu-categories)
5. [Menu Items](#5-menu-items)
6. [Toppings](#6-toppings)
7. [Branch Menu Configuration](#7-branch-menu-configuration)
8. [POS Orders](#8-pos-orders)
9. [POS Reports](#9-pos-reports)
10. [Daily Sales (modified)](#10-daily-sales)
11. [Error Reference](#11-error-reference)

---

## 1. Auth & Session

### `POST /api/auth/sign-in/email`

Sign in with email + password. Returns a session cookie.

**Cashier sign-in restriction (BR-POS-1.4):** If the user is a cashier and
their current time is outside their shift window (Africa/Nairobi), sign-in
is rejected with 401.

**Request body:**
```json
{
  "email": "ali@bubbleteapalace.co.ke",
  "password": "s3cur3p@ssw0rd"
}
```

**Success `200`:**
```json
{
  "user": {
    "id": "clv_user123",
    "name": "Ali Hassan",
    "email": "ali@bubbleteapalace.co.ke",
    "role": "cashier"
  },
  "session": { "id": "sess_abc", "expiresAt": "2026-09-20T09:30:00.000Z" }
}
```

**Error `401` (cashier off shift):**
```json
{
  "statusCode": 401,
  "message": "Your shift has not started. Shift: monday, wednesday, friday 07:00–20:00"
}
```

---

### `GET /api/auth/session/me`

Returns the current session user. **Phase 2 additions:** cashier sessions now
include shift information and an `onShift` flag.

**Response `200`:**
```json
{
  "id": "clv_user123",
  "name": "Ali Hassan",
  "email": "ali@bubbleteapalace.co.ke",
  "role": "cashier",
  "branchId": "branch_westlands",
  "organizationId": "org_btp01",
  "isActive": true,
  "phone": "+254700000001",

  // Cashier-only fields (null for other roles)
  "shiftDays": ["monday", "tuesday", "wednesday", "thursday", "friday"],
  "shiftStartTime": "07:00",
  "shiftEndTime": "20:00",
  "maxDiscountPercent": "10.00",
  "onShift": true
}
```

> `onShift` is computed server-side in Africa/Nairobi timezone at request
> time. The client can trust this value without re-computing it. For non-cashier
> roles, `onShift` is `null`.

---

## 2. Users

### `POST /api/users`  *(modified — now accepts cashier fields)*

Admin-only. Creates a new user. When `role: "cashier"`, the cashier-specific
fields below become **required**.

**Roles:** `admin`

**Request body:**
```json
{
  "name": "Amina Said",
  "email": "amina@bubbleteapalace.co.ke",
  "password": "initialPass123",
  "role": "cashier",

  // Required for cashier
  "branchId": "branch_westlands",
  "shiftDays": ["monday", "tuesday", "wednesday", "thursday", "friday"],
  "shiftStartTime": "07:00",
  "shiftEndTime": "20:00",
  "maxDiscountPercent": 10,

  // Optional for all roles
  "phone": "+254700000002",
  "salary": 25000
}
```

**Cashier field validation:**
- `branchId` — required for cashier; must be an existing active branch
- `shiftDays` — at least one day; valid values: `"monday"` `"tuesday"` `"wednesday"` `"thursday"` `"friday"` `"saturday"` `"sunday"`
- `shiftStartTime` — `HH:mm` format, e.g. `"07:00"`
- `shiftEndTime` — `HH:mm` format; must be after `shiftStartTime` (no overnight shifts)
- `maxDiscountPercent` — `0`–`100`; `0` or omitted = cashier cannot apply discounts

**Branch manager fields (not for cashier):**
- `branchIds` — array of branch IDs for multi-branch managers
- `disabledPages` — array of page keys to hide

**Success `201`:** Returns the created user object (same shape as `/me`).

---

### `PATCH /api/users/:id`  *(modified — same cashier fields accepted)*

Admin-only. All fields are optional. Same cashier field rules as `POST`.

**Request body (example — update shift):**
```json
{
  "shiftDays": ["monday", "wednesday", "friday"],
  "shiftStartTime": "08:00",
  "shiftEndTime": "18:00",
  "maxDiscountPercent": 5
}
```

**Success `200`:** Returns the updated user object.

---

## 3. Branches

### `PATCH /api/branches/:id`  *(modified — now accepts `posEnabled`)*

Admin-only. Update a branch. New field: `posEnabled`.

**Roles:** `admin`

**Request body:**
```json
{
  "posEnabled": true
}
```

> **Warning:** Once `posEnabled` is set to `true`, new manual daily sales
> entries are blocked for this branch (BR-POS-8.2). Historical entries are
> preserved. This cannot be undone without setting `posEnabled: false`.

**Field definitions:**
| Field | Type | Notes |
|---|---|---|
| `name` | string (optional) | Max 120 chars; must be unique |
| `address` | string (optional) | Max 255 chars |
| `posEnabled` | boolean (optional) | `true` enables POS mode for this branch |

**Success `200`:** Returns the updated branch object.

```json
{
  "id": "branch_westlands",
  "name": "Westlands",
  "address": "Sarit Centre, Westlands, Nairobi",
  "isActive": true,
  "posEnabled": true,
  "nextPosOrderNumber": 1,
  "organizationId": "org_btp01",
  "createdAt": "2026-01-15T08:00:00.000Z",
  "updatedAt": "2026-08-20T09:00:00.000Z"
}
```

---

## 4. Menu Categories

### `GET /api/menu-categories`

List all menu categories. Non-admins always see active categories only.

**Roles:** `admin`, `branch_manager`, `cashier`  
**Page guard:** `menu`

**Query params:**
| Param | Type | Default | Notes |
|---|---|---|---|
| `isActive` | boolean | `true` | Admin only: pass `false` to include inactive |

> No pagination — returns a flat array ordered by `sortOrder ASC`, `name ASC`.

**Response `200`:**
```json
[
  {
    "id": "cat_fruits",
    "name": "Fruit Teas",
    "description": "Fresh fruit-based teas with real fruit pieces",
    "sortOrder": 1,
    "isActive": true,
    "createdById": "user_admin01",
    "createdBy": { "id": "user_admin01", "name": "Sarah Admin" },
    "createdAt": "2026-01-20T08:00:00.000Z",
    "updatedAt": "2026-01-20T08:00:00.000Z",
    "_count": { "items": 8 }
  },
  {
    "id": "cat_milk",
    "name": "Milk Teas",
    "description": "Classic milk teas with various base options",
    "sortOrder": 2,
    "isActive": true,
    "createdById": "user_admin01",
    "createdBy": { "id": "user_admin01", "name": "Sarah Admin" },
    "createdAt": "2026-01-20T08:00:00.000Z",
    "updatedAt": "2026-01-20T08:00:00.000Z",
    "_count": { "items": 12 }
  }
]
```

---

### `GET /api/menu-categories/:id`

Get a single category.

**Roles:** `admin`, `branch_manager`, `cashier`

**Response `200`:** Same shape as a single item from the list above.

**Error `404`:**
```json
{ "statusCode": 404, "message": "Menu category \"cat_xyz\" not found" }
```

---

### `POST /api/menu-categories`

Create a category.

**Roles:** `admin`, `branch_manager`  
**Manager restriction:** Managers can only edit categories they created (BR-POS-2.3).

**Request body:**
```json
{
  "name": "Smoothies",
  "description": "Blended fruit and yogurt smoothies",
  "sortOrder": 5
}
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `name` | string | Yes | Max 120 chars; must be unique (case-insensitive) |
| `description` | string | No | Max 255 chars |
| `sortOrder` | integer | No | Default `0`; lower = earlier in list |

**Success `201`:** Returns the created category.

**Error `409`:**
```json
{ "statusCode": 409, "message": "A menu category named \"Smoothies\" already exists" }
```

---

### `PATCH /api/menu-categories/:id`

Update a category. Managers can only update categories they created.

**Roles:** `admin`, `branch_manager`

**Request body (all fields optional):**
```json
{
  "name": "Smoothies & Shakes",
  "description": "Updated description",
  "sortOrder": 4,
  "isActive": false
}
```

> To deactivate a category without deleting it (manager pattern), send `{ "isActive": false }`.
> Deactivating a category also hides all its items from cashiers.

**Success `200`:** Returns the updated category.

---

### `DELETE /api/menu-categories/:id`

Hard-delete a category. Only possible when the category has no items.

**Roles:** `admin` only

**Success `204`:** No body.

**Error `409`:**
```json
{
  "statusCode": 409,
  "message": "This category has menu items and cannot be deleted. Deactivate it instead."
}
```

---

## 5. Menu Items

### `GET /api/menu-items`

List menu items (paginated). Non-admins see active items in active categories only.

**Roles:** `admin`, `branch_manager`, `cashier`  
**Page guard:** `menu`

**Query params:**
| Param | Type | Default | Notes |
|---|---|---|---|
| `page` | integer | `1` | |
| `limit` | integer | `20` | Max `100` |
| `categoryId` | string | — | Filter by category ID |
| `search` | string | — | Case-insensitive name search |
| `isActive` | boolean | `true` | Admin only: pass `false` to include inactive |

**Response `200`:**
```json
{
  "data": [
    {
      "id": "item_taro",
      "name": "Taro Milk Tea",
      "description": "Creamy taro flavoured milk tea",
      "imageKey": null,
      "sortOrder": 1,
      "isActive": true,
      "categoryId": "cat_milk",
      "category": { "id": "cat_milk", "name": "Milk Teas" },
      "createdById": "user_admin01",
      "createdBy": { "id": "user_admin01", "name": "Sarah Admin" },
      "createdAt": "2026-01-20T09:00:00.000Z",
      "updatedAt": "2026-01-20T09:00:00.000Z",
      "sizes": [
        {
          "id": "size_taro_reg",
          "name": "Regular",
          "basePrice": "320.00",
          "sortOrder": 1,
          "isActive": true,
          "createdAt": "2026-01-20T09:00:00.000Z",
          "updatedAt": "2026-01-20T09:00:00.000Z"
        },
        {
          "id": "size_taro_large",
          "name": "Large",
          "basePrice": "400.00",
          "sortOrder": 2,
          "isActive": true,
          "createdAt": "2026-01-20T09:00:00.000Z",
          "updatedAt": "2026-01-20T09:00:00.000Z"
        }
      ],
      "_count": { "orderLines": 142 }
    }
  ],
  "meta": { "total": 24, "page": 1, "limit": 20, "totalPages": 2 }
}
```

---

### `GET /api/menu-items/:id`

Get a single menu item with all sizes.

**Roles:** `admin`, `branch_manager`, `cashier`

**Response `200`:** Same shape as a single item from the list.

---

### `POST /api/menu-items`

Create a menu item with at least one size. When a branch_manager creates an
item, it is automatically enabled at all their assigned branches (BR-POS-3.6).

**Roles:** `admin`, `branch_manager`

**Request body:**
```json
{
  "categoryId": "cat_milk",
  "name": "Brown Sugar Milk Tea",
  "description": "Signature tiger-stripe brown sugar milk tea",
  "sortOrder": 5,
  "sizes": [
    { "name": "Regular", "basePrice": 350, "sortOrder": 1 },
    { "name": "Large",   "basePrice": 430, "sortOrder": 2 }
  ]
}
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `categoryId` | string | Yes | Must be an existing active category |
| `name` | string | Yes | Max 200 chars; unique (case-insensitive) |
| `description` | string | No | Max 500 chars |
| `sortOrder` | integer | No | Default `0` |
| `sizes` | array | Yes | At least 1 element |
| `sizes[].name` | string | Yes | Max 60 chars; unique within item |
| `sizes[].basePrice` | number | Yes | Min `0.01`; max 2 decimal places |
| `sizes[].sortOrder` | integer | No | Default `0` |

**Success `201`:** Returns the created item with all sizes.

**Error `409` (duplicate name):**
```json
{ "statusCode": 409, "message": "A menu item named \"Brown Sugar Milk Tea\" already exists" }
```

---

### `PATCH /api/menu-items/:id`

Update a menu item. Managers can only edit items they created (BR-POS-3.5).

**Roles:** `admin`, `branch_manager`

**Request body (all fields optional):**
```json
{
  "name": "Brown Sugar Tiger Milk Tea",
  "categoryId": "cat_milk",
  "description": "New description",
  "sortOrder": 3,
  "isActive": false
}
```

> To deactivate an item, send `{ "isActive": false }`. This hides it from
> cashiers immediately. Historical order lines are not affected.

**Success `200`:** Returns the updated item.

---

### `DELETE /api/menu-items/:id`

Hard-delete a menu item. Fails if the item has been used in any order lines.

**Roles:** `admin` only

**Success `204`:** No body.

**Error `409`:**
```json
{
  "statusCode": 409,
  "message": "This item is referenced by 142 order line(s) and cannot be deleted. Deactivate it instead."
}
```

---

### `POST /api/menu-items/:id/sizes`

Add a new size to an existing item.

**Roles:** `admin`, `branch_manager`

**Request body:**
```json
{
  "name": "Extra Large",
  "basePrice": 480,
  "sortOrder": 3
}
```

**Success `201`:** Returns the **full menu item** (with all sizes, including new one).

**Error `409` (duplicate size name):**
```json
{ "statusCode": 409, "message": "A size named \"Extra Large\" already exists on this item" }
```

---

### `PATCH /api/menu-items/:id/sizes/:sizeId`

Update a size. The `:id` segment is for URL semantics — the service resolves
the item from the sizeId.

**Roles:** `admin`, `branch_manager`

**Request body (all optional):**
```json
{
  "name": "XL",
  "basePrice": 490,
  "sortOrder": 3,
  "isActive": false
}
```

> To deactivate a size: `{ "isActive": false }`. There must always be at
> least one **active** size on an item — deactivating the last one returns 409.

**Success `200`:** Returns the **full menu item** (with all sizes).

**Error `409` (last active size):**
```json
{
  "statusCode": 409,
  "message": "Cannot deactivate or remove the last active size. Deactivate the item instead."
}
```

---

### `DELETE /api/menu-items/:id/sizes/:sizeId`

Hard-delete a size. Fails if it has been used in order lines or is the last active size.

**Roles:** `admin` only

**Success `204`:** No body.

---

## 6. Toppings

### `GET /api/toppings`

List all toppings. Non-admins see active toppings only.

**Roles:** `admin`, `branch_manager`, `cashier`  
**Page guard:** `menu`

**Query params:**
| Param | Type | Default | Notes |
|---|---|---|---|
| `isActive` | boolean | `true` | Admin only: pass `false` to include inactive |

> No pagination — returns a flat array ordered by `sortOrder ASC`, `name ASC`.

**Response `200`:**
```json
[
  {
    "id": "top_pearls",
    "name": "Tapioca Pearls",
    "price": "20.00",
    "sortOrder": 1,
    "isActive": true,
    "createdById": "user_admin01",
    "createdBy": { "id": "user_admin01", "name": "Sarah Admin" },
    "createdAt": "2026-01-20T10:00:00.000Z",
    "updatedAt": "2026-01-20T10:00:00.000Z",
    "_count": { "orderLineToppings": 89 }
  },
  {
    "id": "top_jelly",
    "name": "Coconut Jelly",
    "price": "20.00",
    "sortOrder": 2,
    "isActive": true,
    "createdById": "user_admin01",
    "createdBy": { "id": "user_admin01", "name": "Sarah Admin" },
    "createdAt": "2026-01-20T10:00:00.000Z",
    "updatedAt": "2026-01-20T10:00:00.000Z",
    "_count": { "orderLineToppings": 54 }
  }
]
```

---

### `GET /api/toppings/:id`

Get a single topping.

**Roles:** `admin`, `branch_manager`, `cashier`

**Response `200`:** Same shape as a single item from the list.

---

### `POST /api/toppings`

Create a topping.

**Roles:** `admin`

**Request body:**
```json
{
  "name": "Grass Jelly",
  "price": 25,
  "sortOrder": 3
}
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `name` | string | Yes | Max 120 chars; unique (case-insensitive) |
| `price` | number | Yes | Min `0`; max 2 dp (free toppings allowed: `0`) |
| `sortOrder` | integer | No | Default `0` |

**Success `201`:** Returns the created topping.

---

### `PATCH /api/toppings/:id`

Update a topping.

**Roles:** `admin`

**Request body (all optional):**
```json
{
  "name": "Black Grass Jelly",
  "price": 30,
  "isActive": false
}
```

**Success `200`:** Returns the updated topping.

---

### `DELETE /api/toppings/:id`

Hard-delete if never used in orders; soft-deactivate if the topping appears in
past orders (preserves historical data).

**Roles:** `admin`

**Success `200`:** *(Note: 200, not 204 — response body indicates the action taken)*
```json
{ "id": "top_jelly", "action": "deleted" }
```
— or —
```json
{ "id": "top_jelly", "action": "deactivated" }
```

> `"deactivated"` means the topping was not deleted because it exists in order
> history. The topping is marked `isActive: false` instead. Show a toast:
> *"Topping deactivated — it still appears in past orders."*

---

## 7. Branch Menu Configuration

All routes under `/api/branches/:branchId/...`. The `:branchId` refers to the
branch being configured. Access is enforced:
- Admin: any branch
- Manager: own assigned branches only
- Cashier: own branch only (stock toggle limited)

**Page guard:** `menu` (all endpoints in this group)

---

### `GET /api/branches/:branchId/menu`

Full menu configuration for one branch: all active items with their
availability, stock status, and effective prices.

**Roles:** `admin`, `branch_manager`, `cashier`

> **Cashier view:** Only items that are `isEnabled=true` AND `isInStock=true`
> are returned. This is the primary data source for the POS screen.
> Only in-stock toppings are included for cashiers.

**Response `200`:**
```json
{
  "data": [
    {
      "menuItemId": "item_taro",
      "itemName": "Taro Milk Tea",
      "categoryId": "cat_milk",
      "categoryName": "Milk Teas",
      "description": "Creamy taro flavoured milk tea",
      "imageKey": null,
      "sortOrder": 1,
      "isEnabled": true,
      "isInStock": true,
      "sizes": [
        {
          "sizeId": "size_taro_reg",
          "sizeName": "Regular",
          "basePrice": "320.00",
          "branchPrice": "300.00",
          "effectivePrice": "300.00",
          "isActive": true
        },
        {
          "sizeId": "size_taro_large",
          "sizeName": "Large",
          "basePrice": "400.00",
          "branchPrice": null,
          "effectivePrice": "400.00",
          "isActive": true
        }
      ]
    },
    {
      "menuItemId": "item_mango",
      "itemName": "Mango Fruit Tea",
      "categoryId": "cat_fruits",
      "categoryName": "Fruit Teas",
      "description": null,
      "imageKey": null,
      "sortOrder": 1,
      "isEnabled": true,
      "isInStock": false,
      "sizes": [
        {
          "sizeId": "size_mango_reg",
          "sizeName": "Regular",
          "basePrice": "280.00",
          "branchPrice": null,
          "effectivePrice": "280.00",
          "isActive": true
        }
      ]
    }
  ],
  "toppings": [
    {
      "toppingId": "top_pearls",
      "name": "Tapioca Pearls",
      "price": "20.00",
      "sortOrder": 1,
      "isInStock": true
    },
    {
      "toppingId": "top_jelly",
      "name": "Coconut Jelly",
      "price": "20.00",
      "sortOrder": 2,
      "isInStock": false
    }
  ]
}
```

**Key fields:**
- `effectivePrice` — use this for all price displays and order calculations. It is `branchPrice` if one is set, otherwise `basePrice`.
- `isEnabled` — the item is offered at this branch at all
- `isInStock` — the item is physically available right now
- Cashiers only receive items where both `isEnabled=true` AND `isInStock=true`

---

### `PATCH /api/branches/:branchId/menu-items/:menuItemId`

Configure one item's availability and pricing at a branch.

**Roles:** `admin`, `branch_manager` (full), `cashier` (isInStock only)

**Request body:**
```json
{
  "isEnabled": true,
  "isInStock": true,
  "prices": [
    { "sizeId": "size_taro_reg",   "price": 300 },
    { "sizeId": "size_taro_large", "price": null }
  ]
}
```

| Field | Type | Required | Roles | Notes |
|---|---|---|---|---|
| `isEnabled` | boolean | No | admin, manager | Enables/disables the item at this branch |
| `isInStock` | boolean | No | admin, manager, cashier | In/out of stock right now |
| `prices` | array | No | admin, manager | Per-size price overrides |
| `prices[].sizeId` | string | Yes (in array) | | Must belong to this item |
| `prices[].price` | number\|null | Yes (in array) | | `null` reverts to base price |

**Cashier restriction:** Sending `isEnabled` or `prices` as a cashier returns 403.

**Success `200`:** Returns the updated `BranchMenuItemConfig` (same shape as
one element of `GET /branches/:branchId/menu` → `data` array).

**Error `403` (cashier tries to set isEnabled):**
```json
{ "statusCode": 403, "message": "Cashiers can only toggle stock status (isInStock)" }
```

---

### `POST /api/branches/:branchId/menu-items/bulk`

Bulk-enable multiple items at a branch. Idempotent — existing rows are skipped.
Used during initial branch setup to activate all or many menu items at once.

**Roles:** `admin` only

**Request body:**
```json
{
  "menuItemIds": ["item_taro", "item_mango", "item_brown_sugar"],
  "prices": [
    { "menuItemId": "item_taro", "sizeId": "size_taro_reg",   "price": 300 },
    { "menuItemId": "item_taro", "sizeId": "size_taro_large", "price": 390 }
  ]
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `menuItemIds` | string[] | Yes | At least 1; all must be valid item IDs |
| `prices` | array | No | Optional per-size price overrides set in the same operation |

**Success `200`:**
```json
{ "enabled": 3, "pricesSet": 2 }
```

---

### `PATCH /api/branches/:branchId/toppings/:toppingId`

Set whether a topping is in stock at a branch. No BranchTopping row = in stock
by default. This endpoint creates or updates the record.

**Roles:** `admin`, `branch_manager`, `cashier`

**Request body:**
```json
{ "isInStock": false }
```

**Success `200`:**
```json
{
  "toppingId": "top_jelly",
  "branchId": "branch_westlands",
  "isInStock": false
}
```

---

## 8. POS Orders

**Page guard:** `pos` (all endpoints in this group)

---

### `POST /api/pos/orders`

Create a new POS order. The order starts in `pending` status.
Call `PATCH /:id/pay` to complete payment.

**Roles:** `cashier` only  
**Shift guard:** Cashier must be on shift — returns `403` if off shift.

The cashier's `branchId` is used automatically from the session.
No `branchId` field in the request body.

**Request body:**
```json
{
  "lines": [
    {
      "menuItemSizeId": "size_taro_large",
      "quantity": 1,
      "toppingIds": ["top_pearls", "top_jelly"]
    },
    {
      "menuItemSizeId": "size_mango_reg",
      "quantity": 2,
      "toppingIds": []
    }
  ],
  "discountType": "percentage",
  "discountValue": 10
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `lines` | array | Yes | At least 1 line |
| `lines[].menuItemSizeId` | string | Yes | Must be active, enabled, and in stock at the cashier's branch |
| `lines[].quantity` | integer | Yes | Min `1` |
| `lines[].toppingIds` | string[] | No | All must be active and in stock at the branch |
| `discountType` | `"percentage"` \| `"fixed"` | No | Must be paired with `discountValue` |
| `discountValue` | number | No | Percentage (0–100) or fixed KSh amount; must be paired with `discountType` |

**Discount rules (BR-POS-7):**
- `discountType` and `discountValue` must be provided together or both omitted
- For `percentage`: `discountValue` ≤ cashier's `maxDiscountPercent`
- For `fixed`: `(discountValue / subtotal) × 100` ≤ cashier's `maxDiscountPercent`
- `discountAmount` cannot exceed the order subtotal

**Price computation:**
```
effectivePrice = branchPrice ?? basePrice (per size)
toppingsUnitCost = sum(topping.price) per line
toppingsTotal = toppingsUnitCost × quantity (per line)
lineTotal = (effectivePrice × quantity) + toppingsTotal
subtotal = sum(lineTotal)
discountAmount = (subtotal × discountValue/100)  [percentage]
              | discountValue                     [fixed]
totalAmount = subtotal − discountAmount
```

**Success `201`:**
```json
{
  "id": "order_abc123",
  "orderNumber": 42,
  "status": "pending",
  "paymentMethod": null,
  "subtotal": "910.00",
  "discountType": "percentage",
  "discountValue": "10.00",
  "discountAmount": "91.00",
  "totalAmount": "819.00",
  "branchId": "branch_westlands",
  "branch": { "id": "branch_westlands", "name": "Westlands" },
  "cashierId": "user_amina",
  "cashier": { "id": "user_amina", "name": "Amina Said" },
  "voidedById": null,
  "voidedBy": null,
  "voidReason": null,
  "voidedAt": null,
  "createdAt": "2026-08-20T09:35:00.000Z",
  "updatedAt": "2026-08-20T09:35:00.000Z",
  "lines": [
    {
      "id": "line_001",
      "menuItemId": "item_taro",
      "menuItemSizeId": "size_taro_large",
      "itemName": "Taro Milk Tea",
      "sizeName": "Large",
      "unitPrice": "390.00",
      "quantity": 1,
      "toppingsTotal": "40.00",
      "lineTotal": "430.00",
      "toppings": [
        { "id": "olt_001", "toppingId": "top_pearls", "toppingName": "Tapioca Pearls", "price": "20.00" },
        { "id": "olt_002", "toppingId": "top_jelly",  "toppingName": "Coconut Jelly",  "price": "20.00" }
      ]
    },
    {
      "id": "line_002",
      "menuItemId": "item_mango",
      "menuItemSizeId": "size_mango_reg",
      "itemName": "Mango Fruit Tea",
      "sizeName": "Regular",
      "unitPrice": "280.00",
      "quantity": 2,
      "toppingsTotal": "0.00",
      "lineTotal": "560.00",
      "toppings": []
    }
  ]
}
```

**Error `400` — item not available:**
```json
{ "statusCode": 400, "message": "\"Taro Milk Tea\" is not available at this branch" }
```

**Error `400` — out of stock:**
```json
{ "statusCode": 400, "message": "\"Taro Milk Tea\" is currently out of stock" }
```

**Error `403` — discount exceeds limit:**
```json
{ "statusCode": 403, "message": "Discount exceeds your maximum of 10%" }
```

**Error `403` — off shift:**
```json
{ "statusCode": 403, "message": "Your shift has not started. Shift: monday–friday 07:00–20:00" }
```

---

### `GET /api/pos/orders`

List POS orders (paginated). Role-scoped:
- **Cashier:** own branch only, today only
- **Branch manager:** own assigned branches; full date range
- **Admin:** org-wide; full date range

**Roles:** `admin`, `branch_manager`, `cashier`

**Query params:**
| Param | Type | Default | Notes |
|---|---|---|---|
| `page` | integer | `1` | |
| `limit` | integer | `20` | Max `100` |
| `branchId` | string | — | Admin: any branch; manager: own branches only; cashier: ignored (auto-scoped) |
| `status` | `pending`\|`paid`\|`cancelled`\|`voided` | — | Filter by status |
| `cashierId` | string | — | Admin/manager use only |
| `from` | `YYYY-MM-DD` | — | Start date (Africa/Nairobi) |
| `to` | `YYYY-MM-DD` | — | End date inclusive (Africa/Nairobi) |

**Response `200`:**
```json
{
  "data": [
    {
      "id": "order_abc123",
      "orderNumber": 42,
      "status": "paid",
      "paymentMethod": "mpesa",
      "subtotal": "910.00",
      "discountType": "percentage",
      "discountValue": "10.00",
      "discountAmount": "91.00",
      "totalAmount": "819.00",
      "branchId": "branch_westlands",
      "branch": { "id": "branch_westlands", "name": "Westlands" },
      "cashierId": "user_amina",
      "cashier": { "id": "user_amina", "name": "Amina Said" },
      "voidedById": null,
      "voidedBy": null,
      "voidReason": null,
      "voidedAt": null,
      "createdAt": "2026-08-20T09:35:00.000Z",
      "updatedAt": "2026-08-20T09:37:00.000Z",
      "lines": [ /* ...same as POST response */ ]
    }
  ],
  "meta": { "total": 18, "page": 1, "limit": 20, "totalPages": 1 }
}
```

---

### `GET /api/pos/orders/:id`

Get the full detail of one order, including all lines and toppings.

**Roles:** `admin`, `branch_manager`, `cashier`  
*(Cashier can only view orders from their own branch)*

**Response `200`:** Same shape as a single order from the list (with full `lines` array).

**Error `403`:**
```json
{ "statusCode": 403, "message": "You can only access your assigned branches" }
```

---

### `PATCH /api/pos/orders/:id/pay`

Mark a pending order as paid. Only the cashier who created the order can pay it.

**Roles:** `cashier` only  
**Shift guard:** Cashier must be on shift.

**Request body:**
```json
{ "paymentMethod": "mpesa" }
```

| Field | Type | Required | Values |
|---|---|---|---|
| `paymentMethod` | string | No | `"cash"`, `"mpesa"`, `"card"` |

> `paymentMethod` is optional — the API accepts null (payment method not recorded).

**Success `200`:** Returns the updated order with `status: "paid"`.

**Error `409`:** Order is not in `pending` status.
```json
{ "statusCode": 409, "message": "Order is not in pending status" }
```

**Error `403`:** Wrong cashier.
```json
{ "statusCode": 403, "message": "You can only pay your own orders" }
```

---

### `PATCH /api/pos/orders/:id/cancel`

Cancel a pending order. Only the cashier who created the order can cancel it.

**Roles:** `cashier` only  
*(No shift guard — cashiers can cancel stale pending orders even after shift ends)*

**Request body:** *(empty)*

**Success `200`:** Returns the updated order with `status: "cancelled"`.

**Error `409`:** Order is not pending.
```json
{ "statusCode": 409, "message": "Order is not in pending status" }
```

---

### `PATCH /api/pos/orders/:id/void`

Void a paid order. A reason is mandatory (BR-POS-6.13).
Sets the order to `status: "voided"` and records who voided it.

**Roles:** `admin`, `branch_manager`

**Request body:**
```json
{ "reason": "Customer complained — duplicate charge" }
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `reason` | string | Yes | Non-empty; max 500 chars |

**Success `200`:** Returns the updated order with:
```json
{
  "status": "voided",
  "voidedById": "user_admin01",
  "voidedBy": { "id": "user_admin01", "name": "Sarah Admin" },
  "voidReason": "Customer complained — duplicate charge",
  "voidedAt": "2026-08-20T11:00:00.000Z"
}
```

**Error `409`:** Order is not `paid`.
```json
{ "statusCode": 409, "message": "Only paid orders can be voided" }
```

---

## 9. POS Reports

All three endpoints share the same query params and are accessible to
admin and branch_manager. Cashiers do not have access to any report endpoint.

**Roles:** `admin`, `branch_manager`

**Common query params:**
| Param | Type | Default | Notes |
|---|---|---|---|
| `fromDate` | `YYYY-MM-DD` | 6 months ago | Africa/Nairobi |
| `toDate` | `YYYY-MM-DD` | today | Africa/Nairobi |
| `branchId` | string | — | Admin: filter to one branch. Manager: their assigned branches only (ignored if provided outside their set) |

---

### `GET /api/reports/pos-summary`

High-level POS revenue summary with breakdowns and daily trend.
Only includes data from `posEnabled=true` branches.

**Response `200`:**
```json
{
  "period": {
    "from": "2026-08-01",
    "to": "2026-08-20",
    "timezone": "Africa/Nairobi"
  },
  "summary": {
    "totalRevenue": 248500,
    "orderCount": 312,
    "avgOrderValue": 796.47,
    "totalDiscount": 12400
  },
  "byBranch": [
    {
      "branchId": "branch_westlands",
      "branchName": "Westlands",
      "revenue": 142000,
      "orderCount": 178,
      "avgOrderValue": 797.75
    },
    {
      "branchId": "branch_karen",
      "branchName": "Karen",
      "revenue": 106500,
      "orderCount": 134,
      "avgOrderValue": 794.78
    }
  ],
  "byPaymentMethod": [
    { "method": "mpesa", "revenue": 180000, "orderCount": 226 },
    { "method": "cash",  "revenue": 58000,  "orderCount": 74  },
    { "method": "card",  "revenue": 10500,  "orderCount": 12  }
  ],
  "dailyTrend": [
    { "date": "2026-08-01", "revenue": 12800, "orderCount": 16 },
    { "date": "2026-08-02", "revenue": 14200, "orderCount": 18 },
    { "date": "2026-08-03", "revenue": 11500, "orderCount": 14 }
  ]
}
```

---

### `GET /api/reports/pos-items`

Per-item sales breakdown: quantity sold and revenue for each menu item
that appeared in paid orders in the period. Sorted by revenue descending.

**Response `200`:**
```json
{
  "period": {
    "from": "2026-08-01",
    "to": "2026-08-20",
    "timezone": "Africa/Nairobi"
  },
  "totalRevenue": 248500,
  "itemCount": 18,
  "items": [
    {
      "menuItemId": "item_taro",
      "itemName": "Taro Milk Tea",
      "quantitySold": 248,
      "revenue": 89600,
      "percentOfTotal": 36.1
    },
    {
      "menuItemId": "item_brown_sugar",
      "itemName": "Brown Sugar Tiger Milk Tea",
      "quantitySold": 187,
      "revenue": 74800,
      "percentOfTotal": 30.1
    },
    {
      "menuItemId": "item_mango",
      "itemName": "Mango Fruit Tea",
      "quantitySold": 131,
      "revenue": 36680,
      "percentOfTotal": 14.8
    }
  ]
}
```

> `percentOfTotal` is `(item.revenue / totalRevenue) * 100`, rounded to 1 dp.

---

### `GET /api/reports/pos-cashier-performance`

Per-cashier performance metrics for the period. Includes both `paid` and
`voided` orders (voided counted separately to track patterns). Sorted by
revenue descending.

**Response `200`:**
```json
{
  "period": {
    "from": "2026-08-01",
    "to": "2026-08-20",
    "timezone": "Africa/Nairobi"
  },
  "cashierCount": 3,
  "cashiers": [
    {
      "cashierId": "user_amina",
      "cashierName": "Amina Said",
      "orderCount": 148,
      "revenue": 118400,
      "avgOrderValue": 800.0,
      "totalDiscountGiven": 6200,
      "voidedCount": 2
    },
    {
      "cashierId": "user_omar",
      "cashierName": "Omar Farah",
      "orderCount": 164,
      "revenue": 130100,
      "avgOrderValue": 793.29,
      "totalDiscountGiven": 6200,
      "voidedCount": 1
    }
  ]
}
```

> `voidedCount` counts orders the cashier originally created that were later
> voided (by an admin/manager). It does not count `cancelled` orders.

---

## 10. Daily Sales

### `POST /api/daily-sales`  *(modified)*

Creating a daily sale for a POS-enabled branch is now rejected (BR-POS-8.2).

**Error `400` (posEnabled branch):**
```json
{
  "statusCode": 400,
  "message": "This branch uses POS — daily sales are recorded automatically"
}
```

The frontend should pre-check `branch.posEnabled` before allowing the form to
submit (see Phase 6 — User Management). The API is the authoritative guard.

---

## 11. Error Reference

### Common HTTP status codes

| Code | Meaning | Common causes |
|---|---|---|
| `400 Bad Request` | Validation failure or business rule violation | Missing required field, invalid format, item out of stock |
| `401 Unauthorized` | Not authenticated, or cashier off shift at login | Session expired; cashier login outside shift window |
| `403 Forbidden` | Authenticated but not authorised | Wrong role for endpoint; cashier off shift for write; discount exceeds limit |
| `404 Not Found` | Resource not found | Invalid ID in URL |
| `409 Conflict` | State conflict | Duplicate name; deletion guard (has children); wrong status for transition |
| `429 Too Many Requests` | Rate limit (100 req/min) | Rapid retry loops |

### Error body format

```json
{
  "statusCode": 400,
  "message": "string or string[]",
  "error": "Bad Request"
}
```

**Handling `message` arrays** (class-validator sends arrays for multiple validation failures):
```ts
const raw = body.message;
const display = Array.isArray(raw) ? raw.join(", ") : raw;
```

The existing `throwIfNotOk()` in `web/service/client.ts` already handles this
and produces a single-string `ApiError.message`. Use it for all fetch calls.

### Shift guard errors

A `403` with a message containing `"shift"` indicates the cashier is off shift.
The shift message includes the cashier's shift schedule so the UI can display it:

```json
{ "statusCode": 403, "message": "Your shift has not started. Shift: monday–friday 07:00–20:00" }
```

Parse the schedule from `GET /api/auth/session/me` (`shiftDays`, `shiftStartTime`,
`shiftEndTime`) rather than the error message for display purposes.

### Order status transitions

```
pending ──► paid        (PATCH /:id/pay)
pending ──► cancelled   (PATCH /:id/cancel)
paid    ──► voided      (PATCH /:id/void — admin/manager only)
```

Any transition on the wrong status returns `409 Conflict`.

---

*Last updated: 2026-08-20. Covers Phase 2 Groups 1–6 (all backend work).*
