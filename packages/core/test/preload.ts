import { afterEach, mock } from "bun:test";

import { applyMigrations, testDb } from "@sofa/db/test-utils";

process.env.LOG_LEVEL ??= "error";

mock.module("@sofa/db/client", () => ({
  db: testDb,
  closeDatabase: () => {},
}));

applyMigrations();

afterEach(() => {
  mock.restore();
});
