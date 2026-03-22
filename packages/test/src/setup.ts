import crypto from "node:crypto";

import { afterEach, vi } from "vitest";

import { applyMigrations, testDb } from "./db";

// Polyfill Bun globals used by schema $defaultFn (tests run on Node.js, not Bun)
if (typeof globalThis.Bun === "undefined") {
  (globalThis as Record<string, unknown>).Bun = {
    randomUUIDv7: () => crypto.randomUUID(),
  };
}

process.env.LOG_LEVEL ??= "error";

vi.mock("@sofa/db/client", () => ({
  db: testDb,
  optimizeDatabase: () => {},
  vacuumDatabase: () => {},
  validateBackupDatabase: () => {},
  closeDatabase: () => {},
  isDatabaseAccessBlocked: () => false,
  withDatabaseAccessBlocked: async (fn: () => Promise<unknown> | unknown) => await fn(),
}));

applyMigrations();

afterEach(() => {
  vi.restoreAllMocks();
});
