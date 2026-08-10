/**
 * One-time (safe to re-run) cleanup for receipt files orphaned in
 * Cloudflare R2 — objects with no matching `Receipt` row in the database.
 * These accumulate whenever a receipt's DB row disappears without the R2
 * object being deleted (e.g. purchases deleted before the fix in
 * purchases.service.ts that now cleans up receipts on purchase delete).
 *
 * Dry run by default — only reports what it *would* delete.
 * Pass --delete to actually remove the orphaned objects.
 *
 * Usage (from api/):
 *   pnpm cleanup:receipts
 *   pnpm cleanup:receipts -- --delete
 */
import { resolve } from "node:path";

process.loadEnvFile(resolve(__dirname, "..", ".env"));

import { PrismaClient } from "@prisma/client";
import { R2Service } from "../src/common/r2/r2.service";

const RECEIPTS_PREFIX = "receipts/";

function formatBytes(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(2)} MB`
    : `${(bytes / 1024).toFixed(1)} KB`;
}

async function main(): Promise<void> {
  const shouldDelete = process.argv.includes("--delete");
  const prisma = new PrismaClient();
  const r2 = new R2Service();

  if (!r2.isConfigured) {
    console.error(
      "R2 is not configured (missing R2_* env vars) — nothing to do.",
    );
    process.exitCode = 1;
    return;
  }

  console.log(`Listing R2 objects under "${RECEIPTS_PREFIX}"…`);
  const objects = await r2.listObjects(RECEIPTS_PREFIX);
  console.log(`Found ${objects.length} object(s) in storage.`);

  const receipts = await prisma.receipt.findMany({ select: { key: true } });
  const knownKeys = new Set(receipts.map((r) => r.key));
  console.log(`Found ${receipts.length} receipt row(s) in the database.`);

  const orphaned = objects.filter((o) => !knownKeys.has(o.key));
  const orphanedBytes = orphaned.reduce((sum, o) => sum + o.size, 0);

  console.log("");
  console.log(
    `Orphaned objects: ${orphaned.length} (${formatBytes(orphanedBytes)})`,
  );
  for (const o of orphaned) {
    console.log(`  ${o.key}  (${formatBytes(o.size)})`);
  }

  if (!shouldDelete) {
    console.log("");
    console.log(
      orphaned.length > 0
        ? "Dry run only — nothing deleted. Re-run with --delete to remove these objects."
        : "Nothing to clean up.",
    );
    await prisma.$disconnect();
    return;
  }

  console.log("");
  console.log(`Deleting ${orphaned.length} orphaned object(s)…`);
  let deleted = 0;
  for (const o of orphaned) {
    try {
      await r2.deleteObject(o.key);
      deleted++;
    } catch (err) {
      console.error(
        `  Failed to delete ${o.key}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }
  console.log(`Deleted ${deleted}/${orphaned.length} object(s).`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
