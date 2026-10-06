import { describe, expect, test } from "vitest";

import {
  findMissingBackupTables,
  isFromNewerVersion,
  REQUIRED_BACKUP_TABLES,
} from "@sofa/db/backup-tables";
import { testClient } from "@sofa/test/db";

import { getBackupSource, isKnownBackup, isValidBackupFilename } from "../src/backup";

describe("getBackupSource", () => {
  test("detects manual backup", () => {
    expect(getBackupSource("sofa-manual-2024-01-15-120000.db")).toBe("manual");
  });

  test("detects manual backup with milliseconds", () => {
    expect(getBackupSource("sofa-manual-2024-01-15-120000123.db")).toBe("manual");
  });

  test("detects scheduled backup", () => {
    expect(getBackupSource("sofa-scheduled-2024-06-01-030000.db")).toBe("scheduled");
  });

  test("detects pre-restore backup", () => {
    expect(getBackupSource("pre-restore-2024-06-01-030000.db")).toBe("pre-restore");
  });

  test("defaults to manual for unknown patterns", () => {
    expect(getBackupSource("random-file.db")).toBe("manual");
  });
});

describe("isKnownBackup", () => {
  test("recognizes manual backup", () => {
    expect(isKnownBackup("sofa-manual-2024-01-15-120000.db")).toBe(true);
  });

  test("recognizes scheduled backup", () => {
    expect(isKnownBackup("sofa-scheduled-2024-06-01-030000.db")).toBe(true);
  });

  test("recognizes pre-restore backup", () => {
    expect(isKnownBackup("pre-restore-2024-06-01-030000.db")).toBe(true);
  });

  test("recognizes backup with milliseconds", () => {
    expect(isKnownBackup("sofa-manual-2024-01-15-120000456.db")).toBe(true);
  });

  test("rejects random filename", () => {
    expect(isKnownBackup("random-file.db")).toBe(false);
  });

  test("rejects similar but wrong prefix", () => {
    expect(isKnownBackup("sofa-auto-2024-01-15-120000.db")).toBe(false);
  });

  test("rejects wrong extension", () => {
    expect(isKnownBackup("sofa-manual-2024-01-15-120000.sql")).toBe(false);
  });
});

describe("isValidBackupFilename", () => {
  test("accepts valid manual backup", () => {
    expect(isValidBackupFilename("sofa-manual-2024-01-15-120000.db")).toBe(true);
  });

  test("accepts valid scheduled backup", () => {
    expect(isValidBackupFilename("sofa-scheduled-2024-06-01-030000.db")).toBe(true);
  });

  test("rejects path traversal", () => {
    expect(isValidBackupFilename("../sofa-manual-2024-01-15-120000.db")).toBe(false);
  });

  test("rejects directory separators", () => {
    expect(isValidBackupFilename("subdir/sofa-manual-2024-01-15-120000.db")).toBe(false);
  });

  test("rejects unknown filenames", () => {
    expect(isValidBackupFilename("evil.db")).toBe(false);
  });

  test("rejects filenames with double dots", () => {
    expect(isValidBackupFilename("sofa-manual-2024..01-15-120000.db")).toBe(false);
  });
});

function currentTableNames(): string[] {
  return (
    testClient.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as {
      name: string;
    }[]
  ).map((r) => r.name);
}

describe("findMissingBackupTables", () => {
  test("accepts a fully migrated database (current schema)", () => {
    expect(findMissingBackupTables(currentTableNames())).toEqual([]);
  });

  test("accepts a database from before v0.1.3 (no platformTmdbIds)", () => {
    const names = currentTableNames().filter((n) => n !== "platformTmdbIds");
    expect(findMissingBackupTables(names)).toEqual([]);
  });

  test("accepts a database from v0.1.0 (no platform tables)", () => {
    const newer = new Set(["platformTmdbIds", "platforms", "titleAvailability", "userPlatforms"]);
    const names = currentTableNames().filter((n) => !newer.has(n));
    expect(findMissingBackupTables(names)).toEqual([]);
  });

  test("rejects a non-Sofa SQLite file", () => {
    const missing = findMissingBackupTables(["foo"]);
    expect(missing).toContain("user");
    expect(missing).toContain("titles");
    expect(missing).toContain("__drizzle_migrations");
  });

  test("every required backup table exists in the current schema", () => {
    const current = currentTableNames();
    expect(REQUIRED_BACKUP_TABLES.filter((t) => !current.includes(t))).toEqual([]);
  });
});

describe("isFromNewerVersion", () => {
  test("older backup is accepted", () => {
    expect(isFromNewerVersion([1000, 2000], [1000, 2000, 3000])).toBe(false);
  });

  test("same version is accepted", () => {
    expect(isFromNewerVersion([1000, 2000, 3000], [1000, 2000, 3000])).toBe(false);
  });

  test("newer backup is rejected", () => {
    expect(isFromNewerVersion([1000, 4000], [1000, 3000])).toBe(true);
  });

  test("empty applied list is accepted", () => {
    expect(isFromNewerVersion([], [3000])).toBe(false);
  });

  test("numeric strings are coerced", () => {
    expect(isFromNewerVersion(["4000"], [3000])).toBe(true);
  });
});
