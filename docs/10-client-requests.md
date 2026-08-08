# 10 — Client Requests (Aug 2026)

Planning + tracking doc for three client-requested features. **Nothing here is
built yet** — this is the agreed spec and the to-do list. Build order is
bottom-up by effort: Payroll (3) → Dashboard toggle (1) → Receipts (2).

Decisions locked with the client:
- **#1 page access** → **per-manager, any page** (generalized; not just the
  dashboard). Client's first ask is the Dashboard, but the admin must be able to
  disable *any* manager-accessible page for *any* manager, now and in future,
  with no new code per page.
- **#2 receipt storage** → **Cloudflare R2** (S3-compatible object storage).

---

## Feature 1 — Admin can disable ANY page per branch manager

### Intent
The admin can switch individual pages **on/off for a specific branch manager**.
Today they only need to hide the Dashboard, but the same control must cover any
manager-accessible page (Daily Sales, Purchases, Expenses, Vendors, Receipt
Centre, …) without shipping new code each time. Disabling a page hides it from
that manager's nav and blocks the underlying API for them.

### Design — page-access list + central registry (best approach)
Rather than a boolean column per page (a migration every time a page is added),
store a **single array of disabled page keys per user**, driven by one **page
registry** that both the frontend and backend read from.

**Store *disabled*, not *allowed*.** With a disabled-list, any page added later
is **on by default** — matching "for now only the dashboard." An allowed-list
would silently hide every new page until every manager is edited. So:
disabled-list wins.

- New field on `User`: `disabledPages String[]` (default `[]` = everything on).
  To hide the dashboard for one manager, their list becomes `["dashboard"]`.
  **One migration, ever** — new pages never need a schema change.
- Only meaningful for `branch_manager`. `admin` / `super_admin` always have full
  access (their `disabledPages` is ignored).
- **Never lock a manager out completely:** if a manager's *current* route is
  disabled, redirect to their first enabled page. If somehow every page is
  disabled, show a friendly "No pages assigned — contact your admin" screen
  rather than a redirect loop.

### The page registry (single source of truth)
One shared definition lists every **toggleable (manager-accessible)** page. It
maps a stable `key` → label, route, and the API endpoint(s) that page guards.
Admin-only pages (payroll, users, branches, audit, admin dashboard, financial)
are **not** in the registry and can't be toggled.

| key | label | route | guards endpoint(s) |
|---|---|---|---|
| `dashboard` | Dashboard | `/dashboard` | `GET /api/reports/manager-dashboard` |
| `sales` | Daily Sales | `/sales` | `/api/daily-sales*` |
| `purchases` | Purchases | `/purchases` | `/api/purchases*` |
| `expenses` | Expenses | `/expenses` | `/api/expenses*` |
| `vendors` | Vendors | `/vendors` | `/api/vendors*` |
| `receipts` | Receipt Centre | `/receipts` | `/api/receipts*` (Feature 2) |

Adding a future toggleable page = add one row here (+ tag its controller). No
schema change, no per-page flag.

### Enforced in two layers (never trust the client alone)
- **Backend:** a small `@Page('<key>')` decorator on protected controllers/
  routes plus a `PageAccessGuard`. If the caller is a `branch_manager` whose
  `disabledPages` contains that key → **403**. This is the real lock.
- **Frontend:** a `useCanAccess(pageKey)` helper reads the current user's
  `disabledPages` (already present in the session payload). Nav hides disabled
  items; a route guard redirects a disabled page → first enabled page.

### Data model
`api/prisma/models/auth.prisma` → `User`:
```prisma
/// Page keys hidden from this branch manager (admin-controlled). Empty = all on.
/// Only applies to branch_manager; ignored for admin/super_admin. See page registry.
disabledPages String[] @default([])
```
Migration: `add_disabled_pages`.

Better-Auth `additionalFields` in `auth.config.ts` and the `/api/users` DTOs
must expose `disabledPages` so it round-trips through create/update and rides on
the session payload.

### API
- `PATCH /api/users/:id` — accept `disabledPages` (admin only; values validated
  against the registry keys).
- `GET /api/users` / `GET /api/users/:id` — include `disabledPages`.
- Every registry-listed endpoint carries `@Page('<key>')`; the guard 403s a
  manager who has that key disabled.
- Surface `disabledPages` on the current-user/session response so the frontend
  gates nav without an extra call.

### Frontend
- Edit-user form: a **checklist** "Pages this manager can access" — one checkbox
  per registry entry (checked = enabled). Toggling Dashboard off is the client's
  current ask; the same UI covers every future page for free.
- Sidebar/nav: hide any page whose key is in the manager's `disabledPages`.
- Route guard: redirect a disabled route → first enabled page; all-disabled →
  "no pages assigned" screen.
