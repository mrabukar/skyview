/**
 * Mock API router for the Skyview demo.
 * service/client.ts calls mockRoute() instead of fetch(); every /api/* path
 * used by the app is answered here from the in-memory dataset in data.ts.
 */
import {
  auditLogs,
  categories,
  expenseCategories,
  expenses,
  inRange,
  inventory,
  meAdmin,
  meManager,
  MONTH_LABELS,
  paginate,
  products,
  purchases,
  sales,
  stockSupplies,
  stores,
  users,
} from "./data";
import type { ApiUser } from "@/types/auth/me";

const DEMO_ROLE_KEY = "skyview-demo-role";

export function getMockMe(): ApiUser {
  if (typeof window !== "undefined") {
    const role = window.localStorage.getItem(DEMO_ROLE_KEY);
    if (role === "branch_manager") return meManager;
  }
  return meAdmin;
}

export function setMockRole(role: "admin" | "branch_manager"): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(DEMO_ROLE_KEY, role);
  }
}

export function clearMockSession(): void {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(DEMO_ROLE_KEY);
    window.localStorage.removeItem("skyview-demo-signed-in");
  }
}

export function setMockSignedIn(): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem("skyview-demo-signed-in", "1");
  }
}

export function isMockSignedIn(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem("skyview-demo-signed-in") === "1";
}

class MockHttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function num(v: string | null, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function monthKeyOf(iso: string): string {
  return iso.slice(0, 7);
}

/* ---------------- report aggregation ---------------- */

function sumSales(rows: typeof sales) {
  let revenue = 0;
  let units = 0;
  let cogs = 0;
  for (const s of rows) {
    revenue += Number(s.totalAmount);
    units += s.quantitySold;
    cogs += Number(s.unitPurchasePrice) * s.quantitySold;
  }
  return { revenue, units, cogs };
}

function filterSales(from?: string | null, to?: string | null, storeId?: string | null, categoryId?: string | null) {
  return sales.filter(
    (s) =>
      inRange(s.saleDate, from, to) &&
      (!storeId || s.storeId === storeId) &&
      (!categoryId || s.product.categoryId === categoryId),
  );
}

function filterExpenses(from?: string | null, to?: string | null, storeId?: string | null) {
  return expenses.filter(
    (e) => inRange(e.expenseDate, from, to) && (!storeId || e.storeId === storeId || e.storeId === null),
  );
}

function delta(current: number, previous: number) {
  if (previous === 0) {
    return { percent: null, direction: current > 0 ? "up" : "flat", label: "vs previous period" };
  }
  const percent = ((current - previous) / previous) * 100;
  return {
    percent,
    direction: percent > 0.5 ? "up" : percent < -0.5 ? "down" : "flat",
    label: "vs previous period",
  };
}

function monthlyRows(rows: typeof sales, expRows: typeof expenses) {
  const map = new Map<string, { revenue: number; cogs: number; expenses: number }>();
  for (const s of rows) {
    const k = monthKeyOf(s.saleDate);
    const m = map.get(k) ?? { revenue: 0, cogs: 0, expenses: 0 };
    m.revenue += Number(s.totalAmount);
    m.cogs += Number(s.unitPurchasePrice) * s.quantitySold;
    map.set(k, m);
  }
  for (const e of expRows) {
    const k = monthKeyOf(e.expenseDate);
    const m = map.get(k) ?? { revenue: 0, cogs: 0, expenses: 0 };
    m.expenses += Number(e.amount);
    map.set(k, m);
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([monthKey, v]) => ({
      monthKey,
      month: MONTH_LABELS[Number(monthKey.slice(5, 7)) - 1],
      revenue: Math.round(v.revenue),
      cogs: Math.round(v.cogs),
      expenses: Math.round(v.expenses),
      netProfit: Math.round(v.revenue - v.cogs - v.expenses),
    }));
}

function expenseBreakdown(expRows: typeof expenses) {
  const map = new Map<number, number>();
  for (const e of expRows) {
    map.set(e.categoryId, (map.get(e.categoryId) ?? 0) + Number(e.amount));
  }
  return [...map.entries()]
    .map(([categoryId, amount]) => ({
      categoryId: String(categoryId),
      categoryName: expenseCategories[categoryId - 1]?.name ?? "Other",
      amount: Math.round(amount),
    }))
    .sort((a, b) => b.amount - a.amount);
}

function stockByCategory(storeId?: string | null) {
  const map = new Map<string, number>();
  for (const inv of inventory) {
    if (storeId && inv.storeId !== storeId) continue;
    map.set(inv.product.category.name, (map.get(inv.product.category.name) ?? 0) + inv.quantity);
  }
  return [...map.entries()].map(([categoryName, unitsCount], i) => ({
    categoryId: `cat-${i + 1}`,
    categoryName,
    units: unitsCount,
  }));
}

function recentSales(rows: typeof sales, count = 8) {
  return rows.slice(0, count).map((s) => ({
    id: s.id,
    quantitySold: s.quantitySold,
    totalAmount: Number(s.totalAmount),
    saleDate: s.saleDate,
    status: s.status,
    product: {
      id: s.product.id,
      name: s.product.name,
      model: s.product.model,
      category: { id: s.product.category.id, name: s.product.category.name },
    },
    store: { id: s.store.id, name: s.store.name },
    soldBy: s.soldBy,
  }));
}

function stockCounts(storeId?: string | null) {
  const rows = inventory.filter((i) => !storeId || i.storeId === storeId);
  let inStock = 0;
  let low = 0;
  let out = 0;
  let value = 0;
  for (const r of rows) {
    inStock += r.quantity;
    value += r.quantity * Number(r.product.averageCost ?? 0);
    if (r.quantity === 0) out += 1;
    else if (r.quantity <= r.lowStockThreshold) low += 1;
  }
  return { inStock, low, out, value: Math.round(value) };
}

/* ---------------- router ---------------- */

export async function mockRoute(method: string, path: string, rawBody?: unknown): Promise<unknown> {
  const url = new URL(path, "http://mock.local");
  const p = url.pathname;
  const q = url.searchParams;
  const body: Record<string, unknown> =
    typeof rawBody === "string" ? (JSON.parse(rawBody || "{}") as Record<string, unknown>) : ((rawBody as Record<string, unknown>) ?? {});

  const page = num(q.get("page"), 1);
  const limit = num(q.get("limit"), 10);
  const search = (q.get("search") ?? "").toLowerCase();
  const storeId = q.get("storeId");
  const categoryId = q.get("categoryId");
  const fromDate = q.get("fromDate");
  const toDate = q.get("toDate");

  /* ---- auth ---- */
  if (p === "/api/me") {
    if (method === "GET") {
      if (!isMockSignedIn()) throw new MockHttpError(401, "Not signed in");
      return { user: getMockMe() };
    }
    return { user: { ...getMockMe(), ...body } };
  }

  /* ---- stores ---- */
  if (p === "/api/stores" && method === "GET") {
    const rows = stores.filter((s) => !search || s.name.toLowerCase().includes(search));
    return paginate(rows, page, limit);
  }
  if (p === "/api/stores" && method === "POST") {
    return { ...stores[0], id: `store-new-${Date.now()}`, ...body, isActive: true };
  }
  if (p === "/api/stores/warehouse") return stores[0];
  if (p.startsWith("/api/stores/")) {
    const id = p.split("/")[3];
    const store = stores.find((s) => s.id === id) ?? stores[0];
    if (method === "GET") return store;
    return { ...store, ...body };
  }

  /* ---- categories ---- */
  if (p === "/api/categories" && method === "GET") return categories;
  if (p === "/api/categories" && method === "POST") {
    return { ...categories[0], id: `cat-new-${Date.now()}`, ...body };
  }
  if (p.startsWith("/api/categories/")) {
    const id = p.split("/")[3];
    const cat = categories.find((c) => c.id === id) ?? categories[0];
    if (method === "DELETE") return undefined;
    if (method === "GET") return cat;
    return { ...cat, ...body };
  }

  /* ---- products ---- */
  if (p === "/api/products" && method === "GET") {
    const rows = products.filter(
      (pr) =>
        (!search || pr.name.toLowerCase().includes(search)) &&
        (!categoryId || pr.categoryId === categoryId),
    );
    return paginate(rows, page, limit);
  }
  if (p === "/api/products" && method === "POST") {
    return { ...products[0], id: `prod-new-${Date.now()}`, ...body };
  }
  if (p.startsWith("/api/products/")) {
    const id = p.split("/")[3];
    const prod = products.find((x) => x.id === id) ?? products[0];
    if (p.endsWith("/deactivate")) return undefined;
    if (method === "GET") return prod;
    return { ...prod, ...body };
  }

  /* ---- expense categories ---- */
  if (p === "/api/expense-categories" && method === "GET") return expenseCategories;
  if (p === "/api/expense-categories" && method === "POST") {
    return { ...expenseCategories[0], id: 100 + Math.floor(Math.random() * 100), ...body };
  }
  if (p.startsWith("/api/expense-categories/")) {
    const id = Number(p.split("/")[3]);
    const cat = expenseCategories.find((c) => c.id === id) ?? expenseCategories[0];
    if (method === "DELETE") return undefined;
    if (method === "GET") return cat;
    return { ...cat, ...body };
  }

  /* ---- expenses ---- */
  if (p === "/api/expenses" && method === "GET") {
    const catFilter = q.get("categoryId");
    const companyWide = q.get("companyWideOnly") === "true";
    const rows = expenses.filter(
      (e) =>
        (!search || e.title.toLowerCase().includes(search)) &&
        (!catFilter || String(e.categoryId) === catFilter) &&
        (!storeId || e.storeId === storeId) &&
        (!companyWide || e.storeId === null) &&
        inRange(e.expenseDate, fromDate, toDate),
    );
    return paginate(rows, page, limit);
  }
  if (p === "/api/expenses" && method === "POST") {
    const catId = Number(body.categoryId ?? 9);
    return {
      ...expenses[0],
      id: `exp-new-${Date.now()}`,
      ...body,
      category: expenseCategories[catId - 1] ?? expenseCategories[8],
      store: body.storeId ? stores.find((s) => s.id === body.storeId) ?? null : null,
    };
  }
  if (p.startsWith("/api/expenses/")) {
    const id = p.split("/")[3];
    const exp = expenses.find((e) => e.id === id) ?? expenses[0];
    if (method === "DELETE") return undefined;
    if (method === "GET") return exp;
    return { ...exp, ...body };
  }

  /* ---- sales ---- */
  if (p === "/api/sales" && method === "GET") {
    const status = q.get("status");
    const rows = filterSales(fromDate, toDate, storeId, categoryId).filter(
      (s) =>
        (!search || s.product.name.toLowerCase().includes(search)) &&
        (!status || s.status === status),
    );
    return paginate(rows, page, limit);
  }
  if (p === "/api/sales" && method === "POST") {
    const prod = products.find((x) => x.id === body.productId) ?? products[0];
    const qty = Number(body.quantitySold ?? 1);
    const me = getMockMe();
    return {
      ...sales[0],
      id: `sale-new-${Date.now()}`,
      productId: prod.id,
      product: prod,
      quantitySold: qty,
      unitPrice: Number(prod.sellingPrice),
      unitPurchasePrice: Number(prod.averageCost),
      totalAmount: qty * Number(prod.sellingPrice),
      saleDate: (body.saleDate as string) ?? new Date().toISOString(),
      soldBy: { id: me.id, name: me.name, email: me.email },
      status: "active",
      corrections: [],
    };
  }
  if (p.endsWith("/correct") && p.startsWith("/api/sales/")) {
    const id = p.split("/")[3];
    const sale = sales.find((s) => s.id === id) ?? sales[0];
    return { ...sale, status: "corrected" };
  }

  /* ---- purchases ---- */
  if (p === "/api/purchases" && method === "GET") {
    const rows = purchases.filter(
      (x) =>
        (!search ||
          x.product.name.toLowerCase().includes(search) ||
          (x.invoiceNumber ?? "").toLowerCase().includes(search) ||
          (x.note ?? "").toLowerCase().includes(search)) &&
        (!categoryId || x.product.categoryId === categoryId) &&
        inRange(x.purchaseDate, fromDate, toDate),
    );
    return paginate(rows, page, limit);
  }
  if (p === "/api/purchases" && method === "POST") {
    const prod = products.find((x) => x.id === body.productId) ?? products[0];
    const qty = Number(body.quantity ?? 1);
    const unit = Number(body.unitPurchasePrice ?? prod.averageCost);
    return {
      purchase: {
        ...purchases[0],
        id: `pur-new-${Date.now()}`,
        productId: prod.id,
        product: prod,
        quantity: qty,
        unitPurchasePrice: unit,
        totalCost: qty * unit,
      },
      priceWarning: null,
    };
  }
  if (p.startsWith("/api/purchases/")) {
    const id = p.split("/")[3];
    const pur = purchases.find((x) => x.id === id) ?? purchases[0];
    return { ...pur, ...body };
  }

  /* ---- inventory ---- */
  if (p === "/api/inventory/warehouse/write-off") {
    return inventory[0];
  }
  if (p.startsWith("/api/inventory")) {
    const scope = q.get("scope");
    const productId = q.get("productId");
    let rows = inventory.filter(
      (i) =>
        (!search || i.product.name.toLowerCase().includes(search)) &&
        (!categoryId || i.product.categoryId === categoryId) &&
        (!storeId || i.storeId === storeId) &&
        (!productId || i.productId === productId),
    );
    if (p.includes("warehouse")) rows = rows.filter((i) => i.storeId === stores[0].id);
    if (scope === "low-stock") rows = rows.filter((i) => i.quantity > 0 && i.quantity <= i.lowStockThreshold);
    if (scope === "out-of-stock") rows = rows.filter((i) => i.quantity === 0);
    return paginate(rows, page, limit);
  }

  /* ---- stock supplies ---- */
  if (p === "/api/stock-supplies" && method === "GET") {
    const type = q.get("type");
    const rows = stockSupplies.filter(
      (s) =>
        (!search || s.product.name.toLowerCase().includes(search)) &&
        (!storeId || s.storeId === storeId) &&
        (!type || s.type === type) &&
        inRange(s.createdAt, fromDate, toDate),
    );
    return paginate(rows, page, limit);
  }
  if (p.startsWith("/api/stock-supplies")) {
    return { ...stockSupplies[0], id: `sup-new-${Date.now()}`, ...body };
  }

  /* ---- users ---- */
  if (p === "/api/users" && method === "GET") {
    const role = q.get("role");
    const isActive = q.get("isActive");
    const rows = users.filter(
      (u) =>
        (!search || u.name.toLowerCase().includes(search) || u.email.toLowerCase().includes(search)) &&
        (!role || u.role === role) &&
        (isActive === null || String(u.isActive) === isActive),
    );
    return paginate(rows, page, limit);
  }
  if (p === "/api/users" && method === "POST") {
    return { ...users[1], id: `user-new-${Date.now()}`, ...body };
  }
  if (p.startsWith("/api/users/")) {
    const id = p.split("/")[3];
    const user = users.find((u) => u.id === id) ?? users[0];
    if (p.endsWith("/deactivate")) return undefined;
    if (p.endsWith("/activate")) return { ...user, isActive: true };
    if (method === "GET") return user;
    return { ...user, ...body };
  }

  /* ---- audit logs ---- */
  if (p === "/api/audit-logs") {
    const action = q.get("action");
    const rows = auditLogs.filter(
      (a) =>
        (!action || a.action === action) &&
        (!storeId || a.storeId === storeId) &&
        inRange(a.createdAt, fromDate, toDate) &&
        (!search || a.user.name.toLowerCase().includes(search) || a.action.toLowerCase().includes(search)),
    );
    return paginate(rows, page, limit);
  }

  /* ---- organizations (super admin — not used in demo, safe fallbacks) ---- */
  if (p === "/api/organizations/stats") {
    return { totalOrganizations: 1, activeOrganizations: 1, totalUsers: users.length, totalStores: stores.length };
  }
  if (p === "/api/organization" || p.startsWith("/api/organizations")) {
    return {
      id: "org-skyview",
      name: "Skyview Coffee Ltd",
      hasStores: true,
      logoKey: null,
      logoUpdatedAt: null,
      isActive: true,
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2026-07-01T00:00:00.000Z",
      users: users.slice(0, 3),
      stores,
    };
  }

  /* ---- reports ---- */
  if (p === "/api/reports/admin-dashboard") {
    const rows = filterSales(fromDate, toDate, storeId, categoryId);
    const expRows = filterExpenses(fromDate, toDate, storeId);
    const { revenue, units, cogs } = sumSales(rows);
    const totalExpenses = expRows.reduce((a, e) => a + Number(e.amount), 0);
    const stock = stockCounts(storeId);

    // previous period = same length immediately before
    const from = fromDate ? new Date(fromDate) : new Date("2026-07-01");
    const to = toDate ? new Date(toDate) : new Date("2026-07-30");
    const spanMs = to.getTime() - from.getTime();
    const prevFrom = new Date(from.getTime() - spanMs).toISOString();
    const prevTo = new Date(from.getTime() - 1).toISOString();
    const prevRows = filterSales(prevFrom, prevTo, storeId, categoryId);
    const prevExp = filterExpenses(prevFrom, prevTo, storeId);
    const prev = sumSales(prevRows);
    const prevExpTotal = prevExp.reduce((a, e) => a + Number(e.amount), 0);

    const topProductsMap = new Map<string, { name: string; units: number }>();
    for (const s of rows) {
      const cur = topProductsMap.get(s.productId) ?? { name: s.product.name, units: 0 };
      cur.units += s.quantitySold;
      topProductsMap.set(s.productId, cur);
    }
    const topStoresMap = new Map<string, { name: string; revenue: number }>();
    for (const s of rows) {
      const cur = topStoresMap.get(s.storeId) ?? { name: s.store.name, revenue: 0 };
      cur.revenue += Number(s.totalAmount);
      topStoresMap.set(s.storeId, cur);
    }

    return {
      period: { from: fromDate ?? "2026-04-01", to: toDate ?? "2026-07-30", timezone: "Africa/Nairobi" },
      summary: {
        totalRevenue: Math.round(revenue),
        totalUnitsSold: units,
        cogs: Math.round(cogs),
        grossProfit: Math.round(revenue - cogs),
        totalExpenses: Math.round(totalExpenses),
        netProfit: Math.round(revenue - cogs - totalExpenses),
        currentStockValue: stock.value,
        inStockBalance: stock.inStock,
        lowStockCount: stock.low,
        outOfStockCount: stock.out,
      },
      comparison: {
        label: "vs previous period",
        previousPeriod: { from: prevFrom.slice(0, 10), to: prevTo.slice(0, 10) },
        totalRevenue: delta(revenue, prev.revenue),
        grossProfit: delta(revenue - cogs, prev.revenue - prev.cogs),
        netProfit: delta(revenue - cogs - totalExpenses, prev.revenue - prev.cogs - prevExpTotal),
        totalExpenses: delta(totalExpenses, prevExpTotal),
        totalUnitsSold: delta(units, prev.units),
      },
      charts: {
        revenueCogsExpenses: monthlyRows(rows, expRows),
        netProfitTrend: monthlyRows(rows, expRows).map((m) => ({
          month: m.month,
          monthKey: m.monthKey,
          netProfit: m.netProfit,
        })),
        expenseBreakdown: expenseBreakdown(expRows),
        stockByCategory: stockByCategory(storeId),
        topProducts: [...topProductsMap.entries()]
          .map(([productId, v]) => ({
            productId,
            productName: v.name,
            productModel: null,
            unitsSold: v.units,
          }))
          .sort((a, b) => b.unitsSold - a.unitsSold)
          .slice(0, 6),
        topStores: [...topStoresMap.entries()]
          .map(([sid, v]) => ({ storeId: sid, storeName: v.name, revenue: Math.round(v.revenue) }))
          .sort((a, b) => b.revenue - a.revenue),
      },
      recentSales: recentSales(rows),
    };
  }

  if (p === "/api/reports/manager-dashboard") {
    const me = getMockMe();
    const sid = me.storeId ?? stores[0].id;
    const today = "2026-07-30";
    const monthFrom = "2026-07-01";
    const todayRows = filterSales(today, today, sid, null);
    const monthRows = filterSales(monthFrom, today, sid, null);
    const t = sumSales(todayRows);
    const m = sumSales(monthRows);
    const stock = stockCounts(sid);

    const salesTrend: Array<{ date: string; revenue: number }> = [];
    for (let d = 13; d >= 0; d--) {
      const date = new Date("2026-07-30T00:00:00Z");
      date.setUTCDate(date.getUTCDate() - d);
      const iso = date.toISOString().slice(0, 10);
      const rows = filterSales(iso, iso, sid, null);
      salesTrend.push({ date: iso, revenue: Math.round(sumSales(rows).revenue) });
    }

    return {
      storeId: sid,
      summary: {
        todayRevenue: Math.round(t.revenue),
        todayUnitsSold: t.units,
        monthRevenue: Math.round(m.revenue),
        inStockBalance: stock.inStock,
        lowStockCount: stock.low,
        outOfStockCount: stock.out,
      },
      comparison: {
        label: "vs yesterday",
        todayRevenue: delta(t.revenue, salesTrend[salesTrend.length - 2]?.revenue ?? 0),
        monthRevenue: delta(m.revenue, m.revenue * 0.9),
      },
      charts: { salesTrend, stockByCategory: stockByCategory(sid) },
      recentSales: recentSales(monthRows),
    };
  }

  if (p === "/api/reports/financial-summary") {
    const rows = filterSales(fromDate, toDate, storeId, categoryId);
    const expRows = filterExpenses(fromDate, toDate, storeId);
    const { revenue, units, cogs } = sumSales(rows);
    const totalExpenses = expRows.reduce((a, e) => a + Number(e.amount), 0);
    const stock = stockCounts(storeId);
    const monthly = monthlyRows(rows, expRows);
    return {
      period: { from: fromDate ?? "2026-04-01", to: toDate ?? "2026-07-30", timezone: "Africa/Nairobi" },
      summary: {
        totalRevenue: Math.round(revenue),
        totalUnitsSold: units,
        cogs: Math.round(cogs),
        grossProfit: Math.round(revenue - cogs),
        totalExpenses: Math.round(totalExpenses),
        netProfit: Math.round(revenue - cogs - totalExpenses),
        currentStockValue: stock.value,
        inStockBalance: stock.inStock,
        lowStockCount: stock.low,
        outOfStockCount: stock.out,
        grossMarginPercent: revenue > 0 ? Math.round(((revenue - cogs) / revenue) * 1000) / 10 : 0,
        stockInvestment: stock.value,
      },
      expenseByCategory: expenseBreakdown(expRows),
      breakdown: {
        revenue: Math.round(revenue),
        cogs: Math.round(cogs),
        grossProfit: Math.round(revenue - cogs),
        expenses: Math.round(totalExpenses),
        netProfit: Math.round(revenue - cogs - totalExpenses),
      },
      charts: {
        revenueCogsExpenses: monthly,
        netProfitTrend: monthly.map((m) => ({ month: m.month, monthKey: m.monthKey, netProfit: m.netProfit })),
      },
    };
  }

  if (p === "/api/reports/product-distribution") {
    const rows = filterSales(fromDate, toDate, storeId, categoryId);
    const map = new Map<string, { name: string; units: number }>();
    let total = 0;
    for (const s of rows) {
      const cur = map.get(s.productId) ?? { name: s.product.name, units: 0 };
      cur.units += s.quantitySold;
      total += s.quantitySold;
      map.set(s.productId, cur);
    }
    const productsOut = [...map.entries()]
      .map(([productId, v]) => ({
        productId,
        productName: v.name,
        productModel: null,
        unitsSold: v.units,
        percent: total > 0 ? Math.round((v.units / total) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.unitsSold - a.unitsSold);

    const dates: string[] = [];
    for (let d = 27; d >= 0; d--) {
      const date = new Date("2026-07-30T00:00:00Z");
      date.setUTCDate(date.getUTCDate() - d);
      dates.push(date.toISOString().slice(0, 10));
    }
    const top5 = productsOut.slice(0, 5);
    const series = top5.map((tp) => ({
      productId: tp.productId,
      productName: tp.productName,
      productModel: null,
      values: dates.map((date) => {
        const dayRows = rows.filter((s) => s.saleDate.slice(0, 10) === date && s.productId === tp.productId);
        return dayRows.reduce((a, s) => a + s.quantitySold, 0);
      }),
    }));

    return {
      period: { from: fromDate ?? "2026-07-01", to: toDate ?? "2026-07-30", timezone: "Africa/Nairobi" },
      filters: { storeId: storeId ?? null, categoryId: categoryId ?? null },
      totalUnitsSold: total,
      products: productsOut,
      trend: { dates, series },
    };
  }

  if (p === "/api/reports/stock-report") {
    const rows = filterSales(fromDate, toDate, storeId, categoryId);
    const productRows = products
      .filter((pr) => !categoryId || pr.categoryId === categoryId)
      .map((pr) => {
        const sold = rows.filter((s) => s.productId === pr.id).reduce((a, s) => a + s.quantitySold, 0);
        const inStock = inventory
          .filter((i) => i.productId === pr.id && (!storeId || i.storeId === storeId))
          .reduce((a, i) => a + i.quantity, 0);
        const purchased = purchases
          .filter((x) => x.productId === pr.id && inRange(x.purchaseDate, fromDate, toDate))
          .reduce((a, x) => a + x.quantity, 0);
        return {
          productId: pr.id,
          productName: pr.name,
          productModel: null,
          averageCost: Number(pr.averageCost),
          purchaseDevices: purchased,
          inStock,
          salesDevices: sold,
        };
      });
    return {
      period: { from: fromDate ?? "2026-07-01", to: toDate ?? "2026-07-30", timezone: "Africa/Nairobi" },
      filters: { storeId: storeId ?? null, categoryId: categoryId ?? null },
      totals: {
        purchaseDevices: productRows.reduce((a, r) => a + r.purchaseDevices, 0),
        inStock: productRows.reduce((a, r) => a + r.inStock, 0),
        salesDevices: productRows.reduce((a, r) => a + r.salesDevices, 0),
      },
      products: productRows,
    };
  }

  throw new MockHttpError(404, `Mock route not found: ${method} ${p}`);
}

export { MockHttpError };
