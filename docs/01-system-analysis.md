# 01 — System Analysis

## 1. Purpose

Skyview Coffee Ltd currently tracks sales, supplier purchases, and expenses in
spreadsheets, per branch, consolidated manually each month. The system
replaces those spreadsheets with a single multi-branch web application where:

- each branch records its own daily figures,
- head office sees accurate, real-time numbers across all branches,
- monthly profit per branch is computed automatically:
  **Profit = Sales − Purchases − Expenses**,
- staff salaries are paid through a controlled monthly payroll run.

This is a **financial recording system, not an inventory system**. Nothing
tracks quantities on hand; purchases are money records with quantity/price
detail for reference only.

## 2. Actors

| Actor | Description | Scope |
|---|---|---|
| **Admin (head office)** | Owner/back-office staff | All branches; all modules; the only role that can run payroll, manage vendors, branches, users, and correct/delete past records |
| **Branch Manager** | Runs one branch | Own branch only; records daily sales, purchases, and expenses; can edit only same-day entries |

Notes:
- Every user has exactly one role.
- A branch manager is assigned to exactly one branch.
- Admin belongs to no branch (head office).
- The platform underneath supports multiple organizations (multi-tenant);
  Skyview deploys as a single organization. Organization management endpoints
  exist on the platform but are out of scope for this document set.

## 3. Modules

| Module | What it does | Who writes |
|---|---|---|
| **Branches** | The 4 locations; add/rename/deactivate | Admin |
| **Users** | Accounts, roles, branch assignment, **monthly salary** | Admin |
| **Daily Sales** | One sales total per branch per day | Manager (own branch), Admin (any) |
| **Vendors** | Managed supplier list (keeps names consistent) | Admin |
| **Purchases** | Supplies bought for a branch: free-text item, quantity, unit price, vendor, date | Manager (own branch), Admin (any) |
| **Expense Categories** | Rent, Salaries, Service Charge, Transport, … | Admin |
| **Expenses** | Operating costs per branch or company-wide | Manager (own branch), Admin (any) |
| **Payroll** | One salary run per calendar month → creates Salaries expenses | Admin only |
| **Reports** | Admin dashboard, manager dashboard, financial summary | Read-only |
| **Audit Log** | Who did what, when, from which branch | System-written, Admin reads |

## 4. Explicitly Out of Scope

Agreed with the client; the design must not accidentally reintroduce these:

- Ingredient/stock inventory, stock levels, stock deduction, reorder alerts
- Menu items, categories, per-item sales (future phase — noted in §6)
- Warehouse / distribution between branches
- POS hardware or till integration
- Loyalty programs, mobile ordering
- Accounting/tax software integration

## 5. Assumptions

1. Currency is Kenyan Shilling (KSh). Single currency, no conversion.
2. Business timezone is **Africa/Nairobi**; "today" in all same-day rules
   means the current date in that timezone (see 06 §4).
3. One sales figure per branch per day is sufficient (client-confirmed).
4. Salaries are fixed monthly amounts per user, edited on the user record.
   Variations (advances, deductions) are handled by manually adjusting the
   generated expense records after a payroll run.
5. Managers are trusted to enter data for **today**; anything older is a
   correction and goes through admin.
6. Data entry may happen late in the evening after closing; the system does
   not lock a day automatically.

## 6. Future Phases (design should not block these)

- Per-item sales entry (menu items return, daily totals become derivable)
- Ingredient inventory with recipes (the original Option B)
- POS integration feeding item-level sales
- The data model notes, where relevant, how these extend without migration
  pain (see 04 §7).
