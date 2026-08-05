import { PrismaClient, UserRole } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";

/**
 * Shared seed steps. Each step is a pure function that takes a PrismaClient.
 * `seedOrganization` is the only step that creates the organization; every
 * other step calls `requireOrg` and fails with a clear message if the org is
 * missing. Thin runner files (seed-*.ts) invoke these individually, and
 * seed.ts (full) runs them all in order.
 */

export const ORG_NAME = process.env.SEED_ORG_NAME ?? "Skyview Coffee Ltd";

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@skyviewcoffee.co.ke";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Admin123!";
const ADMIN_NAME = process.env.SEED_ADMIN_NAME ?? "Skyview Admin";
const ADMIN_SALARY = Number(process.env.SEED_ADMIN_SALARY ?? 60000);

const MANAGER_EMAIL =
  process.env.SEED_MANAGER_EMAIL ?? "catherine@skyviewcoffee.co.ke";
const MANAGER_PASSWORD = process.env.SEED_MANAGER_PASSWORD ?? "Manager123!";
const MANAGER_NAME = process.env.SEED_MANAGER_NAME ?? "Catherine Wanjiru";
const MANAGER_SALARY = Number(process.env.SEED_MANAGER_SALARY ?? 25000);
/** Branch the seeded manager is assigned to. */
const MANAGER_BRANCH = process.env.SEED_MANAGER_BRANCH ?? "Hub Mall – Karen";

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

/** Thrown when a partial seed needs an org/branch that doesn't exist yet. */
export class SeedPreconditionError extends Error {}

type OrgRef = { id: string; name: string };

/** Find the organization or fail with a clear, actionable message. */
export async function requireOrg(prisma: PrismaClient): Promise<OrgRef> {
  const org = await prisma.organization.findFirst({
    where: { name: ORG_NAME },
    select: { id: true, name: true },
  });
  if (!org) {
    throw new SeedPreconditionError(
      `Organization "${ORG_NAME}" not found. Run \`pnpm seed:org\` first ` +
        `(or set SEED_ORG_NAME to match an existing organization).`,
    );
  }
  return org;
}

/** Creates the organization if missing (the only step that does). */
export async function seedOrganization(prisma: PrismaClient): Promise<OrgRef> {
  const existing = await prisma.organization.findFirst({
    where: { name: ORG_NAME },
    select: { id: true, name: true },
  });
  if (existing) {
    console.log(`Organization already exists: ${existing.name}`);
    return existing;
  }
  const org = await prisma.organization.create({
    data: { name: ORG_NAME, hasStores: true, isActive: true },
    select: { id: true, name: true },
  });
  console.log(`Created organization: ${org.name}`);
  return org;
}

export async function seedBranches(prisma: PrismaClient): Promise<void> {
  const org = await requireOrg(prisma);
  for (const b of BRANCHES) {
    await prisma.branch.upsert({
      where: { name_organizationId: { name: b.name, organizationId: org.id } },
      update: {},
      create: { ...b, organizationId: org.id },
    });
  }
  console.log(`Ensured ${BRANCHES.length} branches for ${org.name}`);
}

export async function seedCategories(prisma: PrismaClient): Promise<void> {
  const org = await requireOrg(prisma);
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
  console.log(`Ensured ${EXPENSE_CATEGORIES.length} expense categories for ${org.name}`);
}

export async function seedVendors(prisma: PrismaClient): Promise<void> {
  const org = await requireOrg(prisma);
  for (const name of VENDORS) {
    await prisma.vendor.upsert({
      where: { name_organizationId: { name, organizationId: org.id } },
      update: {},
      create: { name, organizationId: org.id },
    });
  }
  console.log(`Ensured ${VENDORS.length} vendors for ${org.name}`);
}

export async function seedAdmin(prisma: PrismaClient): Promise<void> {
  const org = await requireOrg(prisma);
  await ensureUser(prisma, {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    name: ADMIN_NAME,
    role: UserRole.admin,
    organizationId: org.id,
    branchId: null,
    salary: ADMIN_SALARY,
  });
  console.log(`  Admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
}

export async function seedManager(prisma: PrismaClient): Promise<void> {
  const org = await requireOrg(prisma);
  const branch = await prisma.branch.findFirst({
    where: { organizationId: org.id, name: MANAGER_BRANCH },
    select: { id: true },
  });
  if (!branch) {
    throw new SeedPreconditionError(
      `Branch "${MANAGER_BRANCH}" not found. Run \`pnpm seed:branches\` first ` +
        `(or set SEED_MANAGER_BRANCH to an existing branch).`,
    );
  }
  await ensureUser(prisma, {
    email: MANAGER_EMAIL,
    password: MANAGER_PASSWORD,
    name: MANAGER_NAME,
    role: UserRole.branch_manager,
    organizationId: org.id,
    branchId: branch.id,
    salary: MANAGER_SALARY,
  });
  console.log(`  Manager: ${MANAGER_EMAIL} / ${MANAGER_PASSWORD}`);
}

async function ensureUser(
  prisma: PrismaClient,
  opts: {
    email: string;
    password: string;
    name: string;
    role: UserRole;
    organizationId: string;
    branchId: string | null;
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
      branchId: opts.branchId,
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

/** Runs a single seed step with its own client + friendly error handling. */
export async function runSeed(
  label: string,
  step: (prisma: PrismaClient) => Promise<void>,
): Promise<void> {
  const prisma = new PrismaClient();
  try {
    console.log(`Seeding: ${label}`);
    await step(prisma);
    console.log("Done.");
  } catch (error) {
    if (error instanceof SeedPreconditionError) {
      console.error(`\n✗ ${error.message}\n`);
      process.exitCode = 1;
    } else {
      console.error(error);
      process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
  }
}
