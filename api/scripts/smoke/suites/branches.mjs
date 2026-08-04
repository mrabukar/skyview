import { check, section } from "../helpers.mjs";

export async function runBranches(ctx) {
  section("Branches");
  const { admin, manager } = ctx;
  const stamp = Date.now();

  // both roles can read
  let r = await admin.req("GET", "/api/branches?limit=100");
  check("admin list branches → 200", r.status === 200, `got ${r.status}`);
  check("branch list paginated", Array.isArray(r.json?.data));
  r = await manager.req("GET", "/api/branches");
  check("manager list branches → 200", r.status === 200, `got ${r.status}`);

  // manager cannot create → 403
  r = await manager.req("POST", "/api/branches", { body: { name: `MgrBranch-${stamp}`, address: "x" } });
  check("manager create branch → 403", r.status === 403, `got ${r.status}`);

  // admin create
  r = await admin.req("POST", "/api/branches", { body: { name: `SmokeBranch-${stamp}`, address: "123 Test Rd" } });
  check("admin create branch → 201", r.status === 201, `got ${r.status} ${(r.text ?? "").slice(0, 140)}`);
  const branchId = r.json?.id;
  check("new branch active", r.json?.isActive === true);

  // duplicate name → 409
  r = await admin.req("POST", "/api/branches", { body: { name: `SMOKEBRANCH-${stamp}`, address: "y" } });
  check("admin duplicate branch name → 409", r.status === 409, `got ${r.status}`);

  if (branchId) {
    // rename
    r = await admin.req("PATCH", `/api/branches/${branchId}`, { body: { address: "456 New Ave" } });
    check("admin update branch → 200", r.status === 200 && r.json?.address === "456 New Ave", `got ${r.status}`);
    // deactivate → hidden from default list, present with includeInactive
    r = await admin.req("PATCH", `/api/branches/${branchId}/deactivate`);
    check("admin deactivate branch → 200", r.status === 200 && r.json?.isActive === false, `got ${r.status}`);
    r = await admin.req("GET", "/api/branches?limit=100");
    check("deactivated branch hidden by default", !(r.json?.data ?? []).some((b) => b.id === branchId));
    r = await admin.req("GET", "/api/branches?includeInactive=true&limit=100");
    check("deactivated branch visible with includeInactive", (r.json?.data ?? []).some((b) => b.id === branchId));
    // reactivate, confirm, then leave it deactivated so it doesn't clutter
    // the active branch list (branches are deactivate-only by design)
    r = await admin.req("PATCH", `/api/branches/${branchId}/reactivate`);
    check("admin reactivate branch → 200", r.status === 200 && r.json?.isActive === true, `got ${r.status}`);
    await admin.req("PATCH", `/api/branches/${branchId}/deactivate`);
  }

  ctx.tempBranchId = branchId ?? null;
}
