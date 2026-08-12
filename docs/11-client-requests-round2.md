# 11 — Client Requests, Round 2 (Aug 2026)

Implementation-ready analysis for round-2 client features. Status as of
implementation: **A done**, **C done**, **B done** (see Locked decisions).
Read `docs/10-client-requests.md` first for the receipts / page-access / payroll
patterns this builds on, and `docs/04-data-model.md` / `docs/06-non-functional.md`
for scoping and multi-tenancy rules.

| #   | Feature                                      | Effort                   | Touches                        |
| --- | -------------------------------------------- | ------------------------ | ------------------------------ |
| A   | Multiple receipts per purchase entry         | **Easy** (frontend only) | web only                       |
| B   | Assign a branch manager to multiple branches | **Medium–Hard**          | schema + API scoping + web     |
| C   | Documents/photos attached to a user          | **Medium**               | schema + API + web (reuses R2) |

**Recommended build order:** A (quick win) → C (isolated, reuses receipts) →
B (invasive; do last, largest test surface).

## Locked decisions (implementation)

| Topic | Decision |
|---|---|
| A | Done (multi-file on create) — soft cap of 10 not enforced |
| B payroll | **Admin-only.** Salary still lands on an internal default `User.branchId` (first assigned) — not shown in the UI |
| B writes | **Require branch picker only when manager has >1** assigned branches; no “Primary” label in the user form |
| C file types | Images + PDF (JPEG/PNG/WebP/PDF), 10 MB |
| C access | **Admin:** full CRUD. **Manager:** read/list/view **own** docs only (Settings → Profile) |

Conventions used everywhere in this codebase (follow them):

- Multi-tenant: every org-owned model carries `organizationId` and is added to
  `TENANT_MODELS` in `api/src/prisma/tenant-scoping.extension.ts` so queries are
  auto-scoped to the caller's org.
- Branch scoping helpers live in `api/src/common/utils/branch-scope.util.ts`.
- The web client bridges API `branch*` fields to `store*` in
  `web/service/client.ts` (`REQ_KEYS` / `RES_KEYS`).
- **Never modify the** `inventory` **repo** (read-only reference).

---

## Feature A — Multiple receipts per purchase entry

### Intent

"We sometimes have 3–4 receipts in a day; the system only lets us attach one per
entry." The client also floated "combine purchases for the same category" as an
alternative — **we are not doing that** (it would merge distinct purchases and
lose per-item detail). Instead: allow **many receipts on one purchase entry**,
which the data model already supports.

### Current state (important)

- **Backend already supports many receipts per purchase.** `Purchase.receipts`
  is a one-to-many (`api/prisma/models/receipt.prisma`), the receipts API
  (`POST /api/receipts`, `GET /api/receipts?purchaseId=`) is per-receipt, and
  the Purchases table column + lightbox already render N receipts with a "+N"
  badge. **No schema or API change is required.**
- The only gap is the **Record Purchase (add) form**: it takes a single
  `receiptFile?: File | null`
  (`web/app/(app)/purchases/components/purchase-entry-modal.tsx`). In **edit**
  mode `ReceiptManager` already lets you add several (one click each).

### Changes (web only)

1. `purchase-entry-modal.tsx`

- Change `PurchaseEntryFormValues.receiptFile?: File | null` →
  `receiptFiles: File[]`.
- File input: add `multiple`; on change, validate each file (type via
  `RECEIPT_ACCEPT`, size via `RECEIPT_MAX_SIZE`) and append valid ones.
- Render the selected files as a small list with per-file remove.

2. `web/app/(app)/purchases/page.tsx` → `handleSave` (add branch): after
   `createEntry.mutateAsync(...)`, loop `form.receiptFiles` and call
   `uploadReceipt(created.id, file)` for each (sequential is fine; or
   `Promise.allSettled` for parallel). On any failure, keep the purchase and
   show one toast listing which files failed.
3. (Optional) `receipt-manager.tsx`: add `multiple` to its input and loop
   `uploadFile` so several can be picked at once in edit mode.

### Edge cases / rules

- Validate **per file**; skip invalid ones with a clear toast rather than
  aborting the whole batch.
- Suggested soft cap: **10 receipts per purchase** (tune with client).
- Partial success is fine — receipts are independent rows.

### Checklist

- [x] `receiptFiles: File[]` + `multiple` input + selected-file list in add modal
- [x] Upload each file after create in `handleSave`; partial-failure toast
- [x] (Optional) multi-select in `ReceiptManager`
- [ ] Verify: attach 3 files on create → all show in the row's "+N" + lightbox

---

## Feature B — Assign a branch manager to multiple branches

### Intent

One branch manager oversees **several branches** and can view and record data
(sales, purchases, expenses, receipts) for **all** of their assigned branches.

### Current state (why this is invasive)

