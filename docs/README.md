# Skyview Coffee Ltd — System Design Documentation

Backend design for the Bubble Tea Palace management system. These documents
are the contract for implementation: **code must follow these rules**, and any
change of scope should be reflected here first.

| Doc | Contents |
|---|---|
| [01-system-analysis.md](01-system-analysis.md) | Purpose, actors, modules, scope boundaries, assumptions |
| [02-user-stories.md](02-user-stories.md) | User stories per role with acceptance criteria |
| [03-business-rules.md](03-business-rules.md) | Formal business rules the backend must enforce |
| [04-data-model.md](04-data-model.md) | Entities, fields, relationships, constraints |
| [05-api-design.md](05-api-design.md) | REST endpoints, permissions, request/response shapes, errors |
| [06-non-functional.md](06-non-functional.md) | Auth, roles, audit, timezone, money, validation, pagination |

## Context

- Client: Skyview Coffee Limited, trading as **Bubble Tea Palace** — 4 branches
  (Hub Mall Karen, Runda Mall, One Stop Arcade Langata, Mombasa City).
- Approved scope: **daily sales, purchases, expenses, payroll** — money
  tracking only. No stock/inventory, no menu, no POS (see 01, §4).
- A clickable frontend demo exists in `web/` (mock data). The demo's behavior
  reflects these rules and was approved by the client; the backend replaces
  the mock layer (`web/service/mock/`) with real endpoints of the same shape.
- Stack (agreed): NestJS + Prisma + PostgreSQL, Better-Auth sessions — same
  platform as the existing inventory product.
