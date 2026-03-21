import { afterEach, mock } from "bun:test";

import { applyMigrations, testDb } from "@sofa/db/test-utils";

process.env.LOG_LEVEL ??= "error";

mock.module("@sofa/db/client", () => ({
  db: testDb,
  optimizeDatabase: () => {},
  vacuumDatabase: () => {},
  closeDatabase: () => {},
  isDatabaseAccessBlocked: () => false,
  withDatabaseAccessBlocked: async (fn: () => Promise<unknown> | unknown) => await fn(),
}));

applyMigrations();

afterEach(() => {
  mock.restore();
});
