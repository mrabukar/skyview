import { check, section } from "../helpers.mjs";

export async function runAuditLogs(ctx) {
  section("Audit Logs (admin-only, read-only)");
  const { admin, manager, branchId } = ctx;

  // manager blocked
  let r = await manager.req("GET", "/api/audit-logs");
  check("manager list audit → 403", r.status === 403, `got ${r.status}`);

  // generate an auditable event (create + delete a daily sale on a past date)
  const past = "2020-01-15";
  r = await admin.req("POST", "/api/daily-sales", { body: { branchId, saleDate: past, totalAmount: 123 } });
  const saleId = r.json?.id;
  if (saleId) await admin.req("DELETE", `/api/daily-sales/${saleId}`);

  // admin list
  r = await admin.req("GET", "/api/audit-logs?limit=50");
  check("admin list audit → 200", r.status === 200, `got ${r.status}`);
  const rows = r.json?.data ?? [];
  check("audit list paginated + non-empty", Array.isArray(rows) && rows.length > 0, `n=${rows.length}`);
  check("entries include actor + action", rows[0]?.user?.name != null && typeof rows[0]?.action === "string");

  // filter by action
  r = await admin.req("GET", "/api/audit-logs?action=DAILY_SALE_CREATED&limit=50");
  check("filter by action works", (r.json?.data ?? []).every((e) => e.action === "DAILY_SALE_CREATED"), `n=${r.json?.data?.length ?? 0}`);

  // unknown action → ignored (returns all), still 200
  r = await admin.req("GET", "/api/audit-logs?action=NOPE&limit=5");
  check("unknown action filter → 200", r.status === 200, `got ${r.status}`);
}
