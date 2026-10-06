import { cpSync, existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { afterEach, describe, expect, test } from "vitest";

const MIGRATIONS_DIR = fileURLToPath(new URL("../drizzle", import.meta.url));
// Last migration shipped in the v0.2.0 release.
const V0_2_0_LAST_MIGRATION = "20260324223903_secret_rhodey";

const tempDirs: string[] = [];
const clients: Database.Database[] = [];

afterEach(() => {
  for (const client of clients.splice(0)) client.close();
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function migrationFolders(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((name) => existsSync(path.join(MIGRATIONS_DIR, name, "migration.sql")))
    .sort();
}

function createDbAt(lastMigration: string) {
  const dir = mkdtempSync(path.join(os.tmpdir(), "sofa-migrations-"));
  tempDirs.push(dir);
  for (const name of migrationFolders().filter((n) => n <= lastMigration)) {
    cpSync(path.join(MIGRATIONS_DIR, name, ""), path.join(dir, name), { recursive: true });
  }
  const client = new Database(":memory:");
  clients.push(client);
  client.pragma("foreign_keys = ON");
  const db = drizzle({ client });
  migrate(db, { migrationsFolder: dir });
  return { client, db };
}

const T = 1700000000;

function seedV020(client: Database.Database) {
  client.exec(`
    INSERT INTO "user" (id, name, email, emailVerified, createdAt, updatedAt) VALUES
      ('u1', 'Alice', 'alice@example.com', 1, ${T}, ${T}),
      ('u2', 'Bob', 'bob@example.com', 0, ${T}, ${T});

    INSERT INTO titles (id, tmdbId, type, title) VALUES
      ('t-movie-a', 100, 'movie', 'Movie A'),
      ('t-show', 200, 'tv', 'Show'),
      ('t-movie-b', 300, 'movie', 'Movie B');

    INSERT INTO seasons (id, titleId, seasonNumber) VALUES ('s1', 't-show', 1);
    INSERT INTO episodes (id, seasonId, episodeNumber) VALUES ('e1', 's1', 1), ('e2', 's1', 2);

    INSERT INTO userTitleStatus (userId, titleId, status, addedAt, updatedAt) VALUES
      ('u1', 't-show', 'completed', ${T}, ${T}),
      ('u1', 't-movie-a', 'in_progress', ${T}, ${T}),
      ('u1', 't-movie-b', 'in_progress', ${T}, ${T});

    INSERT INTO userMovieWatches (id, userId, titleId, watchedAt) VALUES ('w1', 'u1', 't-movie-a', ${T});
    INSERT INTO userEpisodeWatches (id, userId, episodeId, watchedAt) VALUES ('ew1', 'u1', 'e1', ${T});
    INSERT INTO userRatings (userId, titleId, ratingStars, ratedAt) VALUES ('u1', 't-movie-a', 4, ${T});

    INSERT INTO persons (id, tmdbId, name) VALUES ('p1', 500, 'Person');
    INSERT INTO titleCast (id, titleId, personId, character, department, job, displayOrder) VALUES
      ('c1', 't-movie-a', 'p1', NULL, 'Directing', 'Director', 0),
      ('c2', 't-movie-a', 'p1', NULL, 'Directing', 'Director', 0);

    INSERT INTO platforms (id, name) VALUES ('pl1', 'Platform');
    INSERT INTO platformTmdbIds (platformId, tmdbProviderId) VALUES ('pl1', 8);
    INSERT INTO userPlatforms (userId, platformId) VALUES ('u1', 'pl1');
    INSERT INTO titleAvailability (titleId, platformId, offerType, region) VALUES ('t-movie-a', 'pl1', 'flatrate', 'US');

    INSERT INTO integrations (id, userId, provider, type, token, createdAt) VALUES
      ('i1', 'u1', 'plex', 'webhook', 'secret-token', ${T});

    INSERT INTO importJobs (id, userId, source, status, payload, importWatches, importWatchlist, importRatings, createdAt) VALUES
      ('j1', 'u1', 'trakt', 'success', '{}', 1, 1, 1, ${T});

    INSERT INTO appSettings (key, value) VALUES ('someSetting', 'someValue');
  `);
}

const SEEDED_TABLES = [
  "user",
  "titles",
  "seasons",
  "episodes",
  "userTitleStatus",
  "userMovieWatches",
  "userEpisodeWatches",
  "userRatings",
  "persons",
  "platforms",
  "platformTmdbIds",
  "userPlatforms",
  "titleAvailability",
  "integrations",
  "importJobs",
  "appSettings",
];

function count(client: Database.Database, table: string): number {
  return (client.prepare(`SELECT count(*) AS c FROM "${table}"`).get() as { c: number }).c;
}

describe("migrations on an older database", () => {
  test("builds a v0.2.0-schema database", () => {
    const { client } = createDbAt(V0_2_0_LAST_MIGRATION);
    const expected = migrationFolders().filter((n) => n <= V0_2_0_LAST_MIGRATION).length;
    expect(count(client, "__drizzle_migrations")).toBe(expected);
  });

  test("applies newer migrations to a populated v0.2.0 database", () => {
    const { client, db } = createDbAt(V0_2_0_LAST_MIGRATION);
    seedV020(client);
    const before = Object.fromEntries(SEEDED_TABLES.map((t) => [t, count(client, t)]));
    expect(count(client, "titleCast")).toBe(2);

    expect(() => migrate(db, { migrationsFolder: MIGRATIONS_DIR })).not.toThrow();

    expect(count(client, "__drizzle_migrations")).toBe(migrationFolders().length);
    expect(client.pragma("foreign_key_check")).toEqual([]);
    expect(client.pragma("integrity_check", { simple: true })).toBe("ok");

    const after = Object.fromEntries(SEEDED_TABLES.map((t) => [t, count(client, t)]));
    expect(after).toEqual(before);
    expect(count(client, "titleCast")).toBe(1);

    const statuses = client.prepare("SELECT titleId, status FROM userTitleStatus").all() as {
      titleId: string;
      status: string;
    }[];
    const byTitle = Object.fromEntries(statuses.map((s) => [s.titleId, s.status]));
    expect(byTitle).toEqual({
      "t-show": "in_progress",
      "t-movie-a": "completed",
      "t-movie-b": "watchlist",
    });
  });
});
