# 03 — Data Model (Phase 2 — POS Module)

Target: PostgreSQL via Prisma. All new tables carry `organizationId` and are
added to `TENANT_MODELS` for automatic tenant scoping. Money fields use
`Decimal(12,2)` or `Decimal(14,2)` consistent with Phase 1.

## 1. Entity Overview

```
Organization 1──n MenuCategory 1──n MenuItem 1──n MenuItemSize
Organization 1──n Topping

Branch 1──n BranchMenuItem (join: Branch ↔ MenuItem)
Branch 1──n BranchMenuItemPrice (join: Branch ↔ MenuItemSize)
Branch 1──n BranchTopping (join: Branch ↔ Topping — stock toggle only)

Branch 1──n PosOrder 1──n OrderLine n──1 MenuItemSize
                                    1──n OrderLineTopping n──1 Topping

User (cashier) ──→ PosOrder (created by)
User (admin/manager) ──→ PosOrder (voided by)
```

## 2. New Entities

### MenuCategory

| Field | Type | Constraints |
|---|---|---|
| id | cuid | PK |
| organizationId | string FK → Organization | required |
| name | varchar(120) | unique per org (case-insensitive) |
| description | varchar(255) | nullable |
| sortOrder | int | default 0 |
| isActive | boolean | default true |
| createdById | string FK → User | who created this (for edit permissions) |
| createdAt / updatedAt | timestamptz | |

```prisma
model MenuCategory {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  name           String
  description    String?
  sortOrder      Int          @default(0)
  isActive       Boolean      @default(true)
  createdById    String
  createdBy      User         @relation("MenuCategoriesCreatedBy", fields: [createdById], references: [id])
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  items MenuItem[]

  @@unique([name, organizationId])
  @@index([organizationId])
  @@map("menu_category")
}
```

### MenuItem

| Field | Type | Constraints |
|---|---|---|
| id | cuid | PK |
| organizationId | string FK → Organization | required |
| categoryId | string FK → MenuCategory | required |
| name | varchar(200) | unique per org (case-insensitive) |
| description | varchar(500) | nullable |
| imageKey | string | nullable (R2 object key, future use) |
| sortOrder | int | default 0 |
| isActive | boolean | default true |
| createdById | string FK → User | who created this (for edit permissions) |
| createdAt / updatedAt | timestamptz | |

```prisma
model MenuItem {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  categoryId     String
  category       MenuCategory @relation(fields: [categoryId], references: [id])
  name           String
  description    String?
  imageKey       String?
  sortOrder      Int          @default(0)
  isActive       Boolean      @default(true)
  createdById    String
  createdBy      User         @relation("MenuItemsCreatedBy", fields: [createdById], references: [id])
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  sizes       MenuItemSize[]
  branchItems BranchMenuItem[]
  orderLines  OrderLine[]

  @@unique([name, organizationId])
  @@index([organizationId])
  @@index([categoryId])
  @@map("menu_item")
}
```

### MenuItemSize

| Field | Type | Constraints |
|---|---|---|
| id | cuid | PK |
| menuItemId | string FK → MenuItem | required, CASCADE on delete |
| name | varchar(60) | unique within item (e.g., Small, Medium, Large) |
| basePrice | decimal(12,2) | > 0 |
| sortOrder | int | default 0 |
| isActive | boolean | default true |
| createdAt / updatedAt | timestamptz | |

```prisma
model MenuItemSize {
  id         String   @id @default(cuid())
  menuItemId String
  menuItem   MenuItem @relation(fields: [menuItemId], references: [id], onDelete: Cascade)
  name       String
  basePrice  Decimal  @db.Decimal(12, 2)
  sortOrder  Int      @default(0)
  isActive   Boolean  @default(true)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  branchPrices BranchMenuItemPrice[]
  orderLines   OrderLine[]

  @@unique([menuItemId, name])
  @@index([menuItemId])
  @@map("menu_item_size")
}
```

### Topping

| Field | Type | Constraints |
|---|---|---|
| id | cuid | PK |
| organizationId | string FK → Organization | required |
| name | varchar(120) | unique per org (case-insensitive) |
| price | decimal(12,2) | >= 0 (free toppings valid) |
| sortOrder | int | default 0 |
| isActive | boolean | default true |
| createdById | string FK → User | who created this (for edit permissions) |
| createdAt / updatedAt | timestamptz | |

