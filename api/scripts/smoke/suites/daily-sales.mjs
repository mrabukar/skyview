import { check, nairobiDate, section } from "../helpers.mjs";

export async function runDailySales(ctx) {
  section("Daily Sales (BR-2)");
  const { admin, manager, branchId } = ctx;
  const today = nairobiDate(0);
  const yesterday = nairobiDate(-1);
  const future = nairobiDate(2);
  const createdByAdmin = [];

  // admin create today
  let r = await admin.req("POST", "/api/daily-sales", {
    body: { branchId, saleDate: today, totalAmount: 32450 },
  });
  check("admin create today → 201", r.status === 201, `got ${r.status} ${(r.text ?? "").slice(0, 160)}`);
  const todayId = r.json?.id;
  if (todayId) createdByAdmin.push(todayId);
  check("created row has branch + enteredBy", !!r.json?.branch?.name && !!r.json?.enteredBy?.name);

  // multiple entries for the same branch+day are allowed
  r = await admin.req("POST", "/api/daily-sales", {
    body: { branchId, saleDate: today, totalAmount: 100 },
  });
  check("admin second same-day entry → 201", r.status === 201, `got ${r.status}`);
  const todayId2 = r.json?.id;
  if (todayId2) createdByAdmin.push(todayId2);

  // future date
  r = await admin.req("POST", "/api/daily-sales", {
    body: { branchId, saleDate: future, totalAmount: 100 },
  });
  check("admin future date → 400", r.status === 400, `got ${r.status}`);

  // non-positive amount
  r = await admin.req("POST", "/api/daily-sales", {
    body: { branchId, saleDate: yesterday, totalAmount: 0 },
  });
  check("admin amount 0 → 400", r.status === 400, `got ${r.status}`);

  // admin without branchId
  r = await admin.req("POST", "/api/daily-sales", {
    body: { saleDate: today, totalAmount: 100 },
  });
  check("admin missing branchId → 400", r.status === 400, `got ${r.status}`);

  // manager creates for own branch (no branchId), a past day to avoid the today dup
  r = await manager.req("POST", "/api/daily-sales", {
    body: { saleDate: yesterday, totalAmount: 18000 },
  });
  check("manager create own branch (yesterday) → 201", r.status === 201, `got ${r.status} ${(r.text ?? "").slice(0, 160)}`);
  const mgrYesterdayId = r.json?.id;
  check("manager row scoped to own branch", r.json?.branchId === branchId, JSON.stringify(r.json?.branchId));

  // manager list is scoped to own branch
  r = await manager.req("GET", "/api/daily-sales?limit=100");
  const rows = r.json?.data ?? [];
  check("manager list → 200", r.status === 200, `got ${r.status}`);
  check(
    "manager list only own branch",
    rows.length > 0 && rows.every((x) => x.branchId === branchId),
    `n=${rows.length}`,
  );

  // manager editing an older entry → 403 (same-day rule)
  if (mgrYesterdayId) {
    r = await manager.req("PATCH", `/api/daily-sales/${mgrYesterdayId}`, {
      body: { totalAmount: 19000 },
    });
    check("manager edit older entry → 403", r.status === 403, `got ${r.status}`);
  }

  // manager delete → 403 (admin-only)
  if (todayId) {
    r = await manager.req("DELETE", `/api/daily-sales/${todayId}`);
    check("manager delete → 403", r.status === 403, `got ${r.status}`);
  }

  // admin edits any entry → 200
  if (todayId) {
    r = await admin.req("PATCH", `/api/daily-sales/${todayId}`, {
      body: { totalAmount: 33000, note: "smoke" },
    });
    check("admin edit any entry → 200", r.status === 200, `got ${r.status}`);
    check("admin edit applied", Number(r.json?.totalAmount) === 33000, JSON.stringify(r.json?.totalAmount));
  }

  // cleanup — remove everything created during the run
  if (mgrYesterdayId) createdByAdmin.push(mgrYesterdayId);
  for (const id of createdByAdmin) {
    r = await admin.req("DELETE", `/api/daily-sales/${id}`);
    check(`cleanup delete ${String(id).slice(0, 8)} → 204`, r.status === 204, `got ${r.status}`);
  }
}
