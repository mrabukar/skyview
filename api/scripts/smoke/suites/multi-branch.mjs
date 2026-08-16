import { check, nairobiDate, section } from "../helpers.mjs";

/**
 * Multi-branch managers — assign 2 branches, verify read across both,
 * write requires branchId when >1, and 403 outside the set.
 */
export async function runMultiBranch(ctx) {
  section("Multi-branch managers");
  const { admin, branchId } = ctx;
  const stamp = Date.now();
  const today = nairobiDate(0);

  // Second active branch for the org
  let r = await admin.req("GET", "/api/branches?limit=100");
  check("setup: list branches → 200", r.status === 200, `got ${r.status}`);
  const branches = (r.json?.data ?? []).filter((b) => b.isActive);
  let secondBranchId = branches.find((b) => b.id !== branchId)?.id;

  if (!secondBranchId) {
    r = await admin.req("POST", "/api/branches", {
      body: {
        name: `Smoke Multi ${stamp}`,
        address: "Smoke Street",
      },
    });
    check("setup: create second branch → 201", r.status === 201, `got ${r.status}`);
    secondBranchId = r.json?.id;
  }

  if (!branchId || !secondBranchId) {
    check("setup: need two branches", false, "missing branch ids");
    return;
  }

  const email = `multi.mgr.${stamp}@skyviewcoffee.co.ke`;
  r = await admin.req("POST", "/api/users", {
    body: {
      name: "Multi Branch Mgr",
      email,
      password: "Strong123!",
      role: "branch_manager",
      branchIds: [branchId, secondBranchId],
      salary: 30000,
    },
  });
  check("admin create multi-branch manager → 201", r.status === 201, `got ${r.status} ${(r.text ?? "").slice(0, 160)}`);
  const userId = r.json?.id;
  check(
    "response has branchIds (2)",
    Array.isArray(r.json?.branchIds) && r.json.branchIds.length === 2,
    JSON.stringify(r.json?.branchIds),
  );
  check(
    "primary branchId is first",
    r.json?.branchId === branchId,
    JSON.stringify(r.json?.branchId),
  );

  if (!userId) return;

  const { Session } = await import("../helpers.mjs");
  const multi = new Session("multi-mgr");
  r = await multi.req("POST", "/api/auth/sign-in/email", {
    body: { email, password: "Strong123!" },
  });
  check("multi manager sign-in → 200", r.status === 200, `got ${r.status}`);

  r = await multi.req("GET", "/api/me");
  check(
    "/me returns branchIds",
    Array.isArray(r.json?.user?.branchIds) && r.json.user.branchIds.length === 2,
    JSON.stringify(r.json?.user?.branchIds),
  );

  // Write without branchId when >1 → 400
  r = await multi.req("POST", "/api/daily-sales", {
    body: { saleDate: today, totalAmount: 100 },
  });
  check("multi write without branchId → 400", r.status === 400, `got ${r.status}`);

  // Write to an unassigned branch → 403 (use a third or fake id)
  r = await multi.req("POST", "/api/daily-sales", {
    body: {
      branchId: "not-assigned-branch-id",
      saleDate: today,
      totalAmount: 100,
    },
  });
  check(
    "multi write outside set → 403 or 400",
    r.status === 403 || r.status === 400,
    `got ${r.status}`,
  );

  // Valid writes on both assigned branches
  r = await multi.req("POST", "/api/daily-sales", {
    body: { branchId, saleDate: today, totalAmount: 111 },
  });
  check("multi write primary branch → 201", r.status === 201, `got ${r.status}`);
  const saleA = r.json?.id;

  r = await multi.req("POST", "/api/daily-sales", {
    body: { branchId: secondBranchId, saleDate: today, totalAmount: 222 },
  });
  check("multi write second branch → 201", r.status === 201, `got ${r.status}`);
  const saleB = r.json?.id;

  r = await multi.req("GET", "/api/daily-sales?limit=100");
  const rows = r.json?.data ?? [];
  check("multi list → 200", r.status === 200, `got ${r.status}`);
  const ids = new Set(rows.map((x) => x.id));
  check(
    "multi list sees both branch sales",
    (!!saleA && ids.has(saleA)) && (!!saleB && ids.has(saleB)),
    `n=${rows.length}`,
  );
  check(
    "multi list only assigned branches",
    rows.every(
      (x) => x.branchId === branchId || x.branchId === secondBranchId,
    ),
    `foreign=${rows.filter((x) => x.branchId !== branchId && x.branchId !== secondBranchId).length}`,
  );

  // Explicit comma-separated branchId query — admin, unrestricted
  r = await admin.req("GET", `/api/daily-sales?branchId=${branchId},${secondBranchId}&limit=100`);
  const adminMultiRows = r.json?.data ?? [];
  check(
    "admin explicit multi-branch filter matches both branches",
    (!!saleA && adminMultiRows.some((x) => x.id === saleA)) &&
      (!!saleB && adminMultiRows.some((x) => x.id === saleB)),
    `n=${adminMultiRows.length}`,
  );

  // Explicit branchId query — manager narrows to a subset of their own set
  r = await multi.req("GET", `/api/daily-sales?branchId=${branchId}&limit=100`);
  const managerSubsetRows = r.json?.data ?? [];
  check(
    "multi manager explicit filter narrows to requested branch",
    managerSubsetRows.length > 0 && managerSubsetRows.every((x) => x.branchId === branchId),
    `n=${managerSubsetRows.length}`,
  );

  // Explicit branchId outside the manager's assigned set → 403
  r = await multi.req("GET", "/api/daily-sales?branchId=not-assigned-branch-id&limit=100");
  check("multi manager filter outside set → 403", r.status === 403, `got ${r.status}`);

  // Cleanup
  if (saleA) await admin.req("DELETE", `/api/daily-sales/${saleA}`);
  if (saleB) await admin.req("DELETE", `/api/daily-sales/${saleB}`);
  await admin.req("PATCH", `/api/users/${userId}/deactivate`);
}