- Bridge (`web/service/client.ts`): pass `disabledPages` through untouched (no
  store/branch renaming needed for this field).

### Effort: **Easy–Medium** (1 migration, registry + one decorator/guard, small
DTO/nav/form changes). Same effort as the single flag, but future-proof.

---

## Feature 2 — Receipt attachment centre (Cloudflare R2)

### Intent
When recording a **purchase**, a branch manager can attach a **receipt image** —
upload a file **or take a photo directly with the phone camera**. There's also a
**Receipt Centre** page to browse the attached receipts.

### Storage decision
- **Cloudflare R2** (S3-compatible). Files are NOT stored in Postgres or on the
  container disk — only **metadata + the object key** live in the DB. This
  survives redeploys and keeps the API stateless (matches the Docker plan).
- Access pattern: API issues a **pre-signed URL** so the browser can view/
  download the image directly from R2 without proxying bytes through the API.

### Upload flow (chosen: pre-signed PUT, direct browser → R2)
1. Manager picks/takes a photo → frontend calls
   `POST /api/purchases/:id/receipt/upload-url` with `{ contentType, size }`.
2. API validates (type/size), generates an object key
   `receipts/{orgId}/{purchaseId}/{uuid}.{ext}`, returns a **pre-signed PUT URL**.
3. Browser uploads the file straight to R2 with that URL.
4. Browser calls `POST /api/purchases/:id/receipt` with `{ key, contentType,
   size, originalName }` → API creates the `Receipt` row.
5. Viewing: `GET /api/receipts/:id/url` returns a short-lived **pre-signed GET**.

> Alternative (simpler, heavier): multipart upload through the API which then
> streams to R2. We're going with pre-signed to keep the API light. Revisit if
> the client wants server-side virus scanning / image compression.

