// Real backup → modify → restore round trip on a throwaway DATA_DIR, under Bun (bun:sqlite).
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const dataDir = mkdtempSync(path.join(os.tmpdir(), "sofa-smoke-"));
process.env.DATA_DIR = dataDir;
process.env.LOG_LEVEL ??= "error";

try {
  const { runMigrations } = await import("@sofa/db/migrate");
  const { BACKUP_DIR } = await import("@sofa/config");
  const { createBackup, restoreFromBackup } = await import("@sofa/core/backup");
  const { getSetting, setSetting } = await import("@sofa/core/settings");

  runMigrations();
  setSetting("smokeMarker", "before");
  const backup = await createBackup("sofa-manual");
  setSetting("smokeMarker", "after");

  await restoreFromBackup(readFileSync(path.join(BACKUP_DIR, backup.filename)));

  const marker = getSetting("smokeMarker");
  if (marker !== "before") throw new Error(`expected restored marker "before", got "${marker}"`);
  if (!readdirSync(BACKUP_DIR).some((f) => f.startsWith("pre-restore-"))) {
    throw new Error("no pre-restore safety backup was created");
  }

  // A backup from a newer Sofa (a migration this build doesn't know) must be rejected and the live
  // database left untouched. validateBackupDatabase compares __drizzle_migrations.created_at with
  // the local migrations' folderMillis (packages/db/src/client.ts).
  setSetting("smokeMarker", "live");
  const newer = await createBackup("sofa-manual");
  const newerPath = path.join(BACKUP_DIR, newer.filename);
  const { Database } = await import("bun:sqlite");
  const file = new Database(newerPath);
  file.run(
    "UPDATE __drizzle_migrations SET created_at = 9999999999999 WHERE id = (SELECT max(id) FROM __drizzle_migrations)",
  );
  file.close();
  let rejected = false;
  try {
    await restoreFromBackup(readFileSync(newerPath));
  } catch {
    rejected = true;
  }
  if (!rejected) throw new Error("a backup from a newer Sofa version was restored");
  const liveMarker = getSetting("smokeMarker");
  if (liveMarker !== "live") {
    throw new Error(`live DB changed by a rejected restore: "${liveMarker}"`);
  }

  console.log("backup/restore smoke OK");
} finally {
  const { closeDatabase } = await import("@sofa/db/client");
  closeDatabase();
  rmSync(dataDir, { recursive: true, force: true });
}
