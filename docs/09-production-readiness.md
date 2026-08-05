# 09 — Production Readiness Checklist

Snapshot of what's in place, what was just hardened, and what remains before a
production launch. Grouped by priority.

## ✅ Already in place

- **Auth & sessions** — Better-Auth, HTTP-only cookies, `Secure` + `SameSite`
  in production, `BETTER_AUTH_SECRET` (32+) required in prod, public sign-up
  disabled in prod.
- **Input validation** — global `ValidationPipe` (`whitelist` +
  `forbidNonWhitelisted` + `transform`) on every endpoint.
- **Transport hardening** — `helmet`, origin-restricted CORS (credentials).
- **Authorization** — role guard + data-level branch/org scoping on every
  module; verified by the smoke suite (152 checks).
- **Data correctness** — money as `DECIMAL`, Africa/Nairobi calendar rules,
  DB-level uniqueness (vendor name, salary-payment per user/month), audit log
  on every mutation.
- **Ops basics** — structured logging (pino), `/api/health` + `/api/health/db`,
  env validated at boot (fail-fast), modular seed scripts.
- **End-to-end tests** — `pnpm smoke` covers all modules against a live server.

## ✅ Just applied (this pass)

- **Session length** raised from 5 minutes to **7 days** (sliding, refreshed
  daily) — `auth.config.ts`.
- **Auth rate limiting** — Better-Auth per-IP limits enabled in all envs:
  sign-in 10/min, sign-up 5/min, change-password 5/min (on top of the global
  100/min throttle).
- **User creation fixed** — the web app now creates users via the real
  `POST /api/users` (salary/branch persist correctly), not the Better-Auth
  sign-up path.
- **Dead code removed** — deleted the unused inventory-era frontend island
  (products, inventory, per-item sales, stock-supplies, product-categories,
  old purchases, plus their lib/components). Smaller bundle, no more
  build-breaking drift. Removed a debug `console.log`.

## 🔴 Must decide / do before launch

1. **Cross-site cookies.** The session cookie is `SameSite=Strict`. Works if the
   web app and API share a registrable domain (e.g. `app.skyview.com` +
   `api.skyview.com`). If they'll be on unrelated domains, switch to
   `SameSite=None; Secure` and set exact CORS origins. Decide the deployment
   topology and set `BETTER_AUTH_TRUSTED_ORIGINS` / `NEXT_PUBLIC_API_URL`
   accordingly.
2. **Production env.** Set on the API: `NODE_ENV=production`,
   `DATABASE_URL` (Neon **pooled** URL at runtime), `BETTER_AUTH_SECRET`
   (32+ random), `BETTER_AUTH_URL`, `BETTER_AUTH_TRUSTED_ORIGINS`,
   `APP_TIMEZONE`. On the web: `NEXT_PUBLIC_API_URL`. Never commit `.env`.
3. **Green build + lint.** Run `pnpm build` and `pnpm lint` clean on both apps
   (the type-checker stops at the first error — confirm the whole tree passes).
4. **Migrations in the pipeline.** Use `prisma migrate deploy` on release (not
   `migrate dev`). Confirm the schema is fully migrated on the prod DB.
5. **First-admin path.** Admin creation is currently seed-only
   (`pnpm seed:org` + `pnpm seed:admin`). If the client needs to create
   admins/orgs in-app, build the super-admin feature (see `08-super-admin.md`).

## 🟠 Recommended

6. **Password recovery.** No self-service "forgot password" (needs email/SMTP).
   Today an admin resets a user's password from the Users screen — fine for a
   small team if an admin is always reachable; otherwise add an email reset
   flow.
7. **Error tracking & monitoring** — add Sentry (or similar) on API + web, and
   wire the health endpoints to the host's uptime checks.
8. **Automated unit tests** for the business rules in `03-business-rules.md`
   (the smoke suite covers behavior, but unit tests catch regressions in CI
   without a running server).
9. **Reports export** — the "export" builds a client-side CSV but the buttons
   say xlsx/pdf. Fix the labels or implement real exports.
10. **Backups & retention** — enable Neon PITR/backups; decide an audit-log
    retention policy if volume grows.

## 🟡 Nice to have / known

- **Super-admin dashboard** — designed in `08-super-admin.md`, not built.
- **Payroll** pays the current month only; back-pay for past months is an
  optional addition.
- **Organization settings / logo upload** — no backend; the nav link is hidden.
- **Deployment assets** — no Dockerfile / CI yet; `next.config` is empty
  (consider `output: "standalone"` + security headers).

## Suggested launch order

1. Decide cookie/domain topology (#1) and set prod env (#2).
2. Clean `pnpm build` + `pnpm lint` (#3); run `prisma migrate deploy` (#4).
3. Seed the org + first admin (#5).
4. Point the web app at the prod API, run `pnpm smoke` against it — all green.
5. Add monitoring/error tracking (#7) and backups (#10).
6. Then optional: password reset (#6), super-admin (§08), exports (#9).