### Validation / rules
- Allowed types: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`.
- Max size: **~10 MB** (tune later).
- A purchase can have **one or many** receipts — model as **many** (a purchase
  can have multiple receipt pages/photos). Managers can only attach to purchases
  in **their own branch**; admins to any. Delete = remove R2 object + DB row.
- Multi-tenant: every `Receipt` carries `organizationId`; R2 key is namespaced
  by org.

### Data model
New `api/prisma/models/receipt.prisma`:
```prisma
model Receipt {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  purchaseId     String
  purchase       Purchase     @relation(fields: [purchaseId], references: [id], onDelete: Cascade)
  branchId       String
  branch         Branch       @relation(fields: [branchId], references: [id])
  key            String       // R2 object key
  originalName   String
  contentType    String
  size           Int
  uploadedById   String
  uploadedBy     User         @relation("ReceiptsUploadedBy", fields: [uploadedById], references: [id])
  createdAt      DateTime     @default(now())

  @@index([organizationId])
  @@index([purchaseId])
  @@index([branchId])
  @@map("receipt")
}
```
Add the back-relation on `Purchase` (`receipts Receipt[]`), `Branch`, `User`,
`Organization`. Migration: `add_receipts`.

### API (new `receipts` module + additions to `purchases`)
- `POST /api/purchases/:id/receipt/upload-url` → pre-signed PUT.
- `POST /api/purchases/:id/receipt` → persist metadata after upload.
- `GET  /api/purchases/:id/receipts` → list receipts for a purchase.
- `GET  /api/receipts` → Receipt Centre feed (paginated, branch-scoped;
  filter by branch/vendor/date). Admin sees all branches; manager sees own.
- `GET  /api/receipts/:id/url` → short-lived pre-signed GET URL.
- `DELETE /api/receipts/:id` → delete R2 object + row (branch-scoped).

### Config / infra (new)
Env (add to `.env.production.example` + local): `R2_ACCOUNT_ID`,
`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE_URL`
(optional, if using a public custom domain instead of pre-signed GETs).
Dependency: `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` (R2 speaks
the S3 API). A small `R2Service` wrapper (put-url, get-url, delete).
**Client action needed:** create the R2 bucket + API token, set CORS on the
bucket to allow PUT/GET from the web origin, hand over the 4 secrets.

### Frontend
- **Record Purchase form:** a file input
  `<input type="file" accept="image/*" capture="environment">` — `capture`
  opens the **phone camera** on mobile; on desktop it's a normal file picker.
  Show a thumbnail/preview + progress; upload on submit (or right after pick).
- **Purchase row / detail:** a receipt indicator + "view" that opens the
  pre-signed URL.
- **Receipt Centre page** (new nav item, managers + admin): grid/list of
  receipts with branch/vendor/date filters, thumbnail, download, and (if
  permitted) delete.
- Bridge: receipts carry `branchId`/`branchName` → keep the existing
  branch↔store rename in `client.ts` consistent for these responses.

### Effort: **Medium–Hard** — mostly the new storage integration (R2 client,
pre-signed URLs, bucket + CORS setup) and the new module/page. The camera
capture itself is trivial.

---

## Feature 3 — Payroll for previous months

### Intent
Today payroll only pays the **current** month (hardcoded
`todayCalendarDate().slice(0,7)`). The client wants to **select a past month**
and record/pay those salaries (Somali: *"shaqaalaha bilihii hore in la soo
geliyo"* — enter previous months' staff salaries).

### Logic / rules
- Add a **`monthKey` parameter** (`YYYY-MM`) to status + both pay actions.
  Defaults to the current month when omitted (backwards compatible).
- **Guardrails:**
  - Reject **future** months (`monthKey > currentMonthKey` → 400).
  - Keep the existing **duplicate guard**: the
    `@@unique([organizationId, userId, monthKey])` on `SalaryPayment` already
    prevents paying the same person twice for the same month — this is why the
    data model already supports back-pay cleanly.
  - The generated **Salary expense** should be dated sensibly. Options:
    (a) keep `expenseDate = today` (payment happened today) with the month in
    the title/note — **recommended, simplest, matches current behaviour**; or
    (b) date it to the end of the selected month. Decide with client; default to
    (a) and just make the month explicit in the label (already done via
    `monthLabel`).
  - Confirm dialog on the frontend must state **which month** is being paid,
    especially when back-dating.

### API changes (`payroll.controller.ts` + `payroll.service.ts`)
- `GET  /api/payroll?month=YYYY-MM` — status for the selected month
  (paid/unpaid per user for that month).
- `POST /api/payroll` — body/query `{ month?: "YYYY-MM" }` — pay all unpaid for
  that month.
- `POST /api/payroll/pay-user/:userId` — body/query `{ month?: "YYYY-MM" }`.
- Service: replace the four `todayCalendarDate().slice(0,7)` sites with the
  resolved/validated `monthKey`; add future-month validation.

### Frontend
- Payroll page: a **month picker** (dropdown or month input) defaulting to the
  current month; changing it refetches status for that month.
- "Pay all" / per-user "Pay" buttons operate on the selected month.
- Confirm popup shows the selected month label.

### Effort: **Easy–Medium** — the schema already supports it; mostly
parameterizing existing code + a month picker.

---

## Cross-cutting

- **Migrations (run on deploy):** `add_disabled_pages`, `add_receipts`,
  (payroll needs **no** migration).
- **Smoke tests:** extend suites — payroll month param + future-month reject;
  users `disabledPages` round-trip + a disabled manager gets 403 on that page's
  endpoint (e.g. manager-dashboard); new receipts suite (upload-url shape,
  metadata persist, list/scope, delete). R2 calls in smoke can be mocked or
  pointed at a test bucket.
- **Env additions:** the four `R2_*` secrets (+ optional public base URL).
- **Client to provide:** R2 bucket + API token + bucket CORS for the web origin.
- **No changes to the `inventory` repo** (read-only reference, as always).

## To-do checklist (build order)

Payroll (previous months)
- [ ] Service: parameterize `monthKey` in getStatus/runAll/payUser; validate no future month
- [ ] Controller: accept `month` on GET/POST/pay-user
- [ ] Frontend: month picker + wire status/pay to selected month; confirm shows month
- [ ] Smoke: month param + future-month reject
- [ ] Verify (build + smoke green)

Page access (per-manager, any page)
- [ ] Page registry (shared source of truth: key → label/route/endpoints)
- [ ] Schema: `User.disabledPages String[]` + migration `add_disabled_pages`
- [ ] Auth additionalFields + Users DTOs expose `disabledPages`; session payload includes it
- [ ] Backend: `@Page('<key>')` decorator + `PageAccessGuard` (403 for disabled manager); tag registry endpoints
- [ ] Frontend: `useCanAccess` helper; edit-user checklist; hide nav + redirect for disabled pages; all-disabled screen
- [ ] Smoke: `disabledPages` round-trip + 403 on a disabled page's endpoint
- [ ] Verify

Receipts (Cloudflare R2)
- [ ] R2 bucket + token + CORS (client) ; env vars wired
- [ ] Deps: `@aws-sdk/client-s3` + presigner; `R2Service` wrapper
- [ ] Schema: `Receipt` model + relations + migration `add_receipts`
- [ ] Receipts module: upload-url, persist, list, centre feed, get-url, delete (branch-scoped)
- [ ] Frontend: purchase form file/camera input + preview/upload
- [ ] Frontend: Receipt Centre page + nav item + filters
- [ ] Smoke: receipts suite
- [ ] Verify