```prisma
model Topping {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  name           String
  price          Decimal      @db.Decimal(12, 2)
  sortOrder      Int          @default(0)
  isActive       Boolean      @default(true)
  createdById    String
  createdBy      User         @relation("ToppingsCreatedBy", fields: [createdById], references: [id])
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  branchToppings     BranchTopping[]
  orderLineToppings  OrderLineTopping[]

  @@unique([name, organizationId])
  @@index([organizationId])
  @@map("topping")
}
```

### BranchMenuItem

Per-branch item availability and stock status. Row existence = branch carries
the item. `isEnabled` is the admin toggle; `isInStock` is the daily operational
toggle.

| Field | Type | Constraints |
|---|---|---|
| id | cuid | PK |
| branchId | string FK → Branch | |
| menuItemId | string FK → MenuItem | CASCADE on delete |
| isEnabled | boolean | default true — admin: does this branch carry this item? |
| isInStock | boolean | default true — cashier/manager: currently available? |
| createdAt / updatedAt | timestamptz | |

```prisma
model BranchMenuItem {
  id         String   @id @default(cuid())
  branchId   String
  branch     Branch   @relation(fields: [branchId], references: [id])
  menuItemId String
  menuItem   MenuItem @relation(fields: [menuItemId], references: [id], onDelete: Cascade)
  isEnabled  Boolean  @default(true)
  isInStock  Boolean  @default(true)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@unique([branchId, menuItemId])
  @@index([branchId])
  @@index([menuItemId])
  @@map("branch_menu_item")
}
```

### BranchMenuItemPrice

Per-branch price override for a specific size variant. If no row exists, the
base price from `MenuItemSize.basePrice` applies.

| Field | Type | Constraints |
|---|---|---|
| id | cuid | PK |
| branchId | string FK → Branch | |
| menuItemSizeId | string FK → MenuItemSize | CASCADE on delete |
| price | decimal(12,2) | > 0 |
| createdAt / updatedAt | timestamptz | |

```prisma
model BranchMenuItemPrice {
  id             String       @id @default(cuid())
  branchId       String
  branch         Branch       @relation(fields: [branchId], references: [id])
  menuItemSizeId String
  menuItemSize   MenuItemSize @relation(fields: [menuItemSizeId], references: [id], onDelete: Cascade)
  price          Decimal      @db.Decimal(12, 2)
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  @@unique([branchId, menuItemSizeId])
  @@index([branchId])
  @@map("branch_menu_item_price")
}
```

### BranchTopping

Per-branch topping stock toggle. No row = available (default). Row with
`isInStock = false` = unavailable at that branch.

| Field | Type | Constraints |
|---|---|---|
| id | cuid | PK |
| branchId | string FK → Branch | |
| toppingId | string FK → Topping | CASCADE on delete |
| isInStock | boolean | default true |
| createdAt / updatedAt | timestamptz | |

```prisma
model BranchTopping {
  id        String   @id @default(cuid())
  branchId  String
  branch    Branch   @relation(fields: [branchId], references: [id])
  toppingId String
  topping   Topping  @relation(fields: [toppingId], references: [id], onDelete: Cascade)
  isInStock Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([branchId, toppingId])
  @@index([branchId])
  @@map("branch_topping")
}
```

### PosOrder

| Field | Type | Constraints |
|---|---|---|
| id | cuid | PK |
| organizationId | string FK → Organization | required |
| branchId | string FK → Branch | required |
| orderNumber | int | continuous per branch, never resets |
| status | enum OrderStatus | default `pending` |
| paymentMethod | enum PaymentMethod | nullable |
| subtotal | decimal(14,2) | sum of line totals |
| discountType | enum DiscountType | nullable |
| discountValue | decimal(12,2) | nullable — the % or fixed amount entered |
| discountAmount | decimal(12,2) | nullable — computed discount in KSh |
| totalAmount | decimal(14,2) | subtotal − discountAmount |
| cashierId | string FK → User | the creating cashier |
| voidedById | string FK → User | nullable — admin/manager who voided |
| voidReason | varchar(500) | nullable — required when voided |
| voidedAt | timestamptz | nullable |
| createdAt / updatedAt | timestamptz | |

