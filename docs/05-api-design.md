# 05 — API Design

REST, JSON, session cookie auth (Better-Auth). Base path `/api`.
The shapes intentionally match the frontend demo's mock layer
(`web/service/mock/handlers.ts`) so the UI plugs in with minimal change.

## 1. Conventions

- **Auth**: all endpoints require a session except `/api/auth/*`.
  `401` when unauthenticated, `403` when role/scope forbids (BR-1).
- **Manager scoping (BR-1.2)**: for managers the server forces
  `branchId = user.branchId` on reads and writes; client-sent `branchId`
  from a manager is rejected with `403`.
- **Pagination**: `?page=1&limit=20` →
  `{ "data": [...], "meta": { "total", "page", "limit", "totalPages" } }`.
- **Dates**: date-only fields are `YYYY-MM-DD` strings. Timestamps are ISO-8601.
- **Money**: JSON numbers (serialized from DECIMAL); server rounds to 2 dp.
- **Errors**: `{ "statusCode", "message", "error" }` (Nest default).
  Validation errors list all failing fields.
- **Audit**: every 2xx mutation writes an audit entry (BR-8) — not repeated
  per endpoint below.

## 2. Auth (Better-Auth, platform-standard)

| Method | Path | Notes |
|---|---|---|
| POST | `/api/auth/sign-in/email` | email + password |
| POST | `/api/auth/sign-out` | |
| GET  | `/api/auth/get-session` | |
| GET  | `/api/me` | session user incl. role, branch, organization |
| PATCH| `/api/me` | own profile (name, phone) |

## 3. Branches

| Method | Path | Who | Notes |
|---|---|---|---|
| GET | `/api/branches` | all | paginated; `?search=` |
| POST | `/api/branches` | admin | `{name, address}` |
| GET | `/api/branches/:id` | all | |
| PATCH | `/api/branches/:id` | admin | |
| POST | `/api/branches/:id/deactivate` | admin | BR-7.2 |
| POST | `/api/branches/:id/reactivate` | admin | |

*(Platform note: routes may be mounted as `/api/stores` internally for reuse;
the public contract for this project is `branches`.)*

## 4. Users

| Method | Path | Who | Notes |
|---|---|---|---|
| GET | `/api/users` | admin | `?search&role&isActive` |
| POST | `/api/users` | admin | `{name, email, password, role, branchId?, phone?, salary?}` — BR-7.3 |
| PATCH | `/api/users/:id` | admin | any field incl. `salary` (BR-6.1) |
| POST | `/api/users/:id/deactivate` | admin | revokes sessions (BR-7.4) |
| POST | `/api/users/:id/activate` | admin | |

## 5. Daily Sales

| Method | Path | Who | Notes |
|---|---|---|---|
| GET | `/api/daily-sales` | all | `?branchId&fromDate&toDate&page&limit`; managers auto-scoped |
| POST | `/api/daily-sales` | all | `{branchId?*, saleDate, totalAmount, note?}` — *admin only; managers implied. Errors: `400` future date/amount ≤ 0 · `409` duplicate (branch, date) per BR-2.1/2.7 |
| PATCH | `/api/daily-sales/:id` | owner rules | `{saleDate?, totalAmount?, note?}` — manager: own branch **and** saleDate = today (BR-2.5), else `403` |
| DELETE | `/api/daily-sales/:id` | admin | BR-2.6 |

Response row:

```json
{
  "id": "…", "branchId": "…",
  "branch": { "id": "…", "name": "Hub Mall – Karen" },
  "saleDate": "2026-08-03", "totalAmount": 32450,
  "note": null,
  "enteredBy": { "id": "…", "name": "Catherine Wanjiru" },
  "createdAt": "…", "updatedAt": "…"
}
```

## 6. Vendors

| Method | Path | Who | Notes |
|---|---|---|---|
| GET | `/api/vendors` | all | active only; `?includeInactive=true` (admin) |
| POST | `/api/vendors` | admin | `{name}` — `409` duplicate name (BR-4.1) |
| PATCH | `/api/vendors/:id` | admin | rename / `{isActive}` |
| DELETE | `/api/vendors/:id` | admin | deactivates instead if referenced (BR-4.3); response indicates which happened |

## 7. Purchases

