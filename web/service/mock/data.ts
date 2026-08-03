/**
 * Skyview Coffee (Bubble Tea Palace) — demo mock dataset.
 * Scope: daily sales, branch purchases (free-text items + managed vendors),
 * expenses, and payroll. No stock/inventory tracking.
 *
 * Data is generated deterministically, with dates relative to "today",
 * so the demo always looks current. No backend is required.
 */
import type { Store } from "@/types/stores/store";
import type { User } from "@/types/users/user";
import type { ApiUser } from "@/types/auth/me";
import type { Expense } from "@/types/expenses/expense";
import type { ExpenseCategory } from "@/types/expenses/expense-category";
import type { DailySale } from "@/types/daily-sales/daily-sale";
import type { PurchaseEntry } from "@/types/purchases/purchase-entry";
import type { Vendor } from "@/types/vendors/vendor";
import type { PayrollRun } from "@/types/payroll/payroll";

/* ------------------------------------------------------------------ */
/* Deterministic RNG                                                   */
/* ------------------------------------------------------------------ */
let seed = 20260730;
export function rand(): number {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
}
export function randInt(min: number, max: number): number {
  return min + Math.floor(rand() * (max - min + 1));
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

const NOW = new Date();

export function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function daysAgoDate(n: number): Date {
  const d = new Date(NOW);
  d.setDate(d.getDate() - n);
  return d;
}

export function daysAgo(n: number, hour = 10): string {
  const d = daysAgoDate(n);
  d.setHours(hour, randInt(0, 59), 0, 0);
  return d.toISOString();
}

export function daysAgoYmd(n: number): string {
  return ymd(daysAgoDate(n));
}

export function monthKeyOfDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export const MONTH_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function monthLabelOfKey(key: string): string {
  const [y, m] = key.split("-");
  return `${MONTH_FULL[Number(m) - 1]} ${y}`;
}

export const CURRENT_MONTH_KEY = monthKeyOfDate(NOW);

/* ------------------------------------------------------------------ */
/* Branches                                                            */
/* ------------------------------------------------------------------ */
export const stores: Store[] = [
  {
    id: "store-hub-karen",
    name: "Hub Mall – Karen",
    address: "The Hub Karen, Dagoretti Road, Nairobi",
    isActive: true,
    createdAt: daysAgo(400),
    updatedAt: daysAgo(30),
  },
  {
    id: "store-runda",
    name: "Runda Mall",
    address: "Runda Mall, Kiambu Road, Nairobi",
    isActive: true,
    createdAt: daysAgo(380),
    updatedAt: daysAgo(25),
  },
  {
    id: "store-langata",
    name: "One Stop Arcade – Langata",
    address: "One Stop Arcade, Langata Road, Nairobi",
    isActive: true,
    createdAt: daysAgo(300),
    updatedAt: daysAgo(20),
  },
  {
    id: "store-mombasa",
    name: "Mombasa City",
    address: "Nyerere Avenue, Mombasa",
    isActive: true,
    createdAt: daysAgo(220),
    updatedAt: daysAgo(10),
  },
];

/* ------------------------------------------------------------------ */
/* Users (with monthly salary)                                         */
/* ------------------------------------------------------------------ */
export const users: User[] = [
  {
    id: "user-admin",
    name: "Skyview Admin",
    email: "admin@skyviewcoffee.co.ke",
    role: "admin",
    phone: "0723534990",
    salary: 60000,
    isActive: true,
    storeId: null,
    store: null,
    createdAt: daysAgo(400),
    updatedAt: daysAgo(5),
  },
  {
    id: "user-catherine",
    name: "Catherine Wanjiru",
    email: "catherine@skyviewcoffee.co.ke",
    role: "branch_manager",
    phone: "0712000001",
    salary: 25000,
    isActive: true,
    storeId: "store-hub-karen",
    store: { id: "store-hub-karen", name: "Hub Mall – Karen" },
    createdAt: daysAgo(390),
    updatedAt: daysAgo(12),
  },
  {
    id: "user-brian",
    name: "Brian Otieno",
    email: "brian@skyviewcoffee.co.ke",
    role: "branch_manager",
    phone: "0712000002",
    salary: 25000,
    isActive: true,
    storeId: "store-runda",
    store: { id: "store-runda", name: "Runda Mall" },
    createdAt: daysAgo(370),
    updatedAt: daysAgo(40),
  },
  {
    id: "user-amina",
    name: "Amina Hassan",
    email: "amina@skyviewcoffee.co.ke",
    role: "branch_manager",
    phone: "0712000003",
    salary: 22000,
    isActive: true,
    storeId: "store-mombasa",
    store: { id: "store-mombasa", name: "Mombasa City" },
    createdAt: daysAgo(210),
    updatedAt: daysAgo(8),
  },
  {
    id: "user-kevin",
    name: "Kevin Mwangi",
    email: "kevin@skyviewcoffee.co.ke",
    role: "branch_manager",
    phone: "0712000004",
    salary: 22000,
    isActive: true,
    storeId: "store-langata",
    store: { id: "store-langata", name: "One Stop Arcade – Langata" },
    createdAt: daysAgo(290),
    updatedAt: daysAgo(60),
  },
];

export const meAdmin: ApiUser = {
  id: "user-admin",
  email: "admin@skyviewcoffee.co.ke",
  name: "Skyview Admin",
  role: "admin",
  storeId: null,
  organizationId: "org-skyview",
  isActive: true,
  phone: "0723534990",
  store: null,
  organization: {
    id: "org-skyview",
    name: "Skyview Coffee Ltd",
    hasStores: true,
    logoKey: null,
    logoUpdatedAt: null,
  },
};

export const meManager: ApiUser = {
  id: "user-catherine",
  email: "catherine@skyviewcoffee.co.ke",
  name: "Catherine Wanjiru",
  role: "branch_manager",
  storeId: "store-hub-karen",
  organizationId: "org-skyview",
  isActive: true,
  phone: "0712000001",
  store: {
    id: "store-hub-karen",
    name: "Hub Mall – Karen",
    address: "The Hub Karen, Dagoretti Road, Nairobi",
    isActive: true,
  },
  organization: {
    id: "org-skyview",
    name: "Skyview Coffee Ltd",
    hasStores: true,
    logoKey: null,
    logoUpdatedAt: null,
  },
};

/* ------------------------------------------------------------------ */
/* Vendors (managed list)                                              */
/* ------------------------------------------------------------------ */
const vendorNames = [
  "Carrefour",
  "Osterberg",
  "Maasai Boba",
  "Swiss Packaging",
  "Lotus Group",
  "Savora Flavors",
  "FengSheng Boba",
];

export const vendors: Vendor[] = vendorNames.map((name, i) => ({
  id: `vendor-${i + 1}`,
  name,
  isActive: true,
  createdAt: daysAgo(300),
  updatedAt: daysAgo(50),
  _count: { purchases: 0 },
}));

/* ------------------------------------------------------------------ */
/* Expense categories                                                  */
/* ------------------------------------------------------------------ */
const expenseCategoryDefs = [
  ["Rent", "Monthly branch rent"],
  ["Salaries", "Staff salaries and wages"],
  ["Service Charge", "Mall service charges"],
  ["Transport", "Daily transport allowances and delivery costs"],
  ["Repairs & Maintenance", "Equipment repair and replacement"],
  ["Internet & Phone", "Connectivity bills"],
  ["Promotional Levy", "Mall promotional levies"],
  ["Utilities", "Electricity and water"],
  ["Other", "Miscellaneous expenses"],
] as const;

export const expenseCategories: ExpenseCategory[] = expenseCategoryDefs.map(
  ([name, description], i) => ({
    id: i + 1,
    name,
    description,
    createdAt: daysAgo(400),
    updatedAt: daysAgo(200),
  }),
);

export const SALARIES_CATEGORY_ID = 2;

/* ------------------------------------------------------------------ */
/* Expenses                                                            */
/* ------------------------------------------------------------------ */
const expenseTemplates: Array<[string, number, number, string | null]> = [
  ["Branch rent", 1, 67785, "store-hub-karen"],
  ["Branch rent", 1, 58200, "store-runda"],
  ["Branch rent", 1, 41500, "store-langata"],
  ["Branch rent", 1, 46800, "store-mombasa"],
  ["Mall service charge", 3, 8197, "store-hub-karen"],
  ["Mall service charge", 3, 7450, "store-runda"],
  ["Daily transport allowance", 4, 9000, "store-hub-karen"],
  ["Delivery costs & allowances", 4, 16835, "store-runda"],
  ["Boba pot chip replacement & repair", 5, 7400, "store-hub-karen"],
  ["Blender service", 5, 3500, "store-mombasa"],
  ["Internet (fiber)", 6, 4300, "store-hub-karen"],
  ["Internet (fiber)", 6, 4300, "store-runda"],
  ["Promotional levy", 7, 1811, "store-hub-karen"],
  ["Electricity", 8, 12400, "store-hub-karen"],
  ["Electricity", 8, 9800, "store-mombasa"],
  ["Sticker printing", 9, 2400, null],
  ["Staff uniforms", 9, 6150, null],
];

export const expenses: Expense[] = [];
let expenseId = 1;

function pushExpense(e: Omit<Expense, "id">): Expense {
  const rec = { ...e, id: `exp-${expenseId++}` };
  expenses.push(rec);
  return rec;
}

for (let month = 0; month < 4; month++) {
  for (const [title, categoryId, base, storeId] of expenseTemplates) {
    if (month > 0 && (categoryId === 5 || categoryId === 9) && rand() < 0.6) continue;
    const day = month * 30 + randInt(2, 26);
    const store = storeId ? stores.find((s) => s.id === storeId)! : null;
    const amount = Math.round(base * (0.92 + rand() * 0.16));
    pushExpense({
      title,
      amount,
      categoryId,
      category: expenseCategories[categoryId - 1],
      storeId,
      store: store ? { id: store.id, name: store.name } : null,
      expenseDate: daysAgo(day),
      note: null,
      createdById: "user-admin",
      createdBy: { id: "user-admin", name: "Skyview Admin", email: "admin@skyviewcoffee.co.ke" },
      createdAt: daysAgo(day),
      updatedAt: daysAgo(day),
    });
  }
}

/* ------------------------------------------------------------------ */
/* Payroll — previous 3 months already paid; current month open        */
/* ------------------------------------------------------------------ */
export const payrollRuns: PayrollRun[] = [];

function monthKeyMinus(n: number): string {
  const d = new Date(NOW);
  d.setDate(1);
  d.setMonth(d.getMonth() - n);
  return monthKeyOfDate(d);
}

for (let back = 3; back >= 1; back--) {
  const key = monthKeyMinus(back);
  const activeUsers = users.filter((u) => u.isActive);
  const total = activeUsers.reduce((a, u) => a + u.salary, 0);
  // paid on ~28th of that month → approximate as back*30 - 27 days ago
  const paidDaysAgo = Math.max(1, back * 30 - 27);
  const paidAt = daysAgo(paidDaysAgo, 15);
  payrollRuns.push({
    id: `payroll-${key}`,
    monthKey: key,
    monthLabel: monthLabelOfKey(key),
    totalAmount: total,
    userCount: activeUsers.length,
    paidAt,
    paidById: "user-admin",
    paidBy: { id: "user-admin", name: "Skyview Admin" },
    users: activeUsers.map((u) => ({
      id: u.id,
      name: u.name,
      salary: u.salary,
      storeName: u.store?.name ?? null,
    })),
  });
  // matching salary expenses
  for (const u of activeUsers) {
    pushExpense({
      title: `Salary — ${u.name} (${monthLabelOfKey(key)})`,
      amount: u.salary,
      categoryId: SALARIES_CATEGORY_ID,
      category: expenseCategories[SALARIES_CATEGORY_ID - 1],
      storeId: u.storeId,
      store: u.store ? { id: u.store.id, name: u.store.name } : null,
      expenseDate: paidAt,
      note: `Payroll run ${monthLabelOfKey(key)}`,
      createdById: "user-admin",
      createdBy: { id: "user-admin", name: "Skyview Admin", email: "admin@skyviewcoffee.co.ke" },
      createdAt: paidAt,
      updatedAt: paidAt,
    });
  }
}

expenses.sort((a, b) => b.expenseDate.localeCompare(a.expenseDate));

/* ------------------------------------------------------------------ */
/* Daily sales — one total per branch per day                          */
/* ------------------------------------------------------------------ */
const managersByStore: Record<string, User> = {
  "store-hub-karen": users[1],
  "store-runda": users[2],
  "store-langata": users[4],
  "store-mombasa": users[3],
};

// typical daily revenue per branch (KSh)
const dailyBase: Record<string, number> = {
  "store-hub-karen": 32000,
  "store-runda": 26000,
  "store-langata": 17000,
  "store-mombasa": 21000,
};

export const dailySales: DailySale[] = [];
let dailySaleId = 1;
for (let day = 0; day < 120; day++) {
  for (const store of stores) {
    // occasionally a branch misses a day's entry
    if (rand() < 0.04) continue;
    const who = managersByStore[store.id] ?? users[0];
    const weekendBoost = daysAgoDate(day).getDay() % 6 === 0 ? 1.25 : 1;
    const amount = Math.round((dailyBase[store.id] * (0.75 + rand() * 0.5) * weekendBoost) / 10) * 10;
    dailySales.push({
      id: `dsale-${dailySaleId++}`,
      storeId: store.id,
      store: { id: store.id, name: store.name },
      saleDate: daysAgoYmd(day),
      totalAmount: amount,
      note: null,
      enteredById: who.id,
      enteredBy: { id: who.id, name: who.name, email: who.email },
      createdAt: daysAgo(day, 20),
      updatedAt: daysAgo(day, 20),
    });
  }
}
dailySales.sort((a, b) => b.saleDate.localeCompare(a.saleDate));

/* ------------------------------------------------------------------ */
/* Purchases — free-text supply items per branch                       */
/* ------------------------------------------------------------------ */
const supplyItems: Array<[string, string, number, number, number]> = [
  // [itemName, unit hint → vendorId, unitPrice, qtyMin, qtyMax]
  ["Paper cups 16oz (pack of 50)", "vendor-4", 450, 4, 20],
  ["Sealing film rolls", "vendor-4", 1200, 1, 6],
  ["Tapioca boba pearls 3kg", "vendor-3", 2200, 2, 10],
  ["Popping boba — passion", "vendor-7", 1800, 1, 6],
  ["Popping boba — strawberry", "vendor-7", 1800, 1, 6],
  ["Fresh milk 1L", "vendor-1", 145, 20, 80],
  ["Sugar 2kg", "vendor-1", 320, 5, 20],
  ["Ice cream tubs 5L", "vendor-2", 2500, 2, 8],
  ["Flavour syrup — caramel 750ml", "vendor-6", 950, 2, 8],
  ["Flavour syrup — taro 750ml", "vendor-6", 980, 2, 8],
  ["Coffee beans 1kg", "vendor-2", 1450, 3, 12],
  ["Tea leaves 500g", "vendor-5", 780, 3, 10],
  ["Straws jumbo (pack of 100)", "vendor-4", 380, 3, 12],
  ["Napkins & tissues", "vendor-1", 260, 5, 15],
  ["Matcha powder 250g", "vendor-5", 1650, 1, 5],
];

export const purchaseEntries: PurchaseEntry[] = [];
let purchaseId = 1;
for (let day = 0; day < 120; day++) {
  for (const store of stores) {
    // each branch buys supplies roughly every 2-3 days
    if (rand() < 0.6) continue;
    const nEntries = randInt(1, 3);
    for (let e = 0; e < nEntries; e++) {
      const [itemName, vendorId, unitPrice, qMin, qMax] = pick(supplyItems);
      const vendor = vendors.find((v) => v.id === vendorId)!;
      if (vendor._count) vendor._count.purchases += 1;
      const who = rand() < 0.75 ? (managersByStore[store.id] ?? users[0]) : users[0];
      const quantity = randInt(qMin, qMax);
      const price = Math.round(unitPrice * (0.95 + rand() * 0.1));
      purchaseEntries.push({
        id: `pentry-${purchaseId++}`,
        storeId: store.id,
        store: { id: store.id, name: store.name },
        itemName,
        quantity,
        unitPrice: price,
        totalCost: quantity * price,
        vendorId: vendor.id,
        vendor: { id: vendor.id, name: vendor.name },
        purchaseDate: daysAgoYmd(day),
        note: null,
        createdById: who.id,
        createdBy: { id: who.id, name: who.name, email: who.email },
        createdAt: daysAgo(day, 11),
        updatedAt: daysAgo(day, 11),
      });
    }
  }
}
purchaseEntries.sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate));