```prisma
model PosOrder {
  id             String         @id @default(cuid())
  organizationId String
  organization   Organization   @relation(fields: [organizationId], references: [id])
  branchId       String
  branch         Branch         @relation(fields: [branchId], references: [id])
  orderNumber    Int
  status         OrderStatus    @default(pending)
  paymentMethod  PaymentMethod?
  subtotal       Decimal        @db.Decimal(14, 2)
  discountType   DiscountType?
  discountValue  Decimal?       @db.Decimal(12, 2)
  discountAmount Decimal?       @db.Decimal(12, 2)
  totalAmount    Decimal        @db.Decimal(14, 2)
  cashierId      String
  cashier        User           @relation("PosOrdersCashier", fields: [cashierId], references: [id])
  voidedById     String?
  voidedBy       User?          @relation("PosOrdersVoidedBy", fields: [voidedById], references: [id])
  voidReason     String?
  voidedAt       DateTime?
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  lines OrderLine[]

  @@unique([branchId, orderNumber])
  @@index([organizationId])
  @@index([branchId])
  @@index([cashierId])
  @@index([status])
  @@index([createdAt])
  @@map("pos_order")
}
```

### OrderLine

| Field | Type | Constraints |
|---|---|---|
| id | cuid | PK |
| orderId | string FK → PosOrder | CASCADE on delete |
| menuItemId | string FK → MenuItem | for reporting joins |
| menuItemSizeId | string FK → MenuItemSize | for reporting joins |
| itemName | varchar(200) | **snapshot** — item name at time of sale |
| sizeName | varchar(60) | **snapshot** — size name at time of sale |
| unitPrice | decimal(12,2) | **snapshot** — effective price at time of sale |
| quantity | int | >= 1 |
| toppingsTotal | decimal(12,2) | sum(topping prices) × quantity |
| lineTotal | decimal(14,2) | (unitPrice × quantity) + toppingsTotal |
| createdAt | timestamptz | |

```prisma
model OrderLine {
  id             String       @id @default(cuid())
  orderId        String
  order          PosOrder     @relation(fields: [orderId], references: [id], onDelete: Cascade)
  menuItemId     String
  menuItem       MenuItem     @relation(fields: [menuItemId], references: [id])
  menuItemSizeId String
  menuItemSize   MenuItemSize @relation(fields: [menuItemSizeId], references: [id])
  itemName       String
  sizeName       String
  unitPrice      Decimal      @db.Decimal(12, 2)
  quantity       Int          @default(1)
  toppingsTotal  Decimal      @db.Decimal(12, 2) @default(0)
  lineTotal      Decimal      @db.Decimal(14, 2)
  createdAt      DateTime     @default(now())

  toppings OrderLineTopping[]

  @@index([orderId])
  @@index([menuItemId])
  @@map("order_line")
}
```

### OrderLineTopping

| Field | Type | Constraints |
|---|---|---|
| id | cuid | PK |
| orderLineId | string FK → OrderLine | CASCADE on delete |
| toppingId | string FK → Topping | for reporting |
| toppingName | varchar(120) | **snapshot** |
| price | decimal(12,2) | **snapshot** — per-unit topping price |
| createdAt | timestamptz | |

```prisma
model OrderLineTopping {
  id          String    @id @default(cuid())
  orderLineId String
  orderLine   OrderLine @relation(fields: [orderLineId], references: [id], onDelete: Cascade)
  toppingId   String
  topping     Topping   @relation(fields: [toppingId], references: [id])
  toppingName String
  price       Decimal   @db.Decimal(12, 2)
  createdAt   DateTime  @default(now())

  @@index([orderLineId])
  @@map("order_line_topping")
}
```

## 3. New Enums

```prisma
enum OrderStatus {
  pending
  paid
  cancelled
  voided
}

enum PaymentMethod {
  cash
  mpesa
  card
}

enum DiscountType {
  percentage
  fixed
}
```

## 4. Modified Entities

### User (add fields)

