-- CreateTable
CREATE TABLE "branch_manager_assignment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "branch_manager_assignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "branch_manager_assignment_organizationId_idx" ON "branch_manager_assignment"("organizationId");

-- CreateIndex
CREATE INDEX "branch_manager_assignment_branchId_idx" ON "branch_manager_assignment"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "branch_manager_assignment_userId_branchId_key" ON "branch_manager_assignment"("userId", "branchId");

-- AddForeignKey
ALTER TABLE "branch_manager_assignment" ADD CONSTRAINT "branch_manager_assignment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_manager_assignment" ADD CONSTRAINT "branch_manager_assignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_manager_assignment" ADD CONSTRAINT "branch_manager_assignment_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: every existing branch_manager with a primary branch gets one assignment row
INSERT INTO "branch_manager_assignment" ("id", "organizationId", "userId", "branchId", "createdAt")
SELECT
  gen_random_uuid()::text,
  u."organizationId",
  u."id",
  u."branchId",
  CURRENT_TIMESTAMP
FROM "user" u
WHERE u."role" = 'branch_manager'
  AND u."branchId" IS NOT NULL
  AND u."organizationId" IS NOT NULL
ON CONFLICT ("userId", "branchId") DO NOTHING;
