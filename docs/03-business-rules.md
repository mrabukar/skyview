# 03 — Business Rules

Formal rules the backend **must enforce server-side** (never UI-only).
Referenced as `BR-x` from other docs. Where a rule maps to a database
constraint, that is noted — constraints beat application checks.

## BR-1 · Roles & scoping

- **BR-1.1** Two roles: `admin`, `branch_manager`.
- **BR-1.2** A branch manager is bound to exactly one branch. Every
  read and write they perform is automatically scoped to that branch; any
  `branchId` they send is ignored or rejected.
- **BR-1.3** Admin reads and writes across all branches.
- **BR-1.4** Admin-only capabilities: payroll, vendors (write), branches
  (write), users (write), expense categories (write), deleting any record,
  editing records older than today, audit log (read), financial summary.
- **BR-1.5** All permission checks happen in the API layer. The client UI is
  a convenience, not a security boundary.

## BR-2 · Daily sales

- **BR-2.1** Exactly one sales entry per branch per calendar day.
  → DB: `UNIQUE (branch_id, sale_date)`.
- **BR-2.2** `totalAmount > 0`.
- **BR-2.3** `saleDate` cannot be in the future (Africa/Nairobi).
- **BR-2.4** Managers create entries only for their own branch.
- **BR-2.5** Managers may update an entry only while `saleDate = today`
  (Africa/Nairobi). Older corrections are admin-only.
- **BR-2.6** Only admin deletes sales entries.
- **BR-2.7** A duplicate-day attempt returns HTTP 409 with a message naming
  the branch and date.

## BR-3 · Purchases

- **BR-3.1** A purchase belongs to exactly one branch.
- **BR-3.2** Fields: free-text `itemName` (1–200 chars), `quantity > 0`,
  `unitPrice > 0`, `vendorId` (must reference an **active** vendor on create),
  `purchaseDate` (not future), optional note.
- **BR-3.3** `totalCost = quantity × unitPrice` — computed and stored by the
  server; client-sent totals are ignored.
- **BR-3.4** Managers: create for own branch only; update/delete only while
  `purchaseDate = today`. Admin: any branch, any date (not future).
- **BR-3.5** Purchases never affect any stock quantity (no inventory exists).

## BR-4 · Vendors

- **BR-4.1** Vendor names unique, case-insensitive. → DB: unique index on
  `LOWER(name)`.
- **BR-4.2** Only admin creates/renames/deactivates vendors. Managers read.
- **BR-4.3** A vendor referenced by ≥ 1 purchase is never hard-deleted;
  delete requests deactivate it instead. Unreferenced vendors may be deleted.
- **BR-4.4** Inactive vendors are excluded from pickers but remain displayed
  on historical purchases.

## BR-5 · Expenses

- **BR-5.1** An expense belongs to one branch **or** is company-wide
  (`branchId = NULL`). Only admin creates company-wide expenses.
- **BR-5.2** `amount > 0`; `expenseDate` not in the future.
- **BR-5.3** Managers see and record only their own branch's expenses;
  company-wide expenses are not visible to managers.
- **BR-5.4** Same-day edit rule for managers (as BR-2.5); delete is admin-only.
- **BR-5.5** Expense categories: admin-managed; a category in use cannot be
  deleted (HTTP 409). The **Salaries** category is seeded and cannot be
  deleted or renamed (payroll depends on it).

## BR-6 · Payroll

- **BR-6.1** Each user has `salary ≥ 0` (KSh/month). Admin-edited only.
- **BR-6.2** At most one payroll run per calendar month.
  → DB: `UNIQUE (month_key)` on payroll runs.
- **BR-6.3** A run may target the current month or a past unpaid month —
  never a future month.
- **BR-6.4** A run includes exactly the users who are **active at run time**
  with `salary > 0`; each gets one generated expense:
  category = Salaries, amount = salary, branch = user's branch (NULL for
  admin/head office), date = run date,
  title = `Salary — <name> (<Month Year>)`, note links the run.
- **BR-6.5** The run stores an immutable snapshot: per-user name, salary,
  branch, plus totals. Later salary changes never alter past runs.
- **BR-6.6** Run creation and its expense generation are one database
  transaction — all or nothing.
- **BR-6.7** Only admin runs payroll. A duplicate-month attempt returns
  HTTP 409 ("already paid — unlocks when a new month starts").
- **BR-6.8** Payroll runs are never deleted via API. If a run was a mistake,
  admin adjusts/deletes the generated expenses (audit-logged) and the run
  stays as history.

## BR-7 · Branches & users

- **BR-7.1** Branch names unique within the organization.
- **BR-7.2** Deactivated branches reject new sales/purchases/expenses and
  disappear from pickers; history remains readable.
- **BR-7.3** `branch_manager` requires `branchId`; `admin` must have none.
- **BR-7.4** Deactivating a user revokes their sessions and excludes them
  from future payroll runs; their historical records remain.
- **BR-7.5** Users are never hard-deleted (referenced by history and audit).

## BR-8 · Audit

- **BR-8.1** Every create/update/delete on: daily sales, purchases, expenses,
  vendors, categories, branches, users, payroll runs — writes an audit entry:
  actor, action, entity type/id, before & after values, branch context,
  timestamp.
- **BR-8.2** Audit log is append-only; no API updates or deletes entries.
- **BR-8.3** Reads: admin only.

## BR-9 · Money & dates

- **BR-9.1** Money is stored as `DECIMAL(12,2)`, KSh. Never floating point.
- **BR-9.2** "Today", "current month", and all date-only rules are evaluated
  in **Africa/Nairobi**, regardless of server timezone (see 06 §4).
- **BR-9.3** `saleDate`/`purchaseDate` are date-only values (no time part);
  `expenseDate` follows the same convention.

## BR-10 · Reporting formulas

- **BR-10.1** For any period and branch filter:
  - `sales = Σ dailySales.totalAmount`
  - `purchases = Σ purchases.totalCost`
  - `expenses = Σ expenses.amount` (branch filter includes company-wide
    expenses for admin whole-company views; a single-branch view includes
    that branch's expenses plus, optionally and clearly labelled,
    an allocation view — v1 shows branch expenses only + company-wide listed
    separately)
  - `grossProfit = sales − purchases`
  - `netProfit = sales − purchases − expenses`
- **BR-10.2** Reports never mutate data; they are pure reads.