```prisma
// Add to the User model in api/prisma/models/auth.prisma:

/// Working days for cashier shifts, e.g. ["monday","tuesday","wednesday"].
/// Required for cashier role; ignored for other roles.
shiftDays          String[]  @default([])
/// Shift start time HH:mm in Africa/Nairobi. Required for cashier.
shiftStartTime     String?
/// Shift end time HH:mm in Africa/Nairobi. Required for cashier.
shiftEndTime       String?
/// Max discount percentage this cashier can apply (0.00–100.00).
/// Null = cashier cannot give any discount. Cashier-only.
maxDiscountPercent Decimal?  @db.Decimal(5, 2)

// Add relations:
posOrders          PosOrder[]           @relation("PosOrdersCashier")
voidedOrders       PosOrder[]           @relation("PosOrdersVoidedBy")
createdMenuCategories MenuCategory[]    @relation("MenuCategoriesCreatedBy")
createdMenuItems   MenuItem[]           @relation("MenuItemsCreatedBy")
createdToppings    Topping[]            @relation("ToppingsCreatedBy")
```

### UserRole enum (add value)

```prisma
enum UserRole {
  super_admin
  admin
  branch_manager
  cashier          // NEW
}
```

### Branch (add fields)

```prisma
// Add to the Branch model in api/prisma/models/branch.prisma:

/// When true, POS is active; new manual daily sales entries are blocked.
posEnabled         Boolean  @default(false)
/// Next POS order number (atomic increment). Starts at 1.
nextPosOrderNumber Int      @default(1)

// Add relations:
posOrders          PosOrder[]
branchMenuItems    BranchMenuItem[]
branchMenuItemPrices BranchMenuItemPrice[]
branchToppings     BranchTopping[]
```

### Organization (add relations)

```prisma
// Add relations:
menuCategories     MenuCategory[]
menuItems          MenuItem[]
toppings           Topping[]
posOrders          PosOrder[]
```

## 5. TENANT_MODELS additions

Add to `api/src/prisma/tenant-scoping.extension.ts`:

```
"MenuCategory", "MenuItem", "Topping", "PosOrder"
```

Note: `MenuItemSize`, `BranchMenuItem`, `BranchMenuItemPrice`, `BranchTopping`,
`OrderLine`, `OrderLineTopping` do not carry `organizationId` directly — they
are scoped through their parent's relation.

## 6. Deletion Policy

| Entity | Hard delete? | Alternative |
|---|---|---|
| MenuCategory | Only if no items | Deactivate (`isActive = false`) |
| MenuItem | Only if no order lines reference its sizes | Deactivate |
| MenuItemSize | Only if no order lines | Deactivate |
| Topping | Only if no order line toppings | Deactivate |
| BranchMenuItem | Yes (admin removes item from branch) | — |
| BranchMenuItemPrice | Yes (revert to base price) | — |
| BranchTopping | Yes (revert to default in-stock) | — |
| PosOrder | No | Void (admin/manager) |
| OrderLine / OrderLineTopping | No (cascade with order) | — |

## 7. Seed Data

Initial menu seed (to be confirmed with client):

**Categories**: Milk Teas, Fruit Teas, Smoothies, Specialty Drinks, Snacks

**Toppings**: Boba Pearls, Coconut Jelly, Pudding, Aloe Vera, Red Bean,
Grass Jelly, Cheese Foam, Whipped Cream

**Sample items** (per category with sizes S/M/L):
- Classic Milk Tea, Taro Milk Tea, Matcha Latte, Brown Sugar Boba,
  Mango Fruit Tea, Passion Fruit Tea, Strawberry Smoothie, etc.

Exact items, prices, and branch availability to be provided by the client.

## 8. Migration Plan

One migration: `add_pos_module`

1. Add `cashier` to `UserRole` enum.
2. Add new enums: `OrderStatus`, `PaymentMethod`, `DiscountType`.
3. Add cashier fields to `user` table.
4. Add POS fields to `branch` table.
5. Create tables: `menu_category`, `menu_item`, `menu_item_size`, `topping`,
   `branch_menu_item`, `branch_menu_item_price`, `branch_topping`, `pos_order`,
   `order_line`, `order_line_topping`.
6. Create indexes.

No backfill required (all new data). Existing data is unaffected.
