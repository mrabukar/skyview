# Phase 2 — POS Module

Point of Sale module for the Bubble Tea Palace management system. Adds
transaction-level sales tracking, a shared menu catalog with per-branch
pricing, cashier role with shift enforcement, and POS-specific reporting.

Builds on the Phase 1 system (docs `01`–`11` in the parent directory).
**Code must follow these rules**, and any change of scope should be reflected
here first.

| Doc | Contents |
|---|---|
| [01-system-analysis.md](01-system-analysis.md) | Purpose, actors, modules, scope boundaries, assumptions |
| [02-business-rules.md](02-business-rules.md) | Formal business rules the backend must enforce |
| [03-data-model.md](03-data-model.md) | New entities, modified entities, relationships, constraints |
| [04-api-design.md](04-api-design.md) | REST endpoints, permissions, request/response shapes, errors |
| [05-frontend.md](05-frontend.md) | Pages, components, UX flows, responsive considerations |
| [06-implementation-checklist.md](06-implementation-checklist.md) | Build order, migration plan, task breakdown |

## Context

- Client: Skyview Coffee Limited, trading as **Bubble Tea Palace** — 4 branches.
- Phase 1 scope: daily sales, purchases, expenses, payroll — money tracking
  only (manual daily totals).
- Phase 2 scope: **POS module** — item-level sales transactions, menu
  management, cashier role, shift enforcement. POS-enabled branches auto-compute
  daily revenue from transactions; non-POS branches keep manual daily sales
  entry. Both feed into the same reporting pipeline.
- Stack unchanged: NestJS + Prisma + PostgreSQL, Better-Auth, Next.js + React +
  shadcn/ui, Cloudflare R2.

## Key decisions

| Topic | Decision |
|---|---|
| Menu catalog | Shared org-wide; per-branch availability + price overrides. Admin + managers can create items/categories/toppings (managers edit own, admin edits all; only admin can hard-delete) |
| Sizes/variants | Per item; each size has a base price + optional branch override |
| Toppings | Org-wide flat list; per-branch stock toggle; org-wide pricing |
| Cashier role | New `UserRole.cashier`; one branch; shift-enforced |
| Shift model | Per-day-of-week schedule + daily time window (Africa/Nairobi) |
| POS toggle | Per-branch; blocks new manual daily sales when enabled |
| Order flow | pending → paid \| cancelled; paid → voided (admin/manager) |
| Discounts | Per-order; % or fixed; admin sets max per cashier |
| Order numbers | Continuous per branch, never reset |
| Invoices | Printable + shareable (PDF, client-side) |
| Void | Admin/manager only; reason required; audit-logged |
| Offline mode | **Future phase** — not in scope |
| Thermal printing | **Future phase** — not in scope |
