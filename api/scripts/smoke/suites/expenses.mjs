import { check, nairobiDate, section } from "../helpers.mjs";

export async function runExpenses(ctx) {
  section("Expenses (BR-5)");
  const { admin, manager, branchId } = ctx;
  const today = nairobiDate(0);
  const yesterday = nairobiDate(-1);
  const future = nairobiDate(2);
  const stamp = Date.now();

  // dedicated category (isolates the in-use 409 test)
  let r = await admin.req("POST", "/api/expense-categories", { body: { name: `ExpCat-${stamp}` } });
  check("setup: admin create category → 201", r.status === 201, `got ${r.status}`);
  const categoryId = r.json?.id;

  // admin create branch expense
  r = await admin.req("POST", "/api/expenses", {
    body: { title: `Rent-${stamp}`, amount: 5000, categoryId, branchId, expenseDate: today },
  });
  check("admin create branch expense → 201", r.status === 201, `got ${r.status} ${(r.text ?? "").slice(0, 160)}`);
  const expA = r.json?.id;
  check("expense has branch + category", !!r.json?.branch?.name && !!r.json?.category?.name);

  // admin create company-wide expense (no branchId)
  r = await admin.req("POST", "/api/expenses", {
    body: { title: `HQ-${stamp}`, amount: 8000, categoryId, expenseDate: today },
  });
  check("admin create company-wide expense → 201", r.status === 201, `got ${r.status}`);
  const expCW = r.json?.id;
  check("company-wide expense has null branch", r.json?.branch == null, JSON.stringify(r.json?.branch));

  // validation
  r = await admin.req("POST", "/api/expenses", { body: { title: "x", amount: 100, categoryId, branchId, expenseDate: future } });
  check("admin future date → 400", r.status === 400, `got ${r.status}`);
  r = await admin.req("POST", "/api/expenses", { body: { title: "x", amount: 0, categoryId, branchId, expenseDate: today } });
  check("admin amount 0 → 400", r.status === 400, `got ${r.status}`);
  r = await admin.req("POST", "/api/expenses", { body: { title: "x", amount: 100, categoryId: 999999, branchId, expenseDate: today } });
  check("admin unknown category → 404", r.status === 404, `got ${r.status}`);

  // manager create own branch today (no branchId)
  r = await manager.req("POST", "/api/expenses", {
    body: { title: `MgrExp-${stamp}`, amount: 1200, categoryId, expenseDate: today },
  });
  check("manager create own branch → 201", r.status === 201, `got ${r.status} ${(r.text ?? "").slice(0, 160)}`);
  const expM1 = r.json?.id;
  check("manager expense scoped to own branch", r.json?.branch?.id === branchId, JSON.stringify(r.json?.branch?.id));

  // manager list — own branch only, no company-wide rows
  r = await manager.req("GET", "/api/expenses?limit=100");
  const rows = r.json?.data ?? [];
  check("manager list → 200", r.status === 200, `got ${r.status}`);
  check("manager list only own branch (no company-wide)", rows.length > 0 && rows.every((x) => x.branch?.id === branchId), `n=${rows.length}`);

  // manager cannot see a company-wide expense
  if (expCW) {
    r = await manager.req("GET", `/api/expenses/${expCW}`);
    check("manager read company-wide expense → 403", r.status === 403, `got ${r.status}`);
  }

  // manager same-day rule
  r = await manager.req("POST", "/api/expenses", {
    body: { title: `MgrOld-${stamp}`, amount: 900, categoryId, expenseDate: yesterday },
  });
  check("manager create own branch (yesterday) → 201", r.status === 201, `got ${r.status}`);
  const expM2 = r.json?.id;
  if (expM2) {
    r = await manager.req("PATCH", `/api/expenses/${expM2}`, { body: { amount: 950 } });
    check("manager edit older expense → 403", r.status === 403, `got ${r.status}`);
  }
  if (expM1) {
    r = await manager.req("PATCH", `/api/expenses/${expM1}`, { body: { amount: 1300 } });
    check("manager edit today expense → 200", r.status === 200, `got ${r.status}`);
    r = await manager.req("DELETE", `/api/expenses/${expM1}`);
    check("manager delete expense → 403 (admin-only)", r.status === 403, `got ${r.status}`);
  }

  // category-in-use → 409
  r = await admin.req("DELETE", `/api/expense-categories/${categoryId}`);
  check("delete in-use category → 409", r.status === 409, `got ${r.status}`);

  // admin edit any + reassign to company-wide
  if (expA) {
    r = await admin.req("PATCH", `/api/expenses/${expA}`, { body: { amount: 5500 } });
    check("admin edit any expense → 200", r.status === 200, `got ${r.status}`);
    r = await admin.req("PATCH", `/api/expenses/${expA}`, { body: { branchId: null } });
    check("admin reassign expense to company-wide → 200", r.status === 200 && r.json?.branch == null, `got ${r.status} ${JSON.stringify(r.json?.branch)}`);
  }

  // cleanup
  for (const id of [expA, expCW, expM1, expM2].filter(Boolean)) {
    r = await admin.req("DELETE", `/api/expenses/${id}`);
    check(`cleanup delete expense ${String(id).slice(0, 8)} → 204`, r.status === 204, `got ${r.status}`);
  }
  r = await admin.req("DELETE", `/api/expense-categories/${categoryId}`);
  check("cleanup delete now-unused category → 204", r.status === 204, `got ${r.status}`);
}
