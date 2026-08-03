/**
 * Mock API router for the Skyview demo.
 * Scope: daily sales, branch purchases (free-text + managed vendors),
 * expenses, payroll. No stock/inventory.
 *
 * service/client.ts calls mockRoute() instead of fetch(). Mutations update
 * the in-memory dataset, so changes are visible until the page reloads.
 */
import {
  auditLogs,
  CURRENT_MONTH_KEY,
  dailySales,
  expenseCategories,
  expenses,
  inRange,
  meAdmin,
  meManager,
  MONTH_LABELS,
  monthLabelOfKey,
  paginate,
  payrollRuns,
  purchaseEntries,
  SALARIES_CATEGORY_ID,
  stores,
  todayYmd,
  users,
  vendors,
} from "./data";
import type { ApiUser } from "@/types/auth/me";
import type { DailySale } from "@/types/daily-sales/daily-sale";
import type { PurchaseEntry } from "@/types/purchases/purchase-entry";
import type { Vendor } from "@/types/vendors/vendor";
import type { PayrollRun } from "@/types/payroll/payroll";
import type { Expense } from "@/types/expenses/expense";
import type { User } from "@/types/users/user";

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

let idCounter = 1000;
function newId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function meAsRef() {
  const me = getMockMe();
  return { id: me.id, name: me.name, email: me.email };
}

/* ---------------- aggregation helpers ---------------- */

function filterDailySales(from?: string | null, to?: string | null, storeId?: string | null) {
  return dailySales.filter(
    (s) => inRange(s.saleDate, from, to) && (!storeId || s.storeId === storeId),
  );
}

function filterPurchases(from?: string | null, to?: string | null, storeId?: string | null) {
  return purchaseEntries.filter(
    (p) => inRange(p.purchaseDate, from, to) && (!storeId || p.storeId === storeId),
  );
}

function filterExpenses(from?: string | null, to?: string | null, storeId?: string | null) {
  return expenses.filter(
    (e) => inRange(e.expenseDate, from, to) && (!storeId || e.storeId === storeId || e.storeId === null),
  );
}