A manager has exactly **one** branch: `User.branchId` (single FK,
`api/prisma/models/auth.prisma`). That single id flows through:

- `CurrentUserPayload.branchId` (`common/decorators/current-user.decorator.ts`)
- **branch-scope helpers** (`common/utils/branch-scope.util.ts`):
  `assertManagerHasBranch`, `resolveBranchFilter`, `resolveWriteBranchId`,
  `assertBranchAccess` — all assume a single id.
- Every module that scopes by branch:
  `daily-sales`, `purchases`, `expenses`, `receipts`, `reports`, `audit-logs`
  services + their query DTOs.
- `auth.config.ts` (`additionalFields.branchId`), `me.service.ts`, users
  create/update DTOs + service, `payroll.service.ts` (salary → branch), the seed.

### Data model — recommended: a join table

Prefer a join table over a `String[]` column (referential integrity + lets you
answer "who manages branch X").

```prisma
// api/prisma/models/auth.prisma (or a new file)
model BranchManagerAssignment {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  userId         String
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  branchId       String
  branch         Branch       @relation(fields: [branchId], references: [id], onDelete: Cascade)
  createdAt      DateTime     @default(now())

  @@unique([userId, branchId])
  @@index([organizationId])
  @@index([branchId])
  @@map("branch_manager_assignment")
}
```

Add back-relations on `User`, `Branch`, `Organization`, and add
`"BranchManagerAssignment"` to `TENANT_MODELS`.

**Keep** `User.branchId` **as the manager's optional "primary / default branch"**
(used for single-branch writes and payroll attribution). Simpler than removing
it and it gives writes a sensible default. Alternative is to drop it and always
require an explicit write branch — decide with the client.

**Migration** `add_branch_manager_assignments`**:** create the table, then
**backfill**: for every existing `branch_manager` with a non-null `branchId`,
insert one assignment row `(userId, branchId, organizationId)`. (One-off SQL in
the migration or a seed script.)

### API changes

1. **Resolve the manager's branch set per request.** Better-Auth sessions don't
   hold arrays cleanly, so add a small service, e.g.
   `BranchAccessService.getBranchIds(userId): Promise<string[]>` that reads the
   join table (union the primary `branchId`). Call it where scoping happens, or
   attach `branchIds` to the request in a guard/interceptor. Also return
   `branchIds` (+ names) from `me.service` for the frontend.
2. **Rewrite** `branch-scope.util.ts` (the core):

- `resolveBranchFilter(user, queryBranchId)` → for a manager return a Prisma
  filter `{ in: branchIds }` (and if `queryBranchId` given, intersect it with
  their set); admins keep the current single-id/optional behaviour. Change
  the return type to a filter object and update callers to use
  `where: { branchId: <filter> }`.
- `resolveWriteBranchId(user, dtoBranchId)` → manager with exactly one branch
  → that branch; manager with **>1** → **require** `dtoBranchId` and validate
  it ∈ their set (else 400); admins unchanged.
- `assertBranchAccess(branchId, user)` → manager passes if
  `branchId ∈ branchIds`.
- `assertManagerHasBranch` → return the set (or the primary), adjust callers.

3. **Every branch-scoped query for managers** changes from
   `where: { branchId }` to `where: { branchId: { in: branchIds } }`:
   `daily-sales`, `purchases`, `expenses`, `receipts` list/find; `reports`
   (manager dashboard aggregates across all assigned branches — consider a
   per-branch breakdown); `audit-logs`.
4. **Users module:** create/update accept `branchIds: string[]` for managers;
   validate each branch is active + in the org; set `branchId` (primary) to the
   first (or an explicit `primaryBranchId`). Return `branchIds` + names.
5. **Payroll:** a multi-branch manager's `SalaryPayment.branchId` = primary
   branch (document the choice).
6. **auth.config.ts / me.service:** expose `branchIds` (+ names) so the frontend
   can gate the write-branch selector and filters.

### Frontend changes

- `web/types/users/user.ts` + `web/lib/types.ts` (`AppUser`): add
  `branchIds` / branch names. Extend the `client.ts` bridge if you keep
  `store`/`branch` naming for the array.
- **User modal**: replace the single Branch combobox with a **multi-select**
  (checklist or multi-combobox) of branches for managers; require ≥1.
- **Create forms** (daily sales, purchase, expense): if the manager has **>1**
  branch, show a Branch selector limited to their branches (required); if
  exactly **1**, keep it implied/hidden (current behaviour).
- **Filters / dashboard**: let a multi-branch manager filter across their
  branches; manager dashboard sums across all assigned branches.

### Edge cases / rules

- Manager with **zero** branches → block writes (403), show an empty state.
- **Write with >1 branch and none selected** → 400 (form validation mirrors it).
- **Unassigning** a branch: keep historical records; access is evaluated against
  the _current_ set, so the manager simply loses access to that branch's data
  going forward (document this).
