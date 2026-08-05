import { runSeed, seedOrganization } from "./seed-lib";

void runSeed("organization", async (prisma) => {
  await seedOrganization(prisma);
});
