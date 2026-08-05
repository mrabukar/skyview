# 08 — Super Admin & Platform Administration (design, not yet built)

Status: **specification only.** Nothing in this document is implemented yet.
It captures everything needed so the feature can be built quickly if the client
asks for it. It extends docs 01–07; where it conflicts with the current
single-org build, this document wins once implemented.

## 1. Why this exists

Today the only way to get an **admin** into the system is the seed script
(`api/prisma/seed.ts`). There is no in-app way to:

- create the organization,
- create the first admin for an organization,
- reset an admin's password or deactivate an admin,
- see platform-wide totals.

The **super admin** role and the multi-tenant columns (`organizationId` on
every table) already exist in the schema and auth layer — but no endpoints or
UI use them. This document defines the super-admin dashboard that fills that
gap.

## 2. The bootstrap rule (unavoidable)

Someone has to be the root. **The first super admin is always created by the
seed** (or a one-time `ALLOW_SIGNUP=true` bootstrap). After that, everything
else — organizations, admins, branches — is created in-app. There is no way
around seeding exactly one root account; that is standard and expected.

```
seed → 1 super_admin (platform root)
super_admin (UI) → organizations → admins
admin (UI) → branches, managers, sales, purchases, expenses, payroll  (already built)
```

## 3. Two scope options

The client should pick one. The rest of the document covers both; sections are
marked **[single-org]** or **[multi-org]** where they differ.

### Option A — Single organization (recommended for Skyview)
One company (Skyview). The super admin only manages **Skyview's admins**:
create/deactivate admins, reset passwords, view counts. The organization itself
is seeded once and never created from the UI. Smaller build, matches a
one-company deployment.

### Option B — Multi-organization platform
The super admin runs a platform hosting **many** companies. They create
organizations, each organization gets its own admins, branches, and data,
fully isolated by `organizationId`. This is what the leftover frontend pages
(`app/(app)/super-admin/*`) were originally designed for. Larger build.

## 4. Roles & access

| Role | Scope | Super-admin dashboard |
|---|---|---|
| `super_admin` | Platform-wide, **belongs to no organization** (`organizationId = null`) | Full access |
| `admin` | One organization | No access (blocked) |
| `branch_manager` | One branch | No access |

- The tenant-scoping layer already treats `super_admin` as "no org filter"
  (`TenantInterceptor` returns `null` for super admins), so a super admin can
  read across organizations. Super-admin write endpoints must therefore set
  `organizationId` explicitly on the records they create.
- All super-admin routes are guarded by `@Roles(UserRole.super_admin)`.
- Super admins never appear in an organization's Users list, payroll, or
  reports (they have no `organizationId`).

## 5. Capabilities (pick per client need)

| Capability | Single-org | Multi-org |
|---|---|---|
| View platform stats (orgs, admins, branches, users) | ✓ | ✓ |
| Create an organization | — (seeded) | ✓ |
| Rename / deactivate / reactivate an organization | — | ✓ |
| Create an admin for an organization | ✓ (Skyview) | ✓ (any org) |
| Deactivate / reactivate an admin | ✓ | ✓ |
| Reset an admin's password | ✓ | ✓ |
| View an organization's admins | ✓ | ✓ |
| Impersonate / "enter" an organization (optional) | optional | optional |

Deliberately **out of scope** for the super admin: creating branches, managers,
sales, purchases, expenses, or running payroll. Those stay with each
organization's own admin (already built). The super admin sets up the org +
its admin, then hands off.

## 6. Data model impact

The existing schema already supports this — **no new tables are strictly
required** for single-org; multi-org needs none either (Organization exists).
Notes:

- `Organization` model already exists (`id, name, hasStores, isActive,
  logoKey, createdAt, updatedAt`). Reuse as-is.
- `User.organizationId` is nullable; super admins have `null`. Admins have a
  non-null org. Already the case.
- Add an audit action set for platform actions (extend the `AuditAction`
  enum): `ORGANIZATION_CREATED`, `ORGANIZATION_UPDATED`,
  `ORGANIZATION_DEACTIVATED`, `ORGANIZATION_REACTIVATED`, `ADMIN_CREATED`,
  `ADMIN_PASSWORD_RESET`. (`ORGANIZATION_UPDATED` already exists.)
- Audit rows written by a super admin have `organizationId = the affected org`
  (so the org's own admins can still see actions taken on their org, if
  desired) — decide during build.

## 7. Backend — new module `platform/` (or `super-admin/`)

All routes `@Roles(super_admin)`, under `/api`.

### 7.1 Platform stats
```
GET /api/platform/stats
→ { organizations: { total, active }, admins: { total, active },
    branches: number, users: number }
```

### 7.2 Organizations [multi-org]
```
GET    /api/organizations?search&page&limit     → paginated orgs (+ counts)
POST   /api/organizations   { name }            → create org
GET    /api/organizations/:id                   → org detail + its admins
PATCH  /api/organizations/:id  { name }         → rename
PATCH  /api/organizations/:id/deactivate        → block org (its users can't sign in)
PATCH  /api/organizations/:id/reactivate
```
For **single-org**, none of these are needed; the org is seeded.

