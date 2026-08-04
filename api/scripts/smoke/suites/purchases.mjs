import { check, nairobiDate, section } from "../helpers.mjs";

export async function runPurchases(ctx) {
  section("Purchases (BR-3) + vendor soft-delete (BR-4.3)");
  const { admin, manager, branchId } = ctx;
  const today = nairobiDate(0);
  const yesterday = nairobiDate(-1);
  const future = nairobiDate(2);
  const stamp = Date.now();
  const item = `SmokeCups-${stamp}`;

  // dedicated vendor so the soft-delete assertion is isolated
  let r = await admin.req("POST", "/api/vendors", { body: { name: `PurVendor-${stamp}` } });
  check("setup: admin create vendor → 201", r.status === 201, `got ${r.status}`);
  const vendorId = r.json?.id;

  // admin create — server computes total (10 × 45.5 = 455)
  r = await admin.req("POST", "/api/purchases", {
    body: { branchId, itemName: item, quantity: 10, unitPrice: 45.5, vendorId, purchaseDate: today },
  });
  check("admin create purchase → 201", r.status === 201, `got ${r.status} ${(r.text ?? "").slice(0, 160)}`);
  const purchaseA = r.json?.id;
  check("server computed totalCost = 455", Number(r.json?.totalCost) === 455, JSON.stringify(r.json?.totalCost));
  check("row has branch + vendor + createdBy", !!r.json?.branch?.name && !!r.json?.vendor?.name && !!r.json?.createdBy?.name);

  // unknown/inactive vendor → 400
  r = await admin.req("POST", "/api/purchases", {
    body: { branchId, itemName: item, quantity: 1, unitPrice: 1, vendorId: "does-not-exist", purchaseDate: today },
  });
  check("admin unknown vendor → 400", r.status === 400, `got ${r.status}`);

  // future date → 400
  r = await admin.req("POST", "/api/purchases", {
    body: { branchId, itemName: item, quantity: 1, unitPrice: 1, vendorId, purchaseDate: future },
  });
  check("admin future date → 400", r.status === 400, `got ${r.status}`);

  // admin missing branchId → 400
  r = await admin.req("POST", "/api/purchases", {
    body: { itemName: item, quantity: 1, unitPrice: 1, vendorId, purchaseDate: today },
  });
  check("admin missing branchId → 400", r.status === 400, `got ${r.status}`);

  // manager create own branch today (no branchId)
  r = await manager.req("POST", "/api/purchases", {
    body: { itemName: `${item}-mgr`, quantity: 2, unitPrice: 100, vendorId, purchaseDate: today },
  });
  check("manager create own branch (today) → 201", r.status === 201, `got ${r.status} ${(r.text ?? "").slice(0, 160)}`);
  const mgrToday = r.json?.id;
  check("manager row scoped to own branch", r.json?.branchId === branchId, JSON.stringify(r.json?.branchId));

  // manager list scoped to own branch
  r = await manager.req("GET", "/api/purchases?limit=100");
  const rows = r.json?.data ?? [];
  check("manager list → 200", r.status === 200, `got ${r.status}`);
  check("manager list only own branch", rows.length > 0 && rows.every((x) => x.branchId === branchId), `n=${rows.length}`);

  // search + vendor filters (admin)
  r = await admin.req("GET", `/api/purchases?search=${encodeURIComponent(item)}&limit=100`);
  check("admin search filter finds item", (r.json?.data ?? []).some((x) => x.id === purchaseA), `n=${r.json?.data?.length ?? 0}`);
  r = await admin.req("GET", `/api/purchases?vendorId=${vendorId}&limit=100`);
  check("admin vendor filter works", (r.json?.data ?? []).every((x) => x.vendor?.id === vendorId), `n=${r.json?.data?.length ?? 0}`);

  // manager same-day rule — create yesterday, then edit/delete must 403
  r = await manager.req("POST", "/api/purchases", {
    body: { itemName: `${item}-old`, quantity: 1, unitPrice: 50, vendorId, purchaseDate: yesterday },
  });
  check("manager create own branch (yesterday) → 201", r.status === 201, `got ${r.status}`);
  const mgrYesterday = r.json?.id;
  if (mgrYesterday) {
    r = await manager.req("PATCH", `/api/purchases/${mgrYesterday}`, { body: { note: "x" } });
    check("manager edit older purchase → 403", r.status === 403, `got ${r.status}`);
    r = await manager.req("DELETE", `/api/purchases/${mgrYesterday}`);
    check("manager delete older purchase → 403", r.status === 403, `got ${r.status}`);
  }

  // manager may edit + delete today's own purchase
  if (mgrToday) {
    r = await manager.req("PATCH", `/api/purchases/${mgrToday}`, { body: { note: "same-day ok" } });
    check("manager edit today purchase → 200", r.status === 200, `got ${r.status}`);
    r = await manager.req("DELETE", `/api/purchases/${mgrToday}`);
    check("manager delete today purchase → 204", r.status === 204, `got ${r.status}`);
  }

  // admin edit any — quantity change recomputes total (4 × 45.5 = 182)
  if (purchaseA) {
    r = await admin.req("PATCH", `/api/purchases/${purchaseA}`, { body: { quantity: 4 } });
    check("admin edit any purchase → 200", r.status === 200, `got ${r.status}`);
    check("total recomputed = 182", Number(r.json?.totalCost) === 182, JSON.stringify(r.json?.totalCost));
  }

  // BR-4.3 — vendor now referenced by purchaseA → DELETE deactivates (not hard delete)
  r = await admin.req("DELETE", `/api/vendors/${vendorId}`);
  check("delete referenced vendor → deactivated", r.status === 200 && r.json?.action === "deactivated", `got ${r.status} ${JSON.stringify(r.json)}`);
  r = await admin.req("GET", "/api/vendors");
  check("deactivated vendor hidden from active list", !(r.json ?? []).some((v) => v.id === vendorId));
  r = await admin.req("GET", "/api/vendors?includeInactive=true");
  const inactive = (r.json ?? []).find((v) => v.id === vendorId);
  check("deactivated vendor still present (inactive)", inactive && inactive.isActive === false, JSON.stringify(inactive?.isActive));

  // cleanup — remove purchases, then the now-unused vendor hard-deletes
  for (const id of [purchaseA, mgrYesterday].filter(Boolean)) {
    r = await admin.req("DELETE", `/api/purchases/${id}`);
    check(`cleanup delete purchase ${String(id).slice(0, 8)} → 204`, r.status === 204, `got ${r.status}`);
  }
  r = await admin.req("DELETE", `/api/vendors/${vendorId}`);
  check("cleanup delete now-unused vendor → deleted", r.status === 200 && r.json?.action === "deleted", `got ${r.status} ${JSON.stringify(r.json)}`);
}
