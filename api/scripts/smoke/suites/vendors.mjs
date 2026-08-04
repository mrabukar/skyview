import { check, section } from "../helpers.mjs";

export async function runVendors(ctx) {
  section("Vendors (BR-4)");
  const { admin, manager } = ctx;
  const unique = `SmokeVendor-${Date.now()}`;

  // manager can read the list
  let r = await manager.req("GET", "/api/vendors");
  check("manager list vendors → 200", r.status === 200, `got ${r.status}`);
  check("vendor list is an array", Array.isArray(r.json), typeof r.json);

  // manager cannot create → 403
  r = await manager.req("POST", "/api/vendors", { body: { name: `${unique}-mgr` } });
  check("manager create vendor → 403", r.status === 403, `got ${r.status}`);

  // admin creates
  r = await admin.req("POST", "/api/vendors", { body: { name: unique } });
  check("admin create vendor → 201", r.status === 201, `got ${r.status} ${(r.text ?? "").slice(0, 140)}`);
  const vendorId = r.json?.id;
  check("created vendor active with 0 purchases", r.json?.isActive === true && r.json?._count?.purchases === 0);

  // duplicate name (case-insensitive) → 409
  r = await admin.req("POST", "/api/vendors", { body: { name: unique.toUpperCase() } });
  check("admin duplicate name (case-insensitive) → 409", r.status === 409, `got ${r.status}`);

  // rename
  if (vendorId) {
    r = await admin.req("PATCH", `/api/vendors/${vendorId}`, { body: { name: `${unique}-renamed` } });
    check("admin rename vendor → 200", r.status === 200, `got ${r.status}`);
    check("rename applied", r.json?.name === `${unique}-renamed`, JSON.stringify(r.json?.name));
  }

  // unused vendor → hard delete
  if (vendorId) {
    r = await admin.req("DELETE", `/api/vendors/${vendorId}`);
    check("admin delete unused vendor → 200 (deleted)", r.status === 200 && r.json?.action === "deleted", `got ${r.status} ${JSON.stringify(r.json)}`);
    r = await admin.req("GET", `/api/vendors?includeInactive=true`);
    const stillThere = (r.json ?? []).some((v) => v.id === vendorId);
    check("deleted vendor is gone", !stillThere);
  }

  // stash a vendor id for the Purchases suite (referenced-vendor soft-delete)
  r = await admin.req("GET", "/api/vendors");
  ctx.vendorId = (r.json ?? [])[0]?.id ?? null;
}