### 7.3 Admin management
```
GET    /api/organizations/:id/admins            → list an org's admins
POST   /api/organizations/:id/admins
        { name, email, password, phone? }       → create an admin in that org
PATCH  /api/admins/:userId/deactivate           → revoke sessions + block
PATCH  /api/admins/:userId/activate
POST   /api/admins/:userId/reset-password
        { newPassword }                          → set a new password, revoke sessions
```
For **single-org**, these collapse to (org is implicit = Skyview):
```
GET    /api/platform/admins
POST   /api/platform/admins  { name, email, password, phone? }
PATCH  /api/platform/admins/:userId/deactivate | /activate
POST   /api/platform/admins/:userId/reset-password { newPassword }
```

### 7.4 Admin creation internals
Reuse the same mechanism the Users module already uses:
- hash the password with `better-auth/crypto` `hashPassword`,
- create the `user` (role `admin`, `organizationId = target org`, `branchId
  null`, `salary 0`) + a `credential` account, in one transaction,
- write an `ADMIN_CREATED` audit row,
- enforce: email unique, strong password, org exists & active.

Deactivating an admin must `session.deleteMany({ where: { userId } })` to
revoke access immediately (same pattern as `UsersService`).

### 7.5 Rules
- Only `super_admin` may call any of the above (guard).
- A super admin cannot create another super admin via these endpoints
  (root-only, seed). Optional: a separate, deliberately gated
  `POST /api/platform/super-admins` if the client wants multiple roots.
- Deactivating an organization [multi-org] blocks sign-in for all its users
  (checked in the sign-in hook alongside the existing `isActive` user check).

## 8. Seed changes

- Seed **one `super_admin`** (`SEED_SUPERADMIN_EMAIL` / `_PASSWORD`), no org.
- [single-org] Also seed the Skyview organization + its first admin (as today),
  so the app is usable immediately; the super admin is only for admin
  lifecycle management afterward.
- [multi-org] Seed only the super admin; the super admin creates orgs + admins
  from the UI. (Optionally still seed Skyview for demo convenience.)

## 9. Frontend

Leftover pages already exist and can be rewired (currently unlinked):
`app/(app)/super-admin/page.tsx`, `.../organizations/page.tsx`,
`.../organizations/new/page.tsx`, `.../organizations/[id]/page.tsx`,
`.../organizations/[id]/components/organization-users-table.tsx`.

### 9.1 Navigation & routing
- The sidebar already has a `SUPER_ADMIN_NAV` shown only when
  `role === "super_admin"` (Platform, Organizations). Wire it up.
- Super admins land on `/super-admin` (platform overview), not `/dashboard`.
- Route guard (`lib/auth/routes.ts`) already separates super-admin routes;
  confirm `isRouteAllowedForRole` blocks admins/managers from `/super-admin/*`
  and blocks super admins from org-scoped screens.

### 9.2 Screens
- **Platform overview** (`/super-admin`): stat cards (orgs, admins, branches,
  users) + recent platform activity (from audit).
- **Organizations** [multi-org] (`/super-admin/organizations`): table with
  search, "New organization", per-row deactivate/reactivate, drill-in.
- **New organization** [multi-org]: name → creates org, then prompts to create
  its first admin.
- **Organization detail** (`/super-admin/organizations/[id]`): org info +
  its admins table with "Add admin", deactivate/activate, reset password.
  For **single-org**, this is just an "Admins" screen for Skyview.

### 9.3 branch↔store bridge
The client `apiFetch` bridge (docs note in `api/README`) renames
`branch`/`branchId` ↔ `store`/`storeId`. Super-admin payloads are about orgs and
admins (no branch fields), so the bridge is a no-op here — no special handling.

## 10. Smoke tests (to add when built)

New suite `scripts/smoke/suites/super-admin.mjs`, plus a super-admin session in
`auth.mjs` (sign in with the seeded super admin):
- non-super roles hit every `/api/platform/*` and `/api/organizations` → 403
- super admin: stats shape; create org [multi]; create admin (201);
  duplicate email → 409; weak password → 400; deactivate admin → 204 and that
  admin can no longer sign in; reset password → new password works, old fails;
  reactivate → can sign in again.
- self-safety: super admin cannot deactivate their own root account.

## 11. Effort estimate

- **Single-org:** ~1 backend module (`platform/`: stats + admin lifecycle),
  seed tweak, rewire 2 frontend screens (overview + admins), 1 smoke suite.
  Small.
- **Multi-org:** the above **plus** the Organizations module (CRUD +
  deactivate) and the org list / new-org / org-detail screens, plus org
  deactivation in the sign-in hook. Medium.

## 12. Open questions for the client

1. Single-org (manage Skyview's admins) or multi-org (host multiple companies)?
2. Which capabilities from §5 are actually wanted?
3. When a new org/admin is created, does the super admin also set up that org's
   first branch, or does the org's admin do it afterward (as today)?
4. Should there ever be more than one super admin, or is a single seeded root
   enough?
