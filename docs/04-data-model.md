# 04 — Data Model

Target: PostgreSQL via Prisma. Names below use Prisma conventions; the
mapping to SQL constraints is noted inline. Auth tables (session, account,
verification) come from Better-Auth and are omitted here.

## 1. Entity overview

```
Organization 1──n Branch
Organization 1──n User          (User n──1 Branch, optional)
Branch      1──n DailySale
Branch      1──n Purchase       (Purchase n──1 Vendor)
Branch      0..1──n Expense     (branchId nullable = company-wide)
Expense     n──1 ExpenseCategory
PayrollRun  1──n PayrollRunItem (snapshot per user)
AuditLog    n──1 User (actor)
```

The platform is multi-tenant: every row carries `organizationId` and every
query is tenant-scoped (inherited from the inventory platform). Skyview runs
as one organization; this doc omits `organizationId` from field lists for
brevity, but it exists on every table below except `PayrollRunItem`.

## 2. Entities

### Branch
| Field | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| name | varchar(120) | unique per org |
| address | varchar(255) | |
| isActive | boolean | default true |
| createdAt / updatedAt | timestamptz | |

### User
| Field | Type | Constraints |
|---|---|---|
| id | uuid | PK (Better-Auth user id) |
| name | varchar(120) | required |
| email | citext | unique |
| role | enum(`admin`,`branch_manager`) | |
| phone | varchar(30) | nullable |
| **salary** | numeric(12,2) | default 0, `>= 0` (BR-6.1) |
| branchId | uuid FK → Branch | **required iff role = branch_manager, null iff admin** (app-enforced, BR-7.3) |
| isActive | boolean | default true |
| createdAt / updatedAt | timestamptz | |

### DailySale
| Field | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| branchId | uuid FK → Branch | required |
| saleDate | **date** | not future (app), part of unique key |
| totalAmount | numeric(12,2) | `> 0` (CHECK) |
| note | varchar(300) | nullable |
| enteredById | uuid FK → User | required |
| createdAt / updatedAt | timestamptz | |

Constraints: `@@unique([branchId, saleDate])` (BR-2.1) ·
index `[saleDate]`, `[branchId, saleDate]`.

### Vendor
| Field | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| name | varchar(80) | unique per org, case-insensitive (functional index on `lower(name)`) |
| isActive | boolean | default true (BR-4.3 soft delete) |
| createdAt / updatedAt | timestamptz | |

### Purchase
| Field | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| branchId | uuid FK → Branch | required |
| itemName | varchar(200) | required, free text (BR-3.2) |
| quantity | numeric(10,2) | `> 0` (CHECK) |
| unitPrice | numeric(12,2) | `> 0` (CHECK) |
| totalCost | numeric(14,2) | server-computed = quantity × unitPrice (BR-3.3) |
| vendorId | uuid FK → Vendor | required, RESTRICT on delete |
| purchaseDate | **date** | not future (app) |
| note | varchar(300) | nullable |
| createdById | uuid FK → User | required |
| createdAt / updatedAt | timestamptz | |

Indexes: `[branchId, purchaseDate]`, `[vendorId]`, trigram/ILIKE on itemName
if search volume warrants.

### ExpenseCategory
| Field | Type | Constraints |
|---|---|---|
| id | serial | PK |
| name | varchar(80) | unique per org |
| description | varchar(255) | nullable |
| isSystem | boolean | default false — `true` for seeded **Salaries** (BR-5.5: no rename/delete) |
| createdAt / updatedAt | timestamptz | |

### Expense
| Field | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| title | varchar(200) | required |
| amount | numeric(12,2) | `> 0` (CHECK) |
| categoryId | int FK → ExpenseCategory | RESTRICT on delete (BR-5.5) |
| branchId | uuid FK → Branch | **nullable** — null = company-wide (BR-5.1) |
| expenseDate | date | not future (app) |
| note | varchar(300) | nullable |
| payrollRunId | uuid FK → PayrollRun | nullable — set for payroll-generated expenses |
| createdById | uuid FK → User | required |
| createdAt / updatedAt | timestamptz | |

Indexes: `[branchId, expenseDate]`, `[categoryId]`, `[payrollRunId]`.

### PayrollRun
| Field | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| monthKey | char(7) `YYYY-MM` | **unique per org** (BR-6.2) |
| totalAmount | numeric(14,2) | snapshot total |
| userCount | int | snapshot count |
| paidAt | timestamptz | |
| paidById | uuid FK → User | |

### PayrollRunItem (immutable snapshot, BR-6.5)
| Field | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| runId | uuid FK → PayrollRun | CASCADE with run (runs are never API-deleted) |
| userId | uuid FK → User | |
| userName | varchar(120) | snapshot — survives later renames |
| salary | numeric(12,2) | snapshot |
| branchId / branchName | uuid / varchar | snapshot, nullable |

### AuditLog (append-only, BR-8)
| Field | Type |
|---|---|
| id | uuid PK |
| action | varchar — e.g. `DAILY_SALE_CREATED`, `PURCHASE_UPDATED`, `PAYROLL_RUN_EXECUTED`, `VENDOR_DEACTIVATED`, `USER_UPDATED` … |
| entityType / entityId | varchar / varchar |
| userId (actor) | uuid FK → User |
| branchId | uuid, nullable context |
| before / after | jsonb, nullable |
| metadata | jsonb, nullable |
| createdAt | timestamptz |

Indexes: `[createdAt]`, `[action]`, `[userId]`, `[entityType, entityId]`.
No update/delete API paths exist for this table.

## 3. Enums

```prisma
enum Role { admin  branch_manager }
```
(Audit actions are strings, not an enum — new actions shouldn't require a
migration.)

## 4. Deletion policy summary

| Entity | Hard delete? | Alternative |
|---|---|---|
| DailySale / Purchase / Expense | Yes, admin only | — (audit keeps before-image) |
| Vendor | Only if unreferenced | deactivate (BR-4.3) |
| ExpenseCategory | Only if unused, never Salaries | — |
| Branch | No | deactivate (BR-7.2) |
| User | No | deactivate (BR-7.4/7.5) |
| PayrollRun / Items | No | adjust generated expenses (BR-6.8) |
| AuditLog | No | — |

## 5. Seed data

- 4 branches (Hub Mall Karen, Runda Mall, One Stop Arcade Langata, Mombasa City)
- Expense categories: Rent, **Salaries (isSystem)**, Service Charge, Transport,
  Repairs & Maintenance, Internet & Phone, Promotional Levy, Utilities, Other
- Vendors: Carrefour, Osterberg, Maasai Boba, Swiss Packaging, Lotus Group,
  Savora Flavors, FengSheng Boba
- 1 admin user (credentials delivered out of band)

## 6. Derived values (never stored)

Gross/net profit, monthly aggregates, expense breakdowns — always computed in
report queries (BR-10). Only `totalCost` on Purchase and payroll snapshots are
stored derivations, both fixed at write time on purpose.

## 7. Future-phase fit (from 01 §6)

- Per-item sales: add `MenuItem` and `SaleLine (dailySaleId FK)` tables;
  `DailySale.totalAmount` becomes a validated aggregate of its lines. No
  change to existing rows.
- Inventory: add `Ingredient`, `Recipe`, `StockMovement` referencing
  `Purchase.id` for stock-in — the money layer stays untouched.
