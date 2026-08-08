import { check, section } from "../helpers.mjs";

export async function runUsers(ctx) {
  section("Users (admin-only)");
  const { admin, manager, branchId } = ctx;
  const stamp = Date.now();
  const email = `smoke.user.${stamp}@skyviewcoffee.co.ke`;

  // manager blocked
  let r = await manager.req("GET", "/api/users");
  check("manager list users → 403", r.status === 403, `got ${r.status}`);

  // admin list
  r = await admin.req("GET", "/api/users?limit=100");
  check("admin list users → 200", r.status === 200, `got ${r.status}`);
  check("user list paginated", Array.isArray(r.json?.data));

  // weak password → 400
  r = await admin.req("POST", "/api/users", {
    body: { name: "Weak", email: `weak.${stamp}@x.co`, password: "weakpass", role: "admin" },
  });
  check("admin create user weak password → 400", r.status === 400, `got ${r.status}`);

  // branch_manager without branch → 400
  r = await admin.req("POST", "/api/users", {
    body: { name: "NoBranch", email: `nob.${stamp}@x.co`, password: "Strong123!", role: "branch_manager" },
  });
  check("admin create manager without branch → 400", r.status === 400, `got ${r.status}`);

  // admin create manager (with branch + salary + a disabled page)
  r = await admin.req("POST", "/api/users", {
    body: { name: "Smoke Manager", email, password: "Strong123!", role: "branch_manager", branchId, salary: 24000, phone: "0700000000", disabledPages: ["dashboard"] },
  });
  check("admin create manager → 201", r.status === 201, `got ${r.status} ${(r.text ?? "").slice(0, 140)}`);
  const userId = r.json?.id;
  check("new user has branch + salary", r.json?.branch?.id === branchId && Number(r.json?.salary) === 24000, JSON.stringify({ b: r.json?.branch?.id, s: r.json?.salary }));
  check("new manager disabledPages round-trips", Array.isArray(r.json?.disabledPages) && r.json.disabledPages.includes("dashboard"), JSON.stringify(r.json?.disabledPages));

  // invalid page key rejected
  r = await admin.req("POST", "/api/users", {
    body: { name: "BadPage", email: `badpage.${stamp}@x.co`, password: "Strong123!", role: "branch_manager", branchId, disabledPages: ["not-a-page"] },
  });
  check("invalid disabledPages key → 400", r.status === 400, `got ${r.status}`);

  // duplicate email → 409
  r = await admin.req("POST", "/api/users", {
    body: { name: "Dup", email, password: "Strong123!", role: "admin" },
  });
  check("admin duplicate email → 409", r.status === 409, `got ${r.status}`);

  // the new manager can sign in
  if (userId) {
    const { Session } = await import("../helpers.mjs");
    const fresh = new Session("smoke-mgr");
    r = await fresh.req("POST", "/api/auth/sign-in/email", { body: { email, password: "Strong123!" } });
    check("new manager can sign in → 200", r.status === 200, `got ${r.status}`);

    // page access: dashboard is disabled for this manager, sales is not
    let pr = await fresh.req("GET", "/api/reports/manager-dashboard");
    check("disabled page (dashboard) → 403", pr.status === 403, `got ${pr.status}`);
    pr = await fresh.req("GET", "/api/daily-sales");
    check("enabled page (daily-sales) → 200", pr.status === 200, `got ${pr.status}`);
    // admin re-enables the dashboard → takes effect immediately
    await admin.req("PATCH", `/api/users/${userId}`, { body: { disabledPages: [] } });
    pr = await fresh.req("GET", "/api/reports/manager-dashboard");
    check("re-enabled dashboard → 200", pr.status === 200, `got ${pr.status}`);

    // update salary
    r = await admin.req("PATCH", `/api/users/${userId}`, { body: { salary: 26000 } });
    check("admin update salary → 200", r.status === 200 && Number(r.json?.salary) === 26000, `got ${r.status}`);

    // deactivate → revokes sessions; sign-in blocked afterwards
    r = await admin.req("PATCH", `/api/users/${userId}/deactivate`);
    check("admin deactivate user → 204", r.status === 204, `got ${r.status}`);
    const blocked = new Session("blocked");
    r = await blocked.req("POST", "/api/auth/sign-in/email", { body: { email, password: "Strong123!" } });
    check("deactivated user cannot sign in", r.status === 401 || r.status === 403, `got ${r.status}`);

    // reactivate
    r = await admin.req("PATCH", `/api/users/${userId}/activate`);
    check("admin reactivate user → 200", r.status === 200 && r.json?.isActive === true, `got ${r.status}`);
  }

  // admin cannot deactivate self
  r = await admin.req("GET", "/api/me");
  const adminId = r.json?.user?.id;
  if (adminId) {
    r = await admin.req("PATCH", `/api/users/${adminId}/deactivate`);
    check("admin cannot deactivate self → 400", r.status === 400, `got ${r.status}`);
  }
}