- Admins/super-admins are unaffected (unrestricted).

### Checklist

- [x] Schema: `BranchManagerAssignment` + relations + `TENANT_MODELS` + migration + backfill
- [x] `BranchAccessService.getBranchIds` (+ expose `branchIds` on `me`)
- [x] Rewrite `branch-scope.util.ts` (filter-based) + update all callers
- [x] Users create/update accept & validate `branchIds`
- [x] Reports/manager-dashboard aggregate across assigned branches
- [x] Payroll primary-branch attribution (admin-only; uses primary `User.branchId`)
- [x] Web: user multi-select; write-branch selector when >1; filters
- [x] Smoke: multi-branch read (`in`) + write-branch validation + 403 outside set
- [ ] Verify build + smoke (manual)

---

## Feature C — Documents / photos attached to a user (branch manager)

### Intent

Attach **multiple photos or documents** (ID, contract, etc.) to a user and
view / download / delete them.

### Current state

No user attachments exist, but the **receipts feature is a complete working
template**: R2 storage, pre-signed PUT/GET, a metadata model, an upload flow,
and an attach/list/delete UI (`ReceiptManager`, `receipt-lightbox`). `R2Service`
already exists (`common/r2/r2.service.ts`) and now also has `listObjects`.
**Copy that pattern.**

### Data model

```prisma
// api/prisma/models/user-attachment.prisma
model UserAttachment {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  userId         String
  user           User         @relation("UserAttachments", fields: [userId], references: [id], onDelete: Cascade)
  key            String       // R2 object key: user-docs/{orgId}/{userId}/{uuid}.{ext}
  originalName   String
  contentType    String
  size           Int
  uploadedById   String
  uploadedBy     User         @relation("UserAttachmentsUploadedBy", fields: [uploadedById], references: [id])
  createdAt      DateTime     @default(now())

  @@index([organizationId])
  @@index([userId])
  @@map("user_attachment")
}
```

Add back-relations on `User` (two: owner + uploader) and `Organization`; add
`"UserAttachment"` to `TENANT_MODELS`. Migration `add_user_attachments`.

### API (mirror `receipts` module)

New `user-attachments` module (or fold into `users`), **admin-only**
(`@Roles(UserRole.admin)` — managing users is already admin-only):

- `POST /api/user-attachments/upload-url` → `{ userId, contentType, size }` →
  pre-signed PUT (`R2Service.presignPut`), key
  `user-docs/{orgId}/{userId}/{uuid}.{ext}`.
- `POST /api/user-attachments` → persist metadata `{ userId, key, contentType, size, originalName }` (validate the key prefix matches the user, like
  receipts do).
- `GET /api/user-attachments?userId=…` → list with pre-signed GET urls.
- `GET /api/user-attachments/:id/url` → fresh pre-signed GET.
- `DELETE /api/user-attachments/:id` → delete R2 object + row.

Allowed types: images + PDF (reuse) and optionally Word/Excel — **confirm with
client**. Size cap reuse `RECEIPT_MAX_SIZE` (10 MB).

**Decision:** should a manager view their _own_ documents? Default: admin-only
(simplest). If yes, allow `GET` where `userId === caller.id`.

### Frontend (reuse receipts components)

- `web/types/user-attachments/*`, `web/service/user-attachments/*`,
  `web/hooks/user-attachments/*` mirroring the receipts equivalents.
- In the **user edit modal** (or a user detail view), add an "Attachments"
  section modeled on `ReceiptManager` (upload file + camera, list, view via
  lightbox, delete). The `camera-capture-panel` + lightbox are reusable.

### Checklist

- [x] Schema: `UserAttachment` + relations + `TENANT_MODELS` + migration
- [x] `user-attachments` module (upload-url, persist, list, url, delete); admin write + manager read-own
- [x] Web types/service/hooks + attachments section in the user editor + Settings profile read-only
- [x] Smoke: upload-url shape, persist, list/scope, delete
- [ ] Verify build + smoke (manual)

---

## Cross-cutting

- **Migrations:** A → none; B → `add_branch_manager_assignments` (+ backfill);
  C → `add_user_attachments`. Run `pnpm prisma:generate` then
  `pnpm prisma:migrate --name round2` locally.
- **Env / infra:** none new — R2 is already configured.
- **Smoke tests** (`api/scripts/smoke/`): extend the existing suites; add a
  `user-attachments` suite modeled on any current one. B needs the most:
  multi-branch read (`in`), write-branch validation, and 403 outside the set.
- **Decisions (locked):**
  - B: payroll stays admin-only; multi-branch manager salary attributed to **primary** branch
  - B: keep primary/default; prompt for branch on write when manager has >1
  - C: images + PDF only; managers may view their own docs (Settings → Profile)
  - A: soft cap of 10 not enforced
