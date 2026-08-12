import { check, nairobiDate, section } from "../helpers.mjs";

export async function runReports(ctx) {
  section("Reports");
  const { admin, manager } = ctx;
  const to = nairobiDate(0);
  const from = nairobiDate(-60);

  // manager cannot hit admin dashboard
  let r = await manager.req("GET", "/api/reports/admin-dashboard");
  check("manager admin-dashboard → 403", r.status === 403, `got ${r.status}`);

  // admin dashboard
  r = await admin.req("GET", `/api/reports/admin-dashboard?fromDate=${from}&toDate=${to}`);
  check("admin-dashboard → 200", r.status === 200, `got ${r.status}`);
  const ad = r.json ?? {};
  check("admin-dashboard summary shape", ad.summary && typeof ad.summary.totalRevenue === "number" && typeof ad.summary.netProfit === "number", JSON.stringify(Object.keys(ad.summary ?? {})));
  check("net = revenue - cogs - expenses", ad.summary && ad.summary.netProfit === ad.summary.totalRevenue - ad.summary.cogs - ad.summary.totalExpenses, JSON.stringify(ad.summary));
  check("admin-dashboard charts present", Array.isArray(ad.charts?.revenueCogsExpenses) && Array.isArray(ad.charts?.topStores) && Array.isArray(ad.recentSales));
  check("comparison deltas present", !!ad.comparison?.totalRevenue && typeof ad.comparison.totalRevenue.direction === "string");

  // manager dashboard (own branch)
  r = await manager.req("GET", "/api/reports/manager-dashboard");
  check("manager-dashboard → 200", r.status === 200, `got ${r.status}`);
  const md = r.json ?? {};
  check("manager-dashboard summary shape", md.summary && typeof md.summary.todayRevenue === "number" && typeof md.summary.monthRevenue === "number");
  check("manager-dashboard 14-day trend", Array.isArray(md.charts?.salesTrend) && md.charts.salesTrend.length === 14, `n=${md.charts?.salesTrend?.length}`);

  // financial summary
  r = await admin.req("GET", `/api/reports/financial-summary?fromDate=${from}&toDate=${to}`);
  check("financial-summary → 200", r.status === 200, `got ${r.status}`);
  const fs = r.json ?? {};
  check("financial-summary breakdown", fs.breakdown && fs.breakdown.netProfit === fs.breakdown.revenue - fs.breakdown.cogs - fs.breakdown.expenses, JSON.stringify(fs.breakdown));
  check("financial-summary expenseByCategory is array", Array.isArray(fs.expenseByCategory));
  check("gross margin percent present", typeof fs.summary?.grossMarginPercent === "number");

  // branch filter accepted
  r = await admin.req("GET", `/api/reports/admin-dashboard?fromDate=${from}&toDate=${to}&branchId=${ctx.branchId}`);
  check("admin-dashboard branch filter → 200", r.status === 200, `got ${r.status}`);

  // vendor spend (admin, org-wide)
  r = await admin.req("GET", `/api/reports/vendor-spend?fromDate=${from}&toDate=${to}`);
  check("vendor-spend → 200", r.status === 200, `got ${r.status}`);
  const vs = r.json ?? {};
  check("vendor-spend shape", Array.isArray(vs.vendors) && typeof vs.totalAmount === "number" && typeof vs.vendorCount === "number", JSON.stringify(Object.keys(vs)));
  check(
    "vendor-spend rows have amount + count + percent",
    (vs.vendors ?? []).every((v) => typeof v.totalAmount === "number" && typeof v.purchaseCount === "number" && typeof v.percent === "number" && typeof v.vendorName === "string"),
    `n=${vs.vendors?.length}`,
  );
  check(
    "vendor-spend sorted desc by amount",
    (vs.vendors ?? []).every((v, i, a) => i === 0 || a[i - 1].totalAmount >= v.totalAmount),
    "not sorted",
  );
  check(
    "vendor-spend total = sum of rows",
    vs.totalAmount === (vs.vendors ?? []).reduce((s, v) => s + v.totalAmount, 0),
    `total=${vs.totalAmount}`,
  );

  // vendor spend visible to managers (branch-scoped, not 403)
  r = await manager.req("GET", `/api/reports/vendor-spend?fromDate=${from}&toDate=${to}`);
  check("manager vendor-spend → 200", r.status === 200, `got ${r.status}`);
}
