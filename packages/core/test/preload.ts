import { mock } from "bun:test";
import { applyMigrations, testDb } from "@sofa/db/test-utils";

mock.module("@sofa/db/client", () => ({
  db: testDb,
  closeDatabase: () => {},
}));

applyMigrations();
