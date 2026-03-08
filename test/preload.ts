import { mock } from "bun:test";
import { applyMigrations, testDb } from "./sqlite";

mock.module("@/lib/db/client", () => ({
  db: testDb,
  closeDatabase: () => {},
}));

applyMigrations();
