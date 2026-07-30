/**
 * Skyview Coffee (Bubble Tea Palace) — demo mock dataset.
 * All data is generated deterministically so the demo looks the same on every load.
 * No backend is required; service/client.ts routes every request to service/mock/handlers.ts.
 */
import type { Store } from "@/types/stores/store";
import type { Category } from "@/types/categories/category";
import type { Product } from "@/types/products/product";
import type { User } from "@/types/users/user";
import type { ApiUser } from "@/types/auth/me";
import type { Expense } from "@/types/expenses/expense";
import type { ExpenseCategory } from "@/types/expenses/expense-category";
import type { Sale } from "@/types/sales/sale";
import type { Purchase } from "@/types/purchases/purchase";
import type { StockSupply } from "@/types/stock-supplies/stock-supply";
import type { Inventory } from "@/types/inventory/inventory";

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

const NOW = new Date("2026-07-30T12:00:00.000Z");
export function daysAgo(n: number, hour = 10): string {
  const d = new Date(NOW);
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(hour, randInt(0, 59), 0, 0);
  return d.toISOString();
}

/* ------------------------------------------------------------------ */
/* Stores — the four Bubble Tea Palace branches                        */
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
/* Users                                                               */
/* ------------------------------------------------------------------ */
export const users: User[] = [
  {
    id: "user-admin",
    name: "Skyview Admin",
    email: "admin@skyviewcoffee.co.ke",
    role: "admin",
    phone: "0723534990",
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
    isActive: false,
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
/* Menu sections (categories)                                          */
/* ------------------------------------------------------------------ */
const categoryDefs = [
  ["Specialty Coffee", "Espresso-based and signature coffee drinks"],
  ["Milk Teas", "Classic and flavoured milk teas with boba"],
  ["Fruit Teas", "Fresh fruit teas and mocktail bobas"],
  ["Matcha", "Matcha lattes and matcha fusions"],
  ["Waffles & Desserts", "Waffles, donuts, and sweet treats"],
] as const;

export const categories: Category[] = categoryDefs.map(([name, description], i) => ({
  id: `cat-${i + 1}`,
  name,
  description,
  createdAt: daysAgo(400),
  updatedAt: daysAgo(100),
  _count: { products: 0 },
}));

/* ------------------------------------------------------------------ */
/* Menu items (products)                                               */
/* ------------------------------------------------------------------ */
const productDefs: Array<[string, string, number, number]> = [
  // [name, categoryId, sellingPrice, averageCost]
  ["Bubble Coffee", "cat-1", 380, 120],
  ["Iced Latte Boba Tea", "cat-1", 420, 140],
  ["Chai Boba Coffee", "cat-1", 400, 130],
  ["Cappuccino", "cat-1", 300, 90],
  ["Caramel Macchiato", "cat-1", 380, 125],
  ["Classic Milk Tea", "cat-2", 320, 95],
  ["Brown Sugar Boba", "cat-2", 380, 115],
  ["Taro Milk Tea", "cat-2", 350, 110],
  ["Thai Milk Tea", "cat-2", 350, 105],
  ["Passion Fruit Tea", "cat-3", 320, 85],
  ["Mango Fruit Tea", "cat-3", 320, 88],
  ["Strawberry Mocktail Boba", "cat-3", 360, 100],
  ["Matcha Latte", "cat-4", 380, 130],
  ["Strawberry Matcha", "cat-4", 420, 145],
  ["Belgian Waffle", "cat-5", 450, 160],
  ["Glazed Donut", "cat-5", 200, 70],
  ["Ice Cream Sundae", "cat-5", 350, 120],
];

export const products: Product[] = productDefs.map(([name, categoryId, sellingPrice, averageCost], i) => {
  const cat = categories.find((c) => c.id === categoryId)!;
  if (cat._count) cat._count.products += 1;
  return {
    id: `prod-${i + 1}`,
    name,
    normalizedName: name.toLowerCase(),
    model: null,
    categoryId,
    category: {
      id: Number(categoryId.replace("cat-", "")),
      name: cat.name,
      description: cat.description,
      createdAt: cat.createdAt,
      updatedAt: cat.updatedAt,
    },
    description: null,
    averageCost,
    sellingPrice,
    isActive: true,
    createdById: "user-admin",
    createdAt: daysAgo(390),
    updatedAt: daysAgo(50),
  };
});

/* ------------------------------------------------------------------ */
/* Expense categories — straight from the client's spreadsheet         */
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

/* ------------------------------------------------------------------ */
/* Expenses — mirrors the boba spreadsheet patterns                    */
/* ------------------------------------------------------------------ */
const expenseTemplates: Array<[string, number, number, string | null]> = [
  // [title, categoryId(1-based), baseAmount, storeId|null(company-wide)]
  ["Branch rent", 1, 67785, "store-hub-karen"],
  ["Branch rent", 1, 58200, "store-runda"],
  ["Branch rent", 1, 41500, "store-langata"],
  ["Branch rent", 1, 46800, "store-mombasa"],
  ["Manager salary", 2, 25000, "store-hub-karen"],
  ["Manager salary", 2, 25000, "store-runda"],
  ["Manager salary", 2, 22000, "store-langata"],
  ["Manager salary", 2, 22000, "store-mombasa"],
  ["Baristas wages", 2, 54000, "store-hub-karen"],
  ["Baristas wages", 2, 48000, "store-runda"],
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
for (let month = 0; month < 4; month++) {
  for (const [title, categoryId, base, storeId] of expenseTemplates) {
    // not every expense repeats every month
    if (month > 0 && (categoryId === 5 || categoryId === 9) && rand() < 0.6) continue;
    const day = month * 30 + randInt(2, 26);
    const store = storeId ? stores.find((s) => s.id === storeId)! : null;
    const amount = Math.round(base * (0.92 + rand() * 0.16));
    expenses.push({
      id: `exp-${expenseId++}`,
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
expenses.sort((a, b) => b.expenseDate.localeCompare(a.expenseDate));

/* ------------------------------------------------------------------ */
/* Sales — ~4 months of daily café sales across branches               */
/* ------------------------------------------------------------------ */
const sellersByStore: Record<string, User> = {
  "store-hub-karen": users[1],
  "store-runda": users[2],
  "store-langata": users[4],
  "store-mombasa": users[3],
};

export const sales: Sale[] = [];
let saleId = 1;
for (let day = 0; day < 120; day++) {
  for (const store of stores) {
    // busier branches sell more line items per day
    const weight = store.id === "store-hub-karen" ? 4 : store.id === "store-runda" ? 3 : 2;
    const entries = randInt(Math.max(1, weight - 1), weight + 1);
    for (let e = 0; e < entries; e++) {
      const product = pick(products);
      const qty = randInt(1, 6);
      const unitPrice = Number(product.sellingPrice);
      const seller = sellersByStore[store.id] ?? users[0];
      const corrected = rand() < 0.02;
      sales.push({
        id: `sale-${saleId++}`,
        productId: product.id,
        storeId: store.id,
        soldById: seller.id,
        quantitySold: qty,
        unitPrice,
        unitPurchasePrice: Number(product.averageCost),
        totalAmount: qty * unitPrice,
        saleDate: daysAgo(day, randInt(8, 20)),
        note: null,
        status: corrected ? "corrected" : "active",
        createdAt: daysAgo(day),
        updatedAt: daysAgo(day),
        product,
        store,
        soldBy: { id: seller.id, name: seller.name, email: seller.email },
        corrections: corrected
          ? [
              {
                id: `corr-${saleId}`,
                saleId: `sale-${saleId - 1}`,
                originalQuantity: qty + 1,
                correctedQuantity: qty,
                reason: "Entry error — wrong quantity keyed in",
                correctedById: "user-admin",
                createdAt: daysAgo(day - 1 < 0 ? 0 : day - 1),
              },
            ]
          : [],
      });
    }
  }
}
sales.sort((a, b) => b.saleDate.localeCompare(a.saleDate));

/* ------------------------------------------------------------------ */
/* Purchases — vendor invoices (Carrefour, Osterberg, Maasai Boba...)  */
/* ------------------------------------------------------------------ */
const vendors = [
  "Carrefour",
  "Osterberg",
  "Maasai Boba",
  "Swiss Packaging",
  "Lotus Group",
  "Savora Flavors",
  "FengSheng Boba",
];

export const purchases: Purchase[] = [];
let purchaseId = 1;
for (let day = 0; day < 120; day += randInt(2, 5)) {
  const product = pick(products);
  const qty = randInt(20, 120);
  const unit = Math.round(Number(product.averageCost) * (0.85 + rand() * 0.2));
  const vendor = pick(vendors);
  purchases.push({
    id: `pur-${purchaseId++}`,
    productId: product.id,
    quantity: qty,
    unitPurchasePrice: unit,
    totalCost: qty * unit,
    type: "purchase",
    correctsPurchaseId: null,
    invoiceNumber: `${vendor.slice(0, 3).toUpperCase()}-${2600 + purchaseId}`,
    purchaseDate: daysAgo(day),
    note: `Supplier: ${vendor}`,
    purchasedById: "user-admin",
    createdAt: daysAgo(day),
    product,
    purchasedBy: { id: "user-admin", name: "Skyview Admin", email: "admin@skyviewcoffee.co.ke" },
    reversibleQuantity: qty,
  });
}
purchases.sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate));

/* ------------------------------------------------------------------ */
/* Inventory per store                                                 */
/* ------------------------------------------------------------------ */
export const inventory: Inventory[] = [];
let invId = 1;
for (const store of stores) {
  for (const product of products) {
    const qty = rand() < 0.06 ? 0 : randInt(3, 80);
    inventory.push({
      id: `inv-${invId++}`,
      productId: product.id,
      storeId: store.id,
      quantity: qty,
      lowStockThreshold: 10,
      createdAt: daysAgo(200),
      updatedAt: daysAgo(randInt(0, 10)),
      product,
      store,
    });
  }
}

/* ------------------------------------------------------------------ */
/* Stock supplies                                                      */
/* ------------------------------------------------------------------ */
export const stockSupplies: StockSupply[] = [];
let supplyId = 1;
for (let day = 0; day < 90; day += randInt(3, 7)) {
  const product = pick(products);
  const store = pick(stores);
  const qty = randInt(10, 60);
  stockSupplies.push({
    id: `sup-${supplyId++}`,
    productId: product.id,
    storeId: store.id,
    quantity: qty,
    unitPurchasePrice: Number(product.averageCost),
    type: "supply",
    correctsSupplyId: null,
    suppliedById: "user-admin",
    note: null,
    createdAt: daysAgo(day),
    product,
    store,
    suppliedBy: { id: "user-admin", name: "Skyview Admin", email: "admin@skyviewcoffee.co.ke" },
    correctsSupply: null,
  });
}
stockSupplies.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

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
  ["SALE_CREATED", "Sale"],
  ["EXPENSE_CREATED", "Expense"],
  ["PURCHASE_CREATED", "Purchase"],
  ["STOCK_SUPPLIED", "StockSupply"],
  ["PRODUCT_UPDATED", "Product"],
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

export const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