function sum(rows: Array<{ totalAmount?: number | string; totalCost?: number | string; amount?: number | string }>): number {
  return rows.reduce(
    (a, r) => a + Number(r.totalAmount ?? r.totalCost ?? r.amount ?? 0),
    0,
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

function monthlyRows(from?: string | null, to?: string | null, storeId?: string | null) {
  const map = new Map<string, { revenue: number; cogs: number; expenses: number }>();
  const bump = (key: string, field: "revenue" | "cogs" | "expenses", amount: number) => {
    const m = map.get(key) ?? { revenue: 0, cogs: 0, expenses: 0 };
    m[field] += amount;
    map.set(key, m);
  };
  for (const s of filterDailySales(from, to, storeId)) bump(s.saleDate.slice(0, 7), "revenue", Number(s.totalAmount));
  for (const p of filterPurchases(from, to, storeId)) bump(p.purchaseDate.slice(0, 7), "cogs", Number(p.totalCost));
  for (const e of filterExpenses(from, to, storeId)) bump(e.expenseDate.slice(0, 7), "expenses", Number(e.amount));
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

function expenseBreakdown(rows: Expense[]) {
  const map = new Map<number, number>();
  for (const e of rows) map.set(e.categoryId, (map.get(e.categoryId) ?? 0) + Number(e.amount));
  return [...map.entries()]
    .map(([categoryId, amount]) => ({
      categoryId: String(categoryId),
      categoryName: expenseCategories.find((c) => c.id === categoryId)?.name ?? "Other",
      amount: Math.round(amount),
    }))
    .sort((a, b) => b.amount - a.amount);
}

/** Recent daily sales in the DashboardRecentSale shape the tables expect. */
function recentDailySales(rows: DailySale[], count = 8) {
  return rows.slice(0, count).map((s) => ({
    id: s.id,
    quantitySold: 1,
    totalAmount: Number(s.totalAmount),
    saleDate: s.saleDate,
    status: "active",
    product: {
      id: "daily-total",
      name: "Daily sales total",
      model: null,
      category: { id: 0, name: "Sales" },
    },
    store: { id: s.store.id, name: s.store.name },
    soldBy: s.enteredBy,
  }));
}

function periodBounds(fromDate?: string | null, toDate?: string | null) {
  const to = toDate ?? todayYmd();
  const from = fromDate ?? `${to.slice(0, 7)}-01`;
  return { from, to };
}

/* ---------------- router ---------------- */

export async function mockRoute(method: string, path: string, rawBody?: unknown): Promise<unknown> {
  const url = new URL(path, "http://mock.local");
  const p = url.pathname;
  const q = url.searchParams;
  const body: Record<string, unknown> =
    typeof rawBody === "string"
      ? (JSON.parse(rawBody || "{}") as Record<string, unknown>)
      : ((rawBody as Record<string, unknown>) ?? {});

  const page = num(q.get("page"), 1);
  const limit = num(q.get("limit"), 10);
  const search = (q.get("search") ?? "").toLowerCase();
  const qStoreId = q.get("storeId");
  const fromDate = q.get("fromDate");
  const toDate = q.get("toDate");

  const me = getMockMe();
  const isManager = me.role === "branch_manager";
  // managers only ever see their own branch
  const scopeStoreId = isManager ? me.storeId : qStoreId;

  /* ---- auth ---- */
  if (p === "/api/me") {
    if (method === "GET") {
      if (!isMockSignedIn()) throw new MockHttpError(401, "Not signed in");
      return { user: getMockMe() };
    }
    return { user: { ...getMockMe(), ...body } };
  }

  /* ---- branches (stores) ---- */
  if (p === "/api/stores" && method === "GET") {
    const rows = stores.filter((s) => !search || s.name.toLowerCase().includes(search));
    return paginate(rows, page, limit);
  }
  if (p === "/api/stores" && method === "POST") {
    const store = {
      id: newId("store"),
      name: String(body.name ?? "New Branch"),
      address: String(body.address ?? ""),
      isActive: true,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    stores.push(store);
    return store;
  }
  if (p.startsWith("/api/stores/")) {
    const id = p.split("/")[3];
    const store = stores.find((s) => s.id === id);
    if (!store) throw new MockHttpError(404, "Branch not found");
    if (p.endsWith("/deactivate")) {
      store.isActive = false;
      return undefined;
    }
    if (p.endsWith("/reactivate")) {
      store.isActive = true;
      return store;
    }
    if (method === "GET") return store;
    Object.assign(store, body, { updatedAt: nowIso() });
    return store;
  }

  /* ---- vendors (managed list) ---- */
  if (p === "/api/vendors" && method === "GET") {
    return vendors.filter((v) => v.isActive || q.get("includeInactive") === "true");
  }
  if (p === "/api/vendors" && method === "POST") {
    const name = String(body.name ?? "").trim();
    if (!name) throw new MockHttpError(400, "Vendor name is required");
    if (vendors.some((v) => v.name.toLowerCase() === name.toLowerCase())) {
      throw new MockHttpError(409, "A vendor with this name already exists");
    }
    const vendor: Vendor = {
      id: newId("vendor"),
      name,
      isActive: true,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      _count: { purchases: 0 },
    };
    vendors.push(vendor);
    return vendor;
  }
  if (p.startsWith("/api/vendors/")) {
    const id = p.split("/")[3];
    const vendor = vendors.find((v) => v.id === id);
    if (!vendor) throw new MockHttpError(404, "Vendor not found");
    if (method === "DELETE") {
      const used = purchaseEntries.some((pe) => pe.vendorId === id);
      if (used) {
        // soft-deactivate when referenced by purchases
        vendor.isActive = false;
        vendor.updatedAt = nowIso();
        return undefined;
      }
      vendors.splice(vendors.indexOf(vendor), 1);
      return undefined;
    }
    Object.assign(vendor, body, { updatedAt: nowIso() });
    return vendor;
  }

  /* ---- daily sales ---- */
  if (p === "/api/daily-sales" && method === "GET") {
    const rows = dailySales.filter(
      (s) =>
        (!scopeStoreId || s.storeId === scopeStoreId) &&
        inRange(s.saleDate, fromDate, toDate) &&
        (!search || s.store.name.toLowerCase().includes(search) || (s.note ?? "").toLowerCase().includes(search)),
    );
    return paginate(rows, page, limit);
  }
  if (p === "/api/daily-sales" && method === "POST") {
    const storeId = isManager ? (me.storeId ?? "") : String(body.storeId ?? "");
    const store = stores.find((s) => s.id === storeId);
    if (!store) throw new MockHttpError(400, "Branch is required");
    const saleDate = String(body.saleDate ?? todayYmd());
    if (saleDate > todayYmd()) throw new MockHttpError(400, "Sale date cannot be in the future");
    if (dailySales.some((s) => s.storeId === storeId && s.saleDate === saleDate)) {
      throw new MockHttpError(409, `${store.name} already has a sales entry for ${saleDate}. Edit the existing entry instead.`);
    }
    const rec: DailySale = {
      id: newId("dsale"),
      storeId,
      store: { id: store.id, name: store.name },
      saleDate,
      totalAmount: Number(body.totalAmount ?? 0),
      note: body.note ? String(body.note) : null,
      enteredById: me.id,
      enteredBy: meAsRef(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    dailySales.unshift(rec);
    dailySales.sort((a, b) => b.saleDate.localeCompare(a.saleDate));
    return rec;
  }
  if (p.startsWith("/api/daily-sales/")) {
    const id = p.split("/")[3];
    const rec = dailySales.find((s) => s.id === id);
    if (!rec) throw new MockHttpError(404, "Sales entry not found");
    if (isManager && rec.storeId !== me.storeId) throw new MockHttpError(403, "You can only manage your own branch");
    if (method === "DELETE") {
      if (isManager) throw new MockHttpError(403, "Only an admin can delete sales entries");
      dailySales.splice(dailySales.indexOf(rec), 1);
      return undefined;
    }
    if (isManager && rec.saleDate !== todayYmd()) {
      throw new MockHttpError(403, "Managers can only edit today's entry. Ask an admin to correct older entries.");
    }
    if (body.saleDate !== undefined) rec.saleDate = String(body.saleDate);
    if (body.totalAmount !== undefined) rec.totalAmount = Number(body.totalAmount);
    if (body.note !== undefined) rec.note = body.note ? String(body.note) : null;
    rec.updatedAt = nowIso();
    return rec;
  }

  /* ---- purchases ---- */
  if (p === "/api/purchases" && method === "GET") {
    const vendorId = q.get("vendorId");
    const rows = purchaseEntries.filter(
      (x) =>
        (!scopeStoreId || x.storeId === scopeStoreId) &&
        (!vendorId || x.vendorId === vendorId) &&
        inRange(x.purchaseDate, fromDate, toDate) &&
        (!search ||
          x.itemName.toLowerCase().includes(search) ||
          x.vendor.name.toLowerCase().includes(search) ||
          (x.note ?? "").toLowerCase().includes(search)),
    );
    return paginate(rows, page, limit);
  }
  if (p === "/api/purchases" && method === "POST") {
    const storeId = isManager ? (me.storeId ?? "") : String(body.storeId ?? "");
    const store = stores.find((s) => s.id === storeId);
    if (!store) throw new MockHttpError(400, "Branch is required");
    const vendor = vendors.find((v) => v.id === body.vendorId);
    if (!vendor) throw new MockHttpError(400, "Vendor is required");
    const quantity = Number(body.quantity ?? 0);
    const unitPrice = Number(body.unitPrice ?? 0);
    if (quantity <= 0) throw new MockHttpError(400, "Quantity must be positive");
    if (unitPrice <= 0) throw new MockHttpError(400, "Unit price must be positive");
    if (vendor._count) vendor._count.purchases += 1;
    const rec: PurchaseEntry = {
      id: newId("pentry"),
      storeId,
      store: { id: store.id, name: store.name },
      itemName: String(body.itemName ?? "").trim(),
      quantity,
      unitPrice,
      totalCost: quantity * unitPrice,
      vendorId: vendor.id,
      vendor: { id: vendor.id, name: vendor.name },
      purchaseDate: String(body.purchaseDate ?? todayYmd()),
      note: body.note ? String(body.note) : null,
      createdById: me.id,
      createdBy: meAsRef(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    purchaseEntries.unshift(rec);
    purchaseEntries.sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate));
    return rec;
  }
  if (p.startsWith("/api/purchases/")) {
    const id = p.split("/")[3];
    const rec = purchaseEntries.find((x) => x.id === id);
    if (!rec) throw new MockHttpError(404, "Purchase not found");
    if (isManager && rec.storeId !== me.storeId) throw new MockHttpError(403, "You can only manage your own branch");
    if (method === "DELETE") {
      if (isManager && rec.purchaseDate !== todayYmd()) {
        throw new MockHttpError(403, "Managers can only remove today's purchases. Ask an admin for older entries.");
      }
      purchaseEntries.splice(purchaseEntries.indexOf(rec), 1);
      return undefined;
    }
    if (isManager && rec.purchaseDate !== todayYmd()) {
      throw new MockHttpError(403, "Managers can only edit today's purchases. Ask an admin to correct older entries.");
    }
    if (body.itemName !== undefined) rec.itemName = String(body.itemName).trim();
    if (body.quantity !== undefined) rec.quantity = Number(body.quantity);
    if (body.unitPrice !== undefined) rec.unitPrice = Number(body.unitPrice);
    if (body.vendorId !== undefined) {
      const vendor = vendors.find((v) => v.id === body.vendorId);
      if (!vendor) throw new MockHttpError(400, "Vendor not found");
      rec.vendorId = vendor.id;
      rec.vendor = { id: vendor.id, name: vendor.name };
    }
    if (body.purchaseDate !== undefined) rec.purchaseDate = String(body.purchaseDate);
    if (body.note !== undefined) rec.note = body.note ? String(body.note) : null;
    rec.totalCost = rec.quantity * Number(rec.unitPrice);
    rec.updatedAt = nowIso();
    return rec;
  }

  /* ---- payroll ---- */
  if (p === "/api/payroll" && method === "GET") {
    const activeUsers = users.filter((u) => u.isActive);
    return {
      currentMonthKey: CURRENT_MONTH_KEY,
      currentMonthLabel: monthLabelOfKey(CURRENT_MONTH_KEY),
      currentMonthPaid: payrollRuns.some((r) => r.monthKey === CURRENT_MONTH_KEY),
      monthlyTotal: activeUsers.reduce((a, u) => a + (u.salary ?? 0), 0),
      activeUserCount: activeUsers.length,
      runs: [...payrollRuns].sort((a, b) => b.monthKey.localeCompare(a.monthKey)),
    };
  }
  if (p === "/api/payroll" && method === "POST") {
    if (isManager) throw new MockHttpError(403, "Only an admin can run payroll");
    const monthKey = String(body.monthKey ?? CURRENT_MONTH_KEY);
    if (monthKey > CURRENT_MONTH_KEY) throw new MockHttpError(400, "Cannot pay salaries for a future month");
    if (payrollRuns.some((r) => r.monthKey === monthKey)) {
      throw new MockHttpError(409, `Salaries for ${monthLabelOfKey(monthKey)} have already been paid. The next run unlocks when a new month starts.`);
    }
    const activeUsers = users.filter((u) => u.isActive);
    const run: PayrollRun = {
      id: newId("payroll"),
      monthKey,
      monthLabel: monthLabelOfKey(monthKey),
      totalAmount: activeUsers.reduce((a, u) => a + (u.salary ?? 0), 0),
      userCount: activeUsers.length,
      paidAt: nowIso(),
      paidById: me.id,
      paidBy: { id: me.id, name: me.name },
      users: activeUsers.map((u) => ({
        id: u.id,
        name: u.name,
        salary: u.salary ?? 0,
        storeName: u.store?.name ?? null,
      })),
    };
    payrollRuns.push(run);
    // create the matching salary expenses
    for (const u of activeUsers) {
      expenses.unshift({
        id: newId("exp"),
        title: `Salary — ${u.name} (${run.monthLabel})`,
        amount: u.salary ?? 0,
        categoryId: SALARIES_CATEGORY_ID,
        category: expenseCategories[SALARIES_CATEGORY_ID - 1],
        storeId: u.storeId,
        store: u.store ? { id: u.store.id, name: u.store.name } : null,
        expenseDate: nowIso(),
        note: `Payroll run ${run.monthLabel}`,
        createdById: me.id,
        createdBy: meAsRef(),
        createdAt: nowIso(),
        updatedAt: nowIso(),
      });
    }
    return run;
  }

  /* ---- expense categories ---- */
  if (p === "/api/expense-categories" && method === "GET") return expenseCategories;
  if (p === "/api/expense-categories" && method === "POST") {
    const cat = {
      id: Math.max(...expenseCategories.map((c) => c.id)) + 1,
      name: String(body.name ?? "New category"),
      description: body.description ? String(body.description) : null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    expenseCategories.push(cat);
    return cat;
  }
  if (p.startsWith("/api/expense-categories/")) {
    const id = Number(p.split("/")[3]);
    const cat = expenseCategories.find((c) => c.id === id);
    if (!cat) throw new MockHttpError(404, "Category not found");
    if (method === "DELETE") {
      if (expenses.some((e) => e.categoryId === id)) {
        throw new MockHttpError(409, "Category is used by existing expenses");
      }
      expenseCategories.splice(expenseCategories.indexOf(cat), 1);
      return undefined;
    }
    if (method === "GET") return cat;
    Object.assign(cat, body, { updatedAt: nowIso() });
    return cat;
  }

  /* ---- expenses ---- */
  if (p === "/api/expenses" && method === "GET") {
    const catFilter = q.get("categoryId");
    const companyWide = q.get("companyWideOnly") === "true";
    const rows = expenses.filter(
      (e) =>
        (!search || e.title.toLowerCase().includes(search)) &&
        (!catFilter || String(e.categoryId) === catFilter) &&
        (isManager
          ? e.storeId === me.storeId
          : (!qStoreId || e.storeId === qStoreId) && (!companyWide || e.storeId === null)) &&
        inRange(e.expenseDate, fromDate, toDate),
    );
    return paginate(rows, page, limit);
  }
  if (p === "/api/expenses" && method === "POST") {
    const catId = Number(body.categoryId ?? 9);
    const storeId = isManager ? me.storeId : body.storeId ? String(body.storeId) : null;
    const store = storeId ? stores.find((s) => s.id === storeId) ?? null : null;
    const rec: Expense = {
      id: newId("exp"),
      title: String(body.title ?? "").trim(),
      amount: Number(body.amount ?? 0),
      categoryId: catId,
      category: expenseCategories.find((c) => c.id === catId) ?? expenseCategories[expenseCategories.length - 1],
      storeId: store?.id ?? null,
      store: store ? { id: store.id, name: store.name } : null,
      expenseDate: String(body.expenseDate ?? todayYmd()),
      note: body.note ? String(body.note) : null,
      createdById: me.id,
      createdBy: meAsRef(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    expenses.unshift(rec);
    return rec;
  }
  if (p.startsWith("/api/expenses/")) {
    const id = p.split("/")[3];
    const rec = expenses.find((e) => e.id === id);
    if (!rec) throw new MockHttpError(404, "Expense not found");
    if (isManager && rec.storeId !== me.storeId) throw new MockHttpError(403, "You can only manage your own branch");
    if (method === "DELETE") {
      if (isManager) throw new MockHttpError(403, "Only an admin can delete expenses");
      expenses.splice(expenses.indexOf(rec), 1);
      return undefined;
    }
    if (method === "GET") return rec;
    if (isManager && rec.expenseDate.slice(0, 10) !== todayYmd()) {
      throw new MockHttpError(403, "Managers can only edit today's expenses. Ask an admin to correct older entries.");
    }
    if (body.title !== undefined) rec.title = String(body.title);
    if (body.amount !== undefined) rec.amount = Number(body.amount);
    if (body.categoryId !== undefined) {
      rec.categoryId = Number(body.categoryId);
      rec.category = expenseCategories.find((c) => c.id === rec.categoryId) ?? rec.category;
    }
    if (body.storeId !== undefined && !isManager) {
      const store = body.storeId ? stores.find((s) => s.id === body.storeId) ?? null : null;
      rec.storeId = store?.id ?? null;
      rec.store = store ? { id: store.id, name: store.name } : null;
    }
    if (body.expenseDate !== undefined) rec.expenseDate = String(body.expenseDate);
    if (body.note !== undefined) rec.note = body.note ? String(body.note) : null;
    rec.updatedAt = nowIso();
    return rec;
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
    const storeId = body.storeId ? String(body.storeId) : null;
    const store = storeId ? stores.find((s) => s.id === storeId) ?? null : null;
    const user: User = {
      id: newId("user"),
      name: String(body.name ?? "New User"),
      email: String(body.email ?? "user@skyviewcoffee.co.ke"),
      role: body.role === "admin" ? "admin" : "branch_manager",
      phone: body.phone ? String(body.phone) : null,
      salary: Number(body.salary ?? 0),
      isActive: true,
      storeId: store?.id ?? null,
      store: store ? { id: store.id, name: store.name } : null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    users.push(user);
    return user;
  }
  if (p.startsWith("/api/users/")) {
    const id = p.split("/")[3];
    const user = users.find((u) => u.id === id);
    if (!user) throw new MockHttpError(404, "User not found");
    if (p.endsWith("/deactivate")) {
      user.isActive = false;
      return undefined;
    }
    if (p.endsWith("/activate")) {
      user.isActive = true;
      return user;
    }
    if (method === "GET") return user;
    if (body.name !== undefined) user.name = String(body.name);
    if (body.email !== undefined) user.email = String(body.email);
    if (body.role !== undefined) user.role = body.role === "admin" ? "admin" : "branch_manager";
    if (body.phone !== undefined) user.phone = body.phone ? String(body.phone) : null;
    if (body.salary !== undefined) user.salary = Number(body.salary);
    if (body.storeId !== undefined) {
      const store = body.storeId ? stores.find((s) => s.id === body.storeId) ?? null : null;
      user.storeId = store?.id ?? null;
      user.store = store ? { id: store.id, name: store.name } : null;
    }
    user.updatedAt = nowIso();
    return user;
  }

  /* ---- audit logs ---- */
  if (p === "/api/audit-logs") {
    const action = q.get("action");
    const rows = auditLogs.filter(
      (a) =>
        (!action || a.action === action) &&
        (!scopeStoreId || a.storeId === scopeStoreId) &&
        inRange(a.createdAt, fromDate, toDate) &&
        (!search || a.user.name.toLowerCase().includes(search) || a.action.toLowerCase().includes(search)),
    );
    return paginate(rows, page, limit);
  }

  /* ---- organization ---- */
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
      updatedAt: nowIso(),
      users: users.slice(0, 3),
      stores,
    };
  }

  /* ---- reports ---- */
  if (p === "/api/reports/admin-dashboard") {
    const { from, to } = periodBounds(fromDate, toDate);
    const salesRows = filterDailySales(from, to, scopeStoreId);
    const purchaseRows = filterPurchases(from, to, scopeStoreId);
    const expenseRows = filterExpenses(from, to, scopeStoreId);
    const revenue = sum(salesRows);
    const cogs = sum(purchaseRows);
    const totalExpenses = sum(expenseRows);

    const fromD = new Date(from);
    const toD = new Date(to);
    const spanMs = Math.max(toD.getTime() - fromD.getTime(), 24 * 3600 * 1000);
    const prevFrom = new Date(fromD.getTime() - spanMs).toISOString().slice(0, 10);
    const prevTo = new Date(fromD.getTime() - 24 * 3600 * 1000).toISOString().slice(0, 10);
    const prevRevenue = sum(filterDailySales(prevFrom, prevTo, scopeStoreId));
    const prevCogs = sum(filterPurchases(prevFrom, prevTo, scopeStoreId));
    const prevExpenses = sum(filterExpenses(prevFrom, prevTo, scopeStoreId));

    const topStoresMap = new Map<string, { name: string; revenue: number }>();
    for (const s of salesRows) {
      const cur = topStoresMap.get(s.storeId) ?? { name: s.store.name, revenue: 0 };
      cur.revenue += Number(s.totalAmount);
      topStoresMap.set(s.storeId, cur);
    }

    const monthly = monthlyRows(from, to, scopeStoreId);

    return {
      period: { from, to, timezone: "Africa/Nairobi" },
      summary: {
        totalRevenue: Math.round(revenue),
        totalUnitsSold: salesRows.length,
        cogs: Math.round(cogs),
        grossProfit: Math.round(revenue - cogs),
        totalExpenses: Math.round(totalExpenses),
        netProfit: Math.round(revenue - cogs - totalExpenses),
        currentStockValue: 0,
        inStockBalance: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
      },
      comparison: {
        label: "vs previous period",
        previousPeriod: { from: prevFrom, to: prevTo },
        totalRevenue: delta(revenue, prevRevenue),
        grossProfit: delta(revenue - cogs, prevRevenue - prevCogs),
        netProfit: delta(revenue - cogs - totalExpenses, prevRevenue - prevCogs - prevExpenses),
        totalExpenses: delta(totalExpenses, prevExpenses),
        totalUnitsSold: delta(salesRows.length, filterDailySales(prevFrom, prevTo, scopeStoreId).length),
      },
      charts: {
        revenueCogsExpenses: monthly,
        netProfitTrend: monthly.map((m) => ({ month: m.month, monthKey: m.monthKey, netProfit: m.netProfit })),
        expenseBreakdown: expenseBreakdown(expenseRows),
        stockByCategory: [],
        topProducts: [],
        topStores: [...topStoresMap.entries()]
          .map(([sid, v]) => ({ storeId: sid, storeName: v.name, revenue: Math.round(v.revenue) }))
          .sort((a, b) => b.revenue - a.revenue),
      },
      recentSales: recentDailySales(salesRows),
    };
  }

  if (p === "/api/reports/manager-dashboard") {
    const sid = me.storeId ?? stores[0].id;
    const today = todayYmd();
    const monthFrom = `${today.slice(0, 7)}-01`;
    const todayRows = filterDailySales(today, today, sid);
    const monthRows = filterDailySales(monthFrom, today, sid);

    const salesTrend: Array<{ date: string; revenue: number }> = [];
    for (let d = 13; d >= 0; d--) {
      const date = new Date();
      date.setDate(date.getDate() - d);
      const iso = date.toISOString().slice(0, 10);
      salesTrend.push({ date: iso, revenue: Math.round(sum(filterDailySales(iso, iso, sid))) });
    }

    return {
      storeId: sid,
      summary: {
        todayRevenue: Math.round(sum(todayRows)),
        todayUnitsSold: todayRows.length,
        monthRevenue: Math.round(sum(monthRows)),
        inStockBalance: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
      },
      comparison: {
        label: "vs yesterday",
        todayRevenue: delta(sum(todayRows), salesTrend[salesTrend.length - 2]?.revenue ?? 0),
        monthRevenue: delta(sum(monthRows), sum(monthRows) * 0.9),
      },
      charts: { salesTrend, stockByCategory: [] },
      recentSales: recentDailySales(monthRows),
    };
  }

  if (p === "/api/reports/financial-summary") {
    const { from, to } = periodBounds(fromDate, toDate);
    const salesRows = filterDailySales(from, to, scopeStoreId);
    const purchaseRows = filterPurchases(from, to, scopeStoreId);
    const expenseRows = filterExpenses(from, to, scopeStoreId);
    const revenue = sum(salesRows);
    const cogs = sum(purchaseRows);
    const totalExpenses = sum(expenseRows);
    const monthly = monthlyRows(from, to, scopeStoreId);
    return {
      period: { from, to, timezone: "Africa/Nairobi" },
      summary: {
        totalRevenue: Math.round(revenue),
        totalUnitsSold: salesRows.length,
        cogs: Math.round(cogs),
        grossProfit: Math.round(revenue - cogs),
        totalExpenses: Math.round(totalExpenses),
        netProfit: Math.round(revenue - cogs - totalExpenses),
        currentStockValue: 0,
        inStockBalance: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
        grossMarginPercent: revenue > 0 ? Math.round(((revenue - cogs) / revenue) * 1000) / 10 : 0,
        stockInvestment: 0,
      },
      expenseByCategory: expenseBreakdown(expenseRows),
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

  throw new MockHttpError(404, `Mock route not found: ${method} ${p}`);
}

export { MockHttpError };
