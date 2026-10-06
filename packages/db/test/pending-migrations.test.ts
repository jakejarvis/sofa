import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, test } from "vitest";

import { testClient } from "@sofa/test/db";

import { hasPendingMigrations } from "../src/migrate";

const MIGRATIONS_DIR = fileURLToPath(new URL("../drizzle", import.meta.url));

type MigrationRow = { id: number; hash: string; created_at: number; name: string | null };

let removed: MigrationRow | undefined;

afterEach(() => {
  if (removed) {
    testClient
      .prepare("INSERT INTO __drizzle_migrations (id, hash, created_at, name) VALUES (?, ?, ?, ?)")
      .run(removed.id, removed.hash, removed.created_at, removed.name);
    removed = undefined;
  }
});

describe("hasPendingMigrations", () => {
  test("is false when every migration is applied", () => {
    expect(hasPendingMigrations(MIGRATIONS_DIR)).toBe(false);
  });

  test("is true when a migration has not been applied", () => {
    removed = testClient
      .prepare("SELECT id, hash, created_at, name FROM __drizzle_migrations ORDER BY id DESC LIMIT 1")
      .get() as MigrationRow;
    testClient.exec(
      "DELETE FROM __drizzle_migrations WHERE id = (SELECT max(id) FROM __drizzle_migrations)",
    );
    expect(hasPendingMigrations(MIGRATIONS_DIR)).toBe(true);
  });
});
