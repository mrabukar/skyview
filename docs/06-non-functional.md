# 06 — Non-Functional Requirements

## 1. Stack & architecture

- **API**: NestJS (modular: `branches`, `users`, `daily-sales`, `vendors`,
  `purchases`, `expenses`, `payroll`, `reports`, `audit`), same skeleton as
  the inventory platform.
- **DB**: PostgreSQL (Neon in dev), Prisma ORM, migrations in repo.
- **Frontend**: the existing `web/` app; mock layer
  (`service/mock/`, demo auth hooks) is replaced by real fetch + Better-Auth.
- **Multi-tenancy**: inherited from the platform — every query scoped by
  `organizationId` via the tenant context service. Skyview = one organization.

## 2. Authentication & sessions

- Better-Auth, email + password, HTTP-only session cookie,
  `SameSite=Strict`, `Secure` in production.
- Session lifetime & refresh per platform config; deactivating a user revokes
  all their sessions (BR-7.4).
- No public sign-up in production — admin creates users (US-U1).
- Strong password policy (min 8, mixed classes) enforced server-side.

## 3. Authorization

- Role guard + tenant/branch scoping interceptor on every route (BR-1).
- Scoping is data-level, not just route-level: a manager's queries carry a
  forced `branchId` filter in the service layer, so even a crafted request
  cannot read another branch.
- Route access matrix lives in 05; deviations are bugs.

## 4. Timezone ("today" correctness)

- All same-day rules (BR-2.5, BR-3.4, BR-5.4), future-date checks, and
  `monthKey` computation evaluate the current date in **Africa/Nairobi**,
  independent of server timezone.
- Implementation: single utility (`businessToday(): 'YYYY-MM-DD'`,
  `businessMonthKey(): 'YYYY-MM'`) used everywhere — no scattered `new Date()`
  date logic in rule checks.
- Date-only columns are `DATE` in Postgres; no timestamp comparison against
  them.

## 5. Money

- `DECIMAL` end-to-end (BR-9.1); no float arithmetic in JS for money — use
  Prisma `Decimal` or integer cents in computation paths.
- Rounding: half-up to 2 dp at write time; reports round only at presentation.
- Currency fixed to KSh; formatting is a frontend concern.

## 6. Auditability & integrity

- Audit interceptor writes entries inside the same transaction as the
  mutation where practical (payroll: required, BR-6.6).
- Correctness beats convenience: uniqueness rules (sale/day, payroll/month,
  vendor name) live in the database, application checks exist only to return
  friendly errors first.
- Backups: platform default (Neon PITR in dev; production per deployment
  agreement).

## 7. Validation

- DTO validation (class-validator) on every write: types, ranges, lengths,
  date formats, enum values.
- Reject unknown fields (`whitelist: true, forbidNonWhitelisted: true`).
- Trim strings; normalize vendor names for the case-insensitive uniqueness
  check.

## 8. Pagination, filtering, performance

- All list endpoints paginated (default 20, max 100).
- Indexes as specified in 04 §2; report queries aggregate in SQL, not in JS.
- Expected volume is small (4 branches × a handful of rows/day) — the design
  targets correctness first; no caching layer in v1.

## 9. Observability & operations

- Structured request logs (route, user id, status, latency); errors with
  stack traces to the platform logger.
- Health endpoints: `/health`, `/health/db` (platform standard).
- Environment config validated at boot (fail fast on missing secrets).

## 10. Testing expectations (definition of done)

- Unit tests for every business rule in 03 — at minimum: BR-2.1/2.5 (sale
  uniqueness + same-day), BR-3.3 (server-computed total), BR-4.3 (vendor
  soft-delete), BR-5.5 (Salaries category protection), BR-6.2–6.7 (payroll
  lock, snapshot, transaction), scoping (BR-1.2) per module.
- e2e happy-path per module + the error catalogue in 05 §13.
- Seed script produces the 01 §5 baseline for local/dev.

## 11. Migration path from the demo

1. Backend implemented per docs 03–05, seeded per 04 §5.
2. `web/`: restore real `service/client.ts` + `upload.ts` + auth hooks from
   `inventory/web`, point `NEXT_PUBLIC_API_URL` at the API.
3. The new hooks (`daily-sales`, `purchase-entries`, `vendors`, `payroll`)
   already call the paths defined in 05 — they keep working unchanged.
4. Delete `web/service/mock/` once the API is live.
