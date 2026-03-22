import { beforeEach, describe, expect, test } from "vitest";

import { titles } from "@sofa/db/schema";
import { clearAllTables, insertTitle, testDb } from "@sofa/test/db";

import { purgeMetadataCache } from "../src/cache";

beforeEach(() => {
  clearAllTables();
});

describe("purgeMetadataCache", () => {
  test("deletes shell titles not in any user library", () => {
    // Shell title (lastFetchedAt = null, no user status)
    insertTitle({ id: "shell-1", tmdbId: 100, title: "Shell Movie" });

    const result = purgeMetadataCache();
    expect(result.deletedTitles).toBe(1);

    const remaining = testDb.select().from(titles).all();
    expect(remaining).toHaveLength(0);
  });

  test("preserves fully-fetched titles", () => {
    testDb
      .insert(titles)
      .values({
        id: "fetched-1",
        tmdbId: 100,
        type: "movie",
        title: "Fetched Movie",
        lastFetchedAt: new Date(),
      })
      .run();

    const result = purgeMetadataCache();
    expect(result.deletedTitles).toBe(0);

    const remaining = testDb.select().from(titles).all();
    expect(remaining).toHaveLength(1);
  });

  test("returns zero counts when nothing to purge", () => {
    const result = purgeMetadataCache();
    expect(result.deletedTitles).toBe(0);
    expect(result.deletedPersons).toBe(0);
  });
});
