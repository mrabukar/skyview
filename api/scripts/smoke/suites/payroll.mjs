import { check, section } from "../helpers.mjs";

export async function runPayroll(ctx) {
  section("Payroll (BR-6, per-user)");
  const { admin, manager } = ctx;

  // manager is blocked
  let r = await manager.req("GET", "/api/payroll");
  check("manager GET payroll → 403", r.status === 403, `got ${r.status}`);
  r = await manager.req("POST", "/api/payroll");
  check("manager pay-all → 403", r.status === 403, `got ${r.status}`);

  // admin status
  r = await admin.req("GET", "/api/payroll");
  check("admin GET payroll → 200", r.status === 200, `got ${r.status}`);
  const status = r.json ?? {};
  check("status has current month key", /^\d{4}-\d{2}$/.test(status.currentMonthKey ?? ""), JSON.stringify(status.currentMonthKey));
  check("status monthlyTotal > 0", Number(status.monthlyTotal) > 0, JSON.stringify(status.monthlyTotal));
  check("status activeUserCount > 0", Number(status.activeUserCount) > 0, JSON.stringify(status.activeUserCount));
  check("status users have paid flags", Array.isArray(status.users) && status.users.every((u) => typeof u.paid === "boolean"), `n=${status.users?.length}`);
  check("status history is array", Array.isArray(status.history));

  // pay an unknown user → 404 (safe, no state change)
  r = await admin.req("POST", "/api/payroll/pay-user/does-not-exist");
  check("pay unknown user → 404", r.status === 404, `got ${r.status}`);

  // Destructive per-user + all — opt in with SMOKE_PAYROLL_RUN=1.
  // Leaves real payments/expenses for the current month (immutable), so it's
  // one-shot; skipped by default.
  if (process.env.SMOKE_PAYROLL_RUN === "1") {
    const unpaid = (status.users ?? []).filter((u) => !u.paid);
    if (unpaid.length === 0) {
      console.log("  (everyone already paid this month — nothing to exercise)");
      return;
    }
    section("Payroll — destructive (SMOKE_PAYROLL_RUN=1)");
    const first = unpaid[0];

    r = await admin.req("POST", `/api/payroll/pay-user/${first.id}`);
    check("pay single user → 201", r.status === 201, `got ${r.status} ${(r.text ?? "").slice(0, 140)}`);
    const afterOne = r.json ?? {};
    check("that user now marked paid", (afterOne.users ?? []).find((u) => u.id === first.id)?.paid === true);

    // paying the same user again → 409
    r = await admin.req("POST", `/api/payroll/pay-user/${first.id}`);
    check("pay same user again → 409", r.status === 409, `got ${r.status}`);

    // pay all remaining
    if ((afterOne.remainingCount ?? 0) > 0) {
      r = await admin.req("POST", "/api/payroll");
      check("pay all remaining → 201", r.status === 201, `got ${r.status}`);
      check("current month fully paid", r.json?.currentMonthPaid === true, JSON.stringify(r.json?.currentMonthPaid));
    }
    // pay all when none remain → 409
    r = await admin.req("POST", "/api/payroll");
    check("pay all when none remain → 409", r.status === 409, `got ${r.status}`);
    console.log("  note: salary payments/expenses for this month remain (immutable) — expected.");
  } else {
    console.log("  (skipping destructive pay — set SMOKE_PAYROLL_RUN=1 to exercise it once)");
  }
}
