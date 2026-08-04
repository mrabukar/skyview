import { check, section } from "../helpers.mjs";

export async function runExpenseCategories(ctx) {
  section("Expense Categories (BR-5.5)");
  const { admin, manager } = ctx;
  const stamp = Date.now();

  // read (both roles)
  let r = await admin.req("GET", "/api/expense-categories");
  check("admin list categories → 200", r.status === 200, `got ${r.status}`);
  const cats = r.json ?? [];
  check("category list is an array", Array.isArray(cats));
  const salaries = cats.find((c) => c.name === "Salaries");
  check("seed has Salaries (isSystem)", !!salaries && salaries.isSystem === true, JSON.stringify(salaries));
  ctx.salariesCategoryId = salaries?.id ?? null;
  // remember a normal category for the expenses suite
  ctx.normalCategoryId = cats.find((c) => !c.isSystem)?.id ?? null;

  r = await manager.req("GET", "/api/expense-categories");
  check("manager list categories → 200", r.status === 200, `got ${r.status}`);

  // manager cannot create → 403
  r = await manager.req("POST", "/api/expense-categories", { body: { name: `MgrCat-${stamp}` } });
  check("manager create category → 403", r.status === 403, `got ${r.status}`);

  // admin create
  r = await admin.req("POST", "/api/expense-categories", { body: { name: `SmokeCat-${stamp}`, description: "smoke" } });
  check("admin create category → 201", r.status === 201, `got ${r.status} ${(r.text ?? "").slice(0, 140)}`);
  const catId = r.json?.id;

  // duplicate name (case-insensitive) → 409
  r = await admin.req("POST", "/api/expense-categories", { body: { name: `SMOKECAT-${stamp}` } });
  check("admin duplicate category → 409", r.status === 409, `got ${r.status}`);

  // Salaries protected — rename → 403, delete → 403
  if (ctx.salariesCategoryId) {
    r = await admin.req("PATCH", `/api/expense-categories/${ctx.salariesCategoryId}`, { body: { name: "Wages" } });
    check("rename Salaries (system) → 403", r.status === 403, `got ${r.status}`);
    r = await admin.req("DELETE", `/api/expense-categories/${ctx.salariesCategoryId}`);
    check("delete Salaries (system) → 403", r.status === 403, `got ${r.status}`);
  }

  // rename normal category
  if (catId) {
    r = await admin.req("PATCH", `/api/expense-categories/${catId}`, { body: { name: `SmokeCat-${stamp}-r` } });
    check("admin rename category → 200", r.status === 200, `got ${r.status}`);
    // delete unused → 204
    r = await admin.req("DELETE", `/api/expense-categories/${catId}`);
    check("admin delete unused category → 204", r.status === 204, `got ${r.status}`);
  }
}