/* ------------------------------------------------------------------ */
/* Audit logs                                                          */
/* ------------------------------------------------------------------ */
export interface MockAuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userId: string;
  user: { id: string; name: string; email: string; role: string };
  storeId: string | null;
  store: { id: string; name: string } | null;
  before: unknown;
  after: unknown;
  metadata: unknown;
  createdAt: string;
}

const auditActions: Array<[string, string]> = [
  ["SALE_CREATED", "DailySale"],
  ["EXPENSE_CREATED", "Expense"],
  ["PURCHASE_CREATED", "Purchase"],
  ["USER_UPDATED", "User"],
  ["STORE_UPDATED", "Store"],
];

export const auditLogs: MockAuditLog[] = [];
for (let i = 0; i < 40; i++) {
  const [action, entityType] = pick(auditActions);
  const user = pick(users.filter((u) => u.isActive));
  const store = user.storeId ? stores.find((s) => s.id === user.storeId)! : pick(stores);
  auditLogs.push({
    id: `audit-${i + 1}`,
    action,
    entityType,
    entityId: `${entityType.toLowerCase()}-${randInt(1, 200)}`,
    userId: user.id,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    storeId: store.id,
    store: { id: store.id, name: store.name },
    before: null,
    after: { demo: true },
    metadata: { source: "demo" },
    createdAt: daysAgo(randInt(0, 60), randInt(8, 20)),
  });
}
auditLogs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
export function paginate<T>(rows: T[], page = 1, limit = 10) {
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const p = Math.min(Math.max(1, page), totalPages);
  return {
    data: rows.slice((p - 1) * limit, (p - 1) * limit + limit),
    meta: { total, page: p, limit, totalPages },
  };
}

export function inRange(dateIso: string, from?: string | null, to?: string | null): boolean {
  const d = dateIso.slice(0, 10);
  if (from && d < from.slice(0, 10)) return false;
  if (to && d > to.slice(0, 10)) return false;
  return true;
}

export function todayYmd(): string {
  return ymd(new Date());
}