| Method | Path | Who | Notes |
|---|---|---|---|
| GET | `/api/purchases` | all | `?search&branchId&vendorId&fromDate&toDate&page&limit`; managers auto-scoped; search covers itemName, vendor name, note |
| POST | `/api/purchases` | all | `{branchId?*, itemName, quantity, unitPrice, vendorId, purchaseDate, note?}` — server computes `totalCost` (BR-3.3); vendor must be active |
| PATCH | `/api/purchases/:id` | owner rules | manager: own branch + purchaseDate = today (BR-3.4) |
| DELETE | `/api/purchases/:id` | owner rules | manager: same-day only; admin any |

## 8. Expense Categories

| Method | Path | Who | Notes |
|---|---|---|---|
| GET | `/api/expense-categories` | all | array (small list) |
| POST | `/api/expense-categories` | admin | |
| PATCH | `/api/expense-categories/:id` | admin | `403` for Salaries (isSystem, BR-5.5) |
| DELETE | `/api/expense-categories/:id` | admin | `409` if in use; `403` for Salaries |

## 9. Expenses

| Method | Path | Who | Notes |
|---|---|---|---|
| GET | `/api/expenses` | all | `?search&categoryId&branchId&companyWideOnly&fromDate&toDate`; managers auto-scoped to own branch, company-wide rows excluded (BR-5.3) |
| POST | `/api/expenses` | all | `{title, amount, categoryId, branchId?, expenseDate, note?}` — manager: branch forced; company-wide (`branchId` empty) admin-only (BR-5.1) |
| PATCH | `/api/expenses/:id` | owner rules | manager: own branch + expenseDate = today (BR-5.4) |
| DELETE | `/api/expenses/:id` | admin | |

## 10. Payroll

| Method | Path | Who | Notes |
|---|---|---|---|
| GET | `/api/payroll` | admin | status object below |
| POST | `/api/payroll` | admin | `{monthKey}` — `409` already run (BR-6.2/6.7) · `400` future month (BR-6.3). Transactional (BR-6.6) |

`GET /api/payroll` response:

```json
{
  "currentMonthKey": "2026-08",
  "currentMonthLabel": "August 2026",
  "currentMonthPaid": false,
  "monthlyTotal": 154000,
  "activeUserCount": 5,
  "runs": [
    {
      "id": "…", "monthKey": "2026-07", "monthLabel": "July 2026",
      "totalAmount": 154000, "userCount": 5,
      "paidAt": "2026-07-28T15:03:00Z",
      "paidBy": { "id": "…", "name": "Skyview Admin" },
      "users": [
        { "id": "…", "name": "Catherine Wanjiru", "salary": 25000,
          "storeName": "Hub Mall – Karen" }
      ]
    }
  ]
}
```

## 11. Reports (read-only, BR-10)

| Method | Path | Who | Query |
|---|---|---|---|
| GET | `/api/reports/admin-dashboard` | admin | `fromDate, toDate, branchId?` |
| GET | `/api/reports/manager-dashboard` | manager | (own branch implied) |
| GET | `/api/reports/financial-summary` | admin | `fromDate, toDate, branchId?` |
| GET | `/api/reports/financial-summary/export` | admin | `+ format=xlsx\|pdf` |

Shapes follow the demo mock exactly: summary block
(`totalRevenue, cogs [purchases], grossProfit, totalExpenses, netProfit`),
comparison deltas vs previous period, monthly chart rows, expense breakdown,
top branches, recent daily sales.

## 12. Audit Log

| Method | Path | Who | Query |
|---|---|---|---|
| GET | `/api/audit-logs` | admin | `?action&userId&branchId&fromDate&toDate&search&page&limit` |

No mutation endpoints exist (BR-8.2).

## 13. Error catalogue (canonical cases)

| Case | Status |
|---|---|
| Not signed in | 401 |
| Manager touching another branch / admin-only action | 403 |
| Manager editing an entry older than today | 403 (message explains the same-day rule) |
| Duplicate daily sale (branch, date) | 409 |
| Payroll month already run | 409 |
| Payroll for future month | 400 |
| Future-dated sale/purchase/expense | 400 |
| Vendor name duplicate | 409 |
| Category in use on delete / Salaries category modification | 409 / 403 |
| Validation failures (missing/invalid fields) | 400 |
| Unknown id | 404 |
