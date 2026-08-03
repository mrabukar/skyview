# 02 — User Stories

Format: **As a** _role_, **I want** _action_, **so that** _value_ — followed by
acceptance criteria (AC). "Manager" = branch manager. IDs are stable; refer to
them in commits/PRs (e.g. `US-S2`).

---

## Authentication

**US-A1** — As a user, I want to sign in with email and password, so that I can
access my account securely.
- AC: valid credentials create a session; invalid return a generic error
  (no revealing whether the email exists).
- AC: session expires per platform policy; expired sessions redirect to login.

**US-A2** — As a user, I want to change my password, so that I control my account.
- AC: requires current password; all other sessions are revoked after change.

---

## Daily Sales

**US-S1** — As a manager, I want to record today's sales total for my branch,
so that head office sees daily performance without spreadsheets.
- AC: entry has date, amount, optional note; branch is implied (my branch).
- AC: amount must be > 0; date cannot be in the future.
- AC: rejected with a clear message if my branch already has an entry for
  that date (US-S4).

**US-S2** — As a manager, I want to edit today's entry, so that I can fix a
same-day mistake myself.
- AC: I can edit an entry only if its sale date is today (Africa/Nairobi).
- AC: attempts to edit older entries are rejected with a message telling me
  to contact an admin.

**US-S3** — As an admin, I want to add or correct a sales entry for any branch
and any past date, so that older mistakes can be fixed centrally.
- AC: admin can create, edit, and delete entries for any branch/date
  (not future dates).
- AC: every correction is audit-logged with before/after values.

**US-S4** — As the business owner, I want one sales total per branch per day,
so that figures are never double-counted.
- AC: uniqueness of (branch, saleDate) is enforced by the database, not only
  the UI.

**US-S5** — As an admin, I want to list/filter sales by branch and date range,
so that I can review any period.
- AC: paginated; filter by branch, from/to date. Managers see only their branch
  regardless of filters sent.

---

## Purchases & Vendors

**US-P1** — As a manager, I want to record a purchase for my branch (e.g. "10
packs of 16oz cups from Swiss Packaging at 450 each"), so that branch spending
is captured at the source.
- AC: fields: item name (free text), quantity > 0, unit price > 0, vendor
  (from managed list), date (not future), optional note.
- AC: total = quantity × unit price, computed by the server.
- AC: branch is implied (my branch); I cannot record for another branch.

**US-P2** — As an admin, I want to record purchases for any branch, so that
head-office buying is also captured.
- AC: same fields plus explicit branch selection.

**US-P3** — As a manager, I want to edit or delete only today's purchases, so
that older records stay trustworthy.
- AC: same-day rule as US-S2; admin edits/deletes anything (audit-logged).

**US-P4** — As an admin, I want a managed vendor list, so that vendor names
stay consistent and per-vendor spend reports are accurate.
- AC: add, rename, deactivate vendors; names unique (case-insensitive).
- AC: a vendor referenced by purchases cannot be hard-deleted — it is
  deactivated instead and disappears from pickers but stays on old records.
- AC: managers can read the vendor list (to pick), never modify it.

**US-P5** — As an admin, I want to filter purchases by branch, vendor, text
and date range, so that I can answer "what did we spend at Osterberg in June?"

---

## Expenses

**US-E1** — As a manager, I want to record an expense for my branch, so that
branch operating costs are captured.
- AC: fields: title, amount > 0, category, date (not future), optional note;
  branch implied.

**US-E2** — As an admin, I want to record branch or company-wide expenses, so
that costs like head-office rent are captured too.
- AC: branch optional; empty = company-wide.

**US-E3** — As an admin, I want to manage expense categories, so that
reporting stays organised.
- AC: add/rename/delete; delete blocked if category is used by any expense.

**US-E4** — As a manager, I want to see only my branch's expenses, so that I
focus on my costs. (Company-wide expenses are not shown to managers.)

**US-E5** — Same-day edit rule applies to managers; admin edits/deletes any
expense (audit-logged).

---

## Payroll

**US-Y1** — As an admin, I want each user to have a monthly salary on their
profile, so that payroll knows what to pay.
- AC: salary ≥ 0, in KSh; editable by admin only; changes audit-logged.

**US-Y2** — As an admin, I want to run payroll for the current month with one
action, so that salary expenses are recorded consistently.
- AC: the run covers all **active** users at the moment of the run.
- AC: creates one expense per user in the "Salaries" category, dated the day
  of the run, assigned to the user's branch (company-wide for head office),
  titled `Salary — <name> (<Month Year>)`.
- AC: run stores a snapshot (who, what salary) — later salary edits do not
  change past runs.

**US-Y3** — As the business owner, I want payroll to run at most once per
month, so that nobody is paid twice.
- AC: a second run for the same month is rejected (database-enforced).
- AC: future months are rejected. Past unpaid months may be run.
- AC: the UI shows paid/unpaid state for the current month and a run history.

**US-Y4** — As an admin, I want to adjust an individual salary expense after a
run (advance, deduction), so that real-world payroll variations are handled.
- AC: generated expenses are normal expenses — editable by admin like any other
  (audit-logged). The payroll run snapshot itself is immutable.

---

## Branches & Users

**US-B1** — As an admin, I want to add, rename, and deactivate branches.
- AC: deactivated branches keep their history, disappear from pickers, and
  reject new records.

**US-U1** — As an admin, I want to create users with role, branch (for
managers), phone, and salary.
- AC: manager requires a branch; admin must not have one.
- AC: email unique; strong password policy per platform.

**US-U2** — As an admin, I want to deactivate a user, so that departed staff
lose access immediately.
- AC: deactivation kills their sessions; their historical records remain.
- AC: deactivated users are excluded from future payroll runs.

---

## Reports & Audit

**US-R1** — As an admin, I want a dashboard for any period/branch with: total
sales, purchases, expenses, net profit, monthly trend, expense breakdown,
top branches, recent entries — so that I see the business at a glance.

**US-R2** — As a manager, I want a dashboard with today's sales, this month's
sales, a 14-day trend, and whether today's entry is recorded — so that I know
my branch status.

**US-R3** — As an admin, I want a financial summary (P&L style) for any
period/branch, exportable, so that I can share monthly results.

**US-R4** — As the business owner, I want every create/update/delete recorded
in an audit log (user, action, entity, before/after, timestamp), so that
figures are trustworthy with 4 branches of cash business.
- AC: audit log is append-only; no API mutates or deletes it.
- AC: admin can filter by action, user, branch, and date range.
