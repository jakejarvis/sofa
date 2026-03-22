import { describe, expect, test } from "vitest";

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
