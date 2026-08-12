import { Session, check, section } from "../helpers.mjs";

const ADMIN = { email: "admin@skyviewcoffee.co.ke", password: "Admin123!" };
const MANAGER = { email: "catherine@skyviewcoffee.co.ke", password: "Manager123!" };

export async function runAuth(ctx) {
  section("Auth & session");

  const anon = new Session("anon");

  let r = await anon.req("GET", "/api/health");
  check("GET /api/health → 200", r.status === 200, `got ${r.status}`);

  r = await anon.req("GET", "/api/me");
  check("GET /api/me unauthenticated → 401", r.status === 401, `got ${r.status}`);

  // Admin
  const admin = new Session("admin");
  r = await admin.req("POST", "/api/auth/sign-in/email", { body: ADMIN });
  check(
    "admin sign-in → 200",
    r.status === 200,
    `got ${r.status} ${(r.text ?? "").slice(0, 160)}`,
  );

  r = await admin.req("GET", "/api/me");
  check("admin /api/me → role=admin", r.json?.user?.role === "admin", JSON.stringify(r.json?.user?.role));
  check("admin /api/me → branch=null", r.json?.user?.branch == null, JSON.stringify(r.json?.user?.branch));
  ctx.orgId = r.json?.user?.organization?.id ?? null;

  // Manager
  const manager = new Session("manager");
  r = await manager.req("POST", "/api/auth/sign-in/email", { body: MANAGER });
  check("manager sign-in → 200", r.status === 200, `got ${r.status}`);

  r = await manager.req("GET", "/api/me");
  check(
    "manager /api/me → role=branch_manager",
    r.json?.user?.role === "branch_manager",
    JSON.stringify(r.json?.user?.role),
  );
  const branch = r.json?.user?.branch;
  check("manager /api/me → has branch", !!branch?.id, JSON.stringify(branch));
  check(
    "manager /api/me → has branchIds",
    Array.isArray(r.json?.user?.branchIds) && r.json.user.branchIds.includes(branch?.id),
    JSON.stringify(r.json?.user?.branchIds),
  );

  ctx.admin = admin;
  ctx.manager = manager;
  ctx.branchId = branch?.id ?? null;
  ctx.branchName = branch?.name ?? null;
}
