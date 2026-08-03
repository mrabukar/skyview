import { PrismaClient, UserRole } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";

/**
 * Seeds the Skyview organization baseline (docs/04 §5):
 * - 1 organization
 * - 4 branches
 * - expense categories (Salaries flagged isSystem)
 * - vendors
 * - 1 admin user  (+ 1 branch manager, to exercise authorization)
 *
 * Idempotent: safe to run repeatedly.
 */

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@skyviewcoffee.co.ke";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Admin123!";
const ADMIN_NAME = process.env.SEED_ADMIN_NAME ?? "Skyview Admin";

const MANAGER_EMAIL =
  process.env.SEED_MANAGER_EMAIL ?? "catherine@skyviewcoffee.co.ke";
const MANAGER_PASSWORD = process.env.SEED_MANAGER_PASSWORD ?? "Manager123!";
const MANAGER_NAME = process.env.SEED_MANAGER_NAME ?? "Catherine Wanjiru";

const BRANCHES: Array<{ name: string; address: string }> = [
  { name: "Hub Mall – Karen", address: "The Hub Karen, Dagoretti Road, Nairobi" },
  { name: "Runda Mall", address: "Runda Mall, Kiambu Road, Nairobi" },
  { name: "One Stop Arcade – Langata", address: "One Stop Arcade, Langata Road, Nairobi" },
  { name: "Mombasa City", address: "Nyerere Avenue, Mombasa" },
];

const EXPENSE_CATEGORIES: Array<{ name: string; description: string; isSystem?: boolean }> = [
  { name: "Rent", description: "Monthly branch rent" },
  { name: "Salaries", description: "Staff salaries and wages", isSystem: true },
  { name: "Service Charge", description: "Mall service charges" },
  { name: "Transport", description: "Transport allowances and delivery costs" },
  { name: "Repairs & Maintenance", description: "Equipment repair and replacement" },
  { name: "Internet & Phone", description: "Connectivity bills" },
  { name: "Promotional Levy", description: "Mall promotional levies" },
  { name: "Utilities", description: "Electricity and water" },
  { name: "Other", description: "Miscellaneous expenses" },
];

const VENDORS = [
  "Carrefour",
  "Osterberg",
  "Maasai Boba",
  "Swiss Packaging",
  "Lotus Group",
  "Savora Flavors",
  "FengSheng Boba",
];

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    // Organization
    let org = await prisma.organization.findFirst({
      where: { name: "Skyview Coffee Ltd" },
    });
    if (!org) {
      org = await prisma.organization.create({
        data: { name: "Skyview Coffee Ltd", hasStores: true, isActive: true },
      });
      console.log(`Created organization: ${org.name}`);
    } else {
      console.log(`Organization already exists: ${org.name}`);
    }

    // Branches
    for (const b of BRANCHES) {
      await prisma.store.upsert({
        where: { name_organizationId: { name: b.name, organizationId: org.id } },
        update: {},
        create: { ...b, organizationId: org.id },
      });
    }
    console.log(`Ensured ${BRANCHES.length} branches`);

    // Expense categories
    for (const c of EXPENSE_CATEGORIES) {
      await prisma.expenseCategory.upsert({
        where: { name_organizationId: { name: c.name, organizationId: org.id } },
        update: { description: c.description, isSystem: c.isSystem ?? false },
        create: {
          name: c.name,
          description: c.description,
          isSystem: c.isSystem ?? false,
          organizationId: org.id,
        },
      });
    }
    console.log(`Ensured ${EXPENSE_CATEGORIES.length} expense categories`);

    // Vendors
    for (const name of VENDORS) {
      await prisma.vendor.upsert({
        where: { name_organizationId: { name, organizationId: org.id } },
        update: {},
        create: { name, organizationId: org.id },
      });
    }
    console.log(`Ensured ${VENDORS.length} vendors`);

    // Admin user
    await ensureUser(prisma, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      name: ADMIN_NAME,
      role: UserRole.admin,
      organizationId: org.id,
      storeId: null,
      salary: 60000,
    });

    // One branch manager (Hub Mall – Karen) to exercise authorization
    const hub = await prisma.store.findFirst({
      where: { organizationId: org.id, name: "Hub Mall – Karen" },
      select: { id: true },
    });
    await ensureUser(prisma, {
      email: MANAGER_EMAIL,
      password: MANAGER_PASSWORD,
      name: MANAGER_NAME,
      role: UserRole.branch_manager,
      organizationId: org.id,
      storeId: hub?.id ?? null,
      salary: 25000,
    });

    console.log("\nSeed complete.");
    console.log(`  Admin:   ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
    console.log(`  Manager: ${MANAGER_EMAIL} / ${MANAGER_PASSWORD}`);
  } finally {
    await prisma.$disconnect();
  }
}

async function ensureUser(
  prisma: PrismaClient,
  opts: {
    email: string;
    password: string;
    name: string;
    role: UserRole;
    organizationId: string;
    storeId: string | null;
    salary: number;
  },
): Promise<void> {
  const existing = await prisma.user.findUnique({
    where: { email: opts.email },
    select: { id: true },
  });
  if (existing) {
    console.log(`User already exists: ${opts.email}`);
    return;
  }

  const userId = crypto.randomUUID();
  const accountId = crypto.randomUUID();
  const hashed = await hashPassword(opts.password);

  await prisma.user.create({
    data: {
      id: userId,
      name: opts.name,
      email: opts.email,
      emailVerified: true,
      role: opts.role,
      isActive: true,
      salary: opts.salary,
      organizationId: opts.organizationId,
      storeId: opts.storeId,
      accounts: {
        create: {
          id: accountId,
          accountId: userId,
          providerId: "credential",
          password: hashed,
        },
      },
    },
  });
  console.log(`Created ${opts.role}: ${opts.email}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
