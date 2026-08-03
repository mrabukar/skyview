# Bubble Tea Palace — Frontend Demo (Skyview Coffee Ltd)

Client-facing demo of the café management system, running entirely on
**mock data** — no backend, no database. Every screen works; changes last
until the page reloads.

## Scope (per client decisions)

Three record types, all per-branch, plus payroll:

- **Daily Sales** — one sales total per branch per day. Managers enter their
  own branch; can only edit **today's** entry (older corrections are admin-only).
- **Purchases** — supplies bought for a branch (free-text item + quantity +
  unit price), with a **managed vendor list** (admin maintains it). Managers
  record for their own branch; admin for any branch.
- **Expenses** — per branch or company-wide, by category.
- **Payroll** — each user has a monthly salary. Admin clicks
  "Pay salaries — <month>" once per month; it creates a Salaries expense per
  staff member and **locks until the next month starts**.

Removed from the app (out of scope): products/menu, categories, inventory,
warehouse, distribute-to-branch, stock report, my stock, per-item sales.

Profit = Sales − Purchases − Expenses (dashboard + Financial Summary).

## Run it

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000

## Login (demo)

Click a badge on the login page, or use any email/password:

- Any email → **Admin** (all branches, payroll, vendors, users)
- Email containing `manager` → **Branch Manager** (Hub Karen: own sales,
  purchases, expenses only)

## Mock data

4 real branches, ~4 months of daily sales totals (KSh), supply purchases from
real vendors (Carrefour, Osterberg, Maasai Boba, Swiss Packaging…), expenses
mirroring the client's spreadsheet, salaries per user, and 3 months of payroll
history (current month unpaid so the button is clickable). Dates are generated
relative to today, so the demo always looks current.

## Key files

| Area | File |
|---|---|
| Mock dataset | `service/mock/data.ts` |
| Mock API (all routes + role rules) | `service/mock/handlers.ts` |
| Daily sales page | `app/(app)/sales/` |
| Purchases + vendor modal | `app/(app)/purchases/` |
| Payroll page | `app/(app)/payroll/page.tsx` |
| Salary field | `app/(app)/users/`, `types/users/user.ts` |
| Nav | `components/shell/sidebar.tsx` |

To wire a real backend later, replace `service/client.ts` / `service/upload.ts`
and the auth files with the originals from `inventory/web`.
