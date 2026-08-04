// Endpoint smoke tests — run against a live server.
//
//   pnpm smoke                 # run every suite (regression gate, self-cleaning)
//   pnpm smoke vendors         # run only the named suite(s)
//   pnpm smoke daily-sales vendors
//   SMOKE_BASE_URL=http://localhost:5000 pnpm smoke
//
// `auth` always runs first — it establishes the admin/manager sessions and the
// branch id that every other suite depends on. Requires the seed users
// (pnpm prisma:seed) and the server running.
import { BASE, section, summary } from "./helpers.mjs";
import { runAuth } from "./suites/auth.mjs";
import { runDailySales } from "./suites/daily-sales.mjs";
import { runVendors } from "./suites/vendors.mjs";
import { runPurchases } from "./suites/purchases.mjs";
import { runExpenseCategories } from "./suites/expense-categories.mjs";
import { runExpenses } from "./suites/expenses.mjs";
import { runPayroll } from "./suites/payroll.mjs";
import { runBranches } from "./suites/branches.mjs";
import { runUsers } from "./suites/users.mjs";
import { runAuditLogs } from "./suites/audit-logs.mjs";
import { runReports } from "./suites/reports.mjs";

// Registry — add one line per module as it lands.
const SUITES = {
  branches: runBranches,
  "daily-sales": runDailySales,
  vendors: runVendors,
  purchases: runPurchases,
  "expense-categories": runExpenseCategories,
  expenses: runExpenses,
  payroll: runPayroll,
  users: runUsers,
  "audit-logs": runAuditLogs,
  reports: runReports,
};

const requested = process.argv.slice(2).map((s) => s.toLowerCase());
const unknown = requested.filter((s) => !(s in SUITES));
if (unknown.length > 0) {
  console.error(`Unknown suite(s): ${unknown.join(", ")}`);
  console.error(`Available: ${Object.keys(SUITES).join(", ")}`);
  process.exit(2);
}
const toRun = requested.length > 0 ? requested : Object.keys(SUITES);

console.log(`Smoke testing ${BASE}`);
console.log(`Suites: ${toRun.join(", ")}`);

const ctx = {};
await runAuth(ctx);

if (ctx.admin && ctx.manager && ctx.branchId) {
  for (const name of toRun) {
    await SUITES[name](ctx);
  }
} else {
  section("Modules");
  console.log("  skipped — auth/branch context not resolved (see failures above)");
}

summary();
