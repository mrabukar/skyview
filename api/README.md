# Skyview Coffee API

NestJS + Prisma + PostgreSQL backend for Bubble Tea Palace. This phase ships
**setup + authentication + authorization** only; business modules (daily sales,
purchases, expenses, payroll) follow, built against `../docs`.

Same platform approach as the inventory product: Better-Auth sessions, a global
auth guard with `@Roles()`, and org-scoped Prisma via an AsyncLocalStorage
tenant context.

> **Naming:** the branch entity is the `Branch` model with a `branchId` field
> throughout (schema, Better-Auth user field, and session payload), matching
> `docs/04-data-model.md`.

## Prerequisites

- Node.js 20+, pnpm
- A PostgreSQL database (Neon recommended for dev)

## Setup

```bash
cd api
cp .env.example .env
# edit .env → set DATABASE_URL (Neon), and SEED_ADMIN_* if you like
pnpm install
pnpm prisma:generate
pnpm prisma:migrate          # creates tables from prisma/models/*.prisma
pnpm prisma:seed             # org, 4 branches, categories, vendors, admin + manager
pnpm start:dev               # http://localhost:4000
```

Seed prints the credentials, defaults:
- Admin — `admin@skyviewcoffee.co.ke` / `Admin123!`
- Manager — `catherine@skyviewcoffee.co.ke` / `Manager123!`

## What exists in this phase

| Area | Detail |
|---|---|
| Health | `GET /health` (anon), `GET /health/db` |
| Auth | Better-Auth at `/api/auth/*` (email sign-in/out, session, change-password) |
| Session user | `GET /api/me`, `PATCH /api/me` (own name/phone) |
| Authorization | global auth guard; `@Roles(admin \| branch_manager)`; `@AllowAnonymous()` opt-out |
| Tenancy | every org-scoped query filtered by the caller's `organizationId` |
| Data model | full schema per `docs/04` (all business tables created now, wired up later) |
| Daily Sales | `GET/POST /api/daily-sales`, `GET/PATCH/DELETE /api/daily-sales/:id` |

## Daily Sales module (BR-2)

First business module. Endpoints under `/api/daily-sales`:

| Method | Path | Who | Rule |
|---|---|---|---|
| GET | `/api/daily-sales` | admin, manager | `?branchId&fromDate&toDate&page&limit`; managers auto-scoped to own branch |
| POST | `/api/daily-sales` | admin, manager | admin sends `branchId`; manager's branch is forced. `409` on duplicate `(branch, day)`; `400` future date / amount ≤ 0 |
| GET | `/api/daily-sales/:id` | admin, manager | manager only own branch |
| PATCH | `/api/daily-sales/:id` | admin, manager | manager may edit **only today's** entry; admin any |
| DELETE | `/api/daily-sales/:id` | admin only | |

Every write is audit-logged. One entry per branch per day is enforced by a DB
unique index, not just the app.

## Verify (curl)

```bash
# 1. Health (no auth)
curl -s localhost:4000/health
# → {"status":"ok"}

# 2. Sign in as admin, capture the session cookie
curl -s -c cookies.txt \
  -X POST localhost:4000/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:4000" \
  -d '{"email":"admin@skyviewcoffee.co.ke","password":"Admin123!"}'

# 3. Who am I (uses the cookie)
curl -s -b cookies.txt localhost:4000/api/me
# → { "user": { role:"admin", branch:null, organization:{...}, ... } }

# 4. Update own profile
curl -s -b cookies.txt -X PATCH localhost:4000/api/me \
  -H "Content-Type: application/json" \
  -d '{"phone":"0723534990"}'

# 5. Manager session is scoped to one branch
curl -s -c mgr.txt -X POST localhost:4000/api/auth/sign-in/email \
  -H "Content-Type: application/json" -H "Origin: http://localhost:4000" \
  -d '{"email":"catherine@skyviewcoffee.co.ke","password":"Manager123!"}'
curl -s -b mgr.txt localhost:4000/api/me
# → role:"branch_manager", branch:{ name:"Hub Mall – Karen", ... }
```

```bash
# 6. Daily Sales — admin records for a branch (get a branchId from your DB/seed)
curl -s -b cookies.txt -X POST localhost:4000/api/daily-sales \
  -H "Content-Type: application/json" \
  -d '{"branchId":"<BRANCH_ID>","saleDate":"2026-08-04","totalAmount":32450}'

# 7. Duplicate same branch+day → 409
curl -s -b cookies.txt -X POST localhost:4000/api/daily-sales \
  -H "Content-Type: application/json" \
  -d '{"branchId":"<BRANCH_ID>","saleDate":"2026-08-04","totalAmount":100}'

# 8. Manager records for their own branch (no branchId needed)
curl -s -b mgr.txt -X POST localhost:4000/api/daily-sales \
  -H "Content-Type: application/json" \
  -d '{"saleDate":"2026-08-04","totalAmount":18000}'

# 9. Manager editing an older entry → 403 (same-day rule)
# 10. Manager DELETE → 403 (admin-only)
```

Admin-only vs manager-only behaviour is enforced by `@Roles()` plus data-level
branch scoping in the service. Remaining modules (per `docs/05`) follow the
same shape.

## Creating users

- **Dev**: `POST /api/auth/sign-up/email` is open (bootstrap) — body needs
  `email, password, name, role`, plus `organizationId` (admin/manager) and
  `branchId` (manager).
- **Prod**: sign-up requires an admin session (or a one-time `ALLOW_SIGNUP=true`
  to create the first admin). Normal user creation moves to `POST /api/users`
  when the Users module lands.

## Notes / deferred

- Vendor name uniqueness is enforced case-insensitively in the app; the DB
  constraint is `@@unique([name, organizationId])`. A `LOWER(name)` functional
  index can be added in a follow-up migration if needed (BR-4.1).
- `AuditAction` is a Prisma enum here (the design doc floated strings);
  keeping the enum matches the inventory approach and the reused audit code.
- Migrations are generated by `prisma migrate dev` on first run against your DB.
