# 07 — Tech Stack

Same platform stack as the inventory product (proven in production there);
this doc pins it for the Skyview backend. Full rationale lives in the
inventory repo's `tech-stack.md` — this is the Skyview-specific summary with
the versions currently in use.

## 1. Overview

Two applications — a **NestJS REST API** and the existing **Next.js web app**
(`web/`, currently running on mock data) — sharing one **PostgreSQL**
database. JSON over HTTP; sessions via Better-Auth HTTP-only cookies.

| Layer | Technology | Version (pinned from inventory) |
|---|---|---|
| Backend API | NestJS (TypeScript) | `@nestjs/core` ^11 |
| ORM | Prisma | 6 |
| Database | PostgreSQL | Neon (dev) / per deployment (prod) |
| Authentication | Better-Auth | ^1.6 |
| Frontend | Next.js (React, TypeScript) | Next 16.2, React 19.2 |
| Styling | Tailwind CSS 4 + shadcn/ui | |
| Server state | TanStack Query | ^5 |
| Tables | TanStack Table | ^8 |
| Forms | React Hook Form + Zod | Zod ^4 |
| Charts | Recharts | ^3 |
| Client state | Zustand | ^5 |
| Language | TypeScript | ^5.7 |

## 2. Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Client Browser                    │
│   Next.js app (web/)                                │
│   ├── TanStack Query   (server state / caching)     │
│   ├── TanStack Table   (data tables)                │
│   ├── React Hook Form + Zod (forms / validation)    │
│   ├── Recharts         (dashboards)                 │
│   ├── Zustand          (client state)               │
│   └── shadcn/ui + Tailwind (Skyview theme)          │
└───────────────────┬─────────────────────────────────┘
                    │ HTTP (JSON) + HTTP-only cookies
                    ▼
┌─────────────────────────────────────────────────────┐
│                NestJS REST API                      │
│   ├── Better-Auth      (sessions, /api/auth/*)      │
│   ├── Guards           (RBAC + branch scoping, BR-1)│
│   ├── class-validator  (DTO validation, 06 §7)      │
│   ├── @nestjs/throttler(rate limiting on auth)      │
│   ├── Audit interceptor(BR-8)                       │
│   └── Prisma Client    (DB access)                  │
└───────────────────┬─────────────────────────────────┘
                    ▼
              PostgreSQL (Neon dev)
```

## 3. Backend packages

| Package | Purpose |
|---|---|
| `@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express` | Framework |
| `@nestjs/config` | Env management, validated at boot (06 §9) |
| `@nestjs/mapped-types` | DTO utilities |
| `@nestjs/throttler` | Rate limiting (auth brute-force protection) |
| `class-validator`, `class-transformer` | Request validation (06 §7) |
| `prisma`, `@prisma/client` (v6) | ORM + migrations |
| `better-auth` (+ Prisma adapter) | Sessions, password hashing, `/api/auth/*` |

Module layout (mirrors inventory API):

```
api/src/modules/
├── auth/            # Better-Auth integration
├── branches/
├── users/
├── daily-sales/
├── vendors/
├── purchases/
├── expenses/        # + expense-categories
├── payroll/
├── reports/
├── audit-logs/
└── health/
```

Shared: `common/tenant/` (org scoping), `common/decorators/` (roles,
current-user), `prisma/` (client module).

## 4. Frontend

Already built (`web/`) — Next.js App Router, Skyview theme (espresso/amber
CSS variables in `app/globals.css`), KSh formatting in `lib/utils.ts`.
Switching from mock to real API is documented in 06 §11.

## 5. Differences from the inventory deployment

- **No object storage requirement for v1** — Cloudflare R2 (logo uploads) is
  optional; the demo uses the built-in logo mark. Enable later via the same
  platform module if the client wants logo upload.
- **No stock deduction paths** — the inventory system's row-level locking
  (`SELECT FOR UPDATE` for concurrent stock updates) is not needed; the only
  race-sensitive write is the payroll run, handled by the
  `UNIQUE (month_key)` constraint + transaction (BR-6.2/6.6).
- **Route naming** — public contract uses `branches` (05 §3).

## 6. Development tooling

- **pnpm** workspaces-style layout (`api/`, `web/` as separate packages)
- **ESLint 9** + Next config (web), Nest lint config (api)
- **Prisma Migrate** for schema changes; seed script per 04 §5
- **Jest** (api unit/e2e) per 06 §10
- Node.js 20+, TypeScript ^5.7
