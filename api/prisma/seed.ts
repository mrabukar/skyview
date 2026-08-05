import { PrismaClient } from "@prisma/client";
import {
  seedAdmin,
  seedBranches,
  seedCategories,
  seedManager,
  seedOrganization,
  seedVendors,
} from "./seed-lib";

/**
 * Full baseline seed (docs/04 §5): organization → branches → categories →
 * vendors → admin → manager, in dependency order. Idempotent.
 *
 * To seed only one piece, use the individual scripts:
 *   pnpm seed:org | seed:branches | seed:categories | seed:vendors
 *   pnpm seed:admin | seed:manager
 */
async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    await seedOrganization(prisma);
    await seedBranches(prisma);
    await seedCategories(prisma);
    await seedVendors(prisma);
    await seedAdmin(prisma);
    await seedManager(prisma);
    console.log("\nFull seed complete.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
