import { beforeEach, describe, expect, test } from "vitest";

import {
  clearAllTables,
  eq,
  insertPlatform,
  insertTitle,
  insertTitleAvailability,
  insertUser,
  insertUserPlatform,
  testDb,
} from "@sofa/test/db";

import { platformTmdbIds, platforms, titleAvailability, userPlatforms } from "../src/schema";
import { SEED_DATA, seedPlatforms } from "../src/seed-platforms";

beforeEach(() => {
  clearAllTables();
});

describe("seedPlatforms", () => {
  test("seeds a fresh database", () => {
    seedPlatforms();

    expect(testDb.select().from(platforms).all()).toHaveLength(SEED_DATA.length);
    const totalIds = SEED_DATA.reduce((sum, s) => sum + s.tmdbProviderIds.length, 0);
    expect(testDb.select().from(platformTmdbIds).all()).toHaveLength(totalIds);
  });

  test("is idempotent", () => {
    seedPlatforms();
    const firstIds = testDb
      .select({ id: platforms.id })
      .from(platforms)
      .all()
      .map((p) => p.id)
      .toSorted();
    const firstMappings = testDb.select().from(platformTmdbIds).all().length;

    seedPlatforms();
    const secondIds = testDb
      .select({ id: platforms.id })
      .from(platforms)
      .all()
      .map((p) => p.id)
      .toSorted();

    expect(secondIds).toEqual(firstIds);
    expect(testDb.select().from(platformTmdbIds).all()).toHaveLength(firstMappings);
  });

  test("restores changed metadata without changing the id", () => {
    seedPlatforms();
    const seed = SEED_DATA[0]!;
    const mapping = testDb
      .select()
      .from(platformTmdbIds)
      .where(eq(platformTmdbIds.tmdbProviderId, seed.tmdbProviderIds[0]!))
      .get()!;
    testDb.update(platforms).set({ name: "Old" }).where(eq(platforms.id, mapping.platformId)).run();

    seedPlatforms();

    const row = testDb.select().from(platforms).where(eq(platforms.id, mapping.platformId)).get();
    expect(row?.id).toBe(mapping.platformId);
    expect(row?.name).toBe(seed.name);
  });

  test("merging duplicates keeps user choices and avoids duplicate availability", () => {
    const netflix = SEED_DATA.find((s) => s.tmdbProviderIds.includes(8))!;
    expect(netflix.tmdbProviderIds).toContain(175);

    insertPlatform({ id: "p-a", name: "Netflix", tmdbProviderIds: [8] });
    insertPlatform({ id: "p-b", name: "Netflix Ads", tmdbProviderIds: [175] });
    insertUser("u1");
    insertUser("u2");
    insertUserPlatform("u1", "p-b");
    insertUserPlatform("u2", "p-a");
    insertUserPlatform("u2", "p-b");
    insertTitle({ id: "t1", tmdbId: 1, type: "movie" });
    insertTitleAvailability("t1", "p-a");
    insertTitleAvailability("t1", "p-b");

    seedPlatforms();

    const mappedIds = testDb
      .select()
      .from(platformTmdbIds)
      .all()
      .filter((m) => netflix.tmdbProviderIds.includes(m.tmdbProviderId))
      .map((m) => m.platformId);
    const canonical = mappedIds[0]!;
    expect(mappedIds).toHaveLength(netflix.tmdbProviderIds.length);
    expect(new Set(mappedIds)).toEqual(new Set([canonical]));
    expect(canonical).toBe("p-a");

    expect(testDb.select().from(platforms).where(eq(platforms.id, "p-b")).all()).toHaveLength(0);
    expect(testDb.select().from(platforms).where(eq(platforms.id, canonical)).all()).toHaveLength(
      1,
    );

    const u1 = testDb.select().from(userPlatforms).where(eq(userPlatforms.userId, "u1")).all();
    expect(u1).toHaveLength(1);
    expect(u1[0]!.platformId).toBe(canonical);

    const u2 = testDb.select().from(userPlatforms).where(eq(userPlatforms.userId, "u2")).all();
    expect(u2).toHaveLength(1);
    expect(u2[0]!.platformId).toBe(canonical);

    const avail = testDb
      .select()
      .from(titleAvailability)
      .where(eq(titleAvailability.titleId, "t1"))
      .all();
    expect(avail).toHaveLength(1);
    expect(avail[0]!.platformId).toBe(canonical);
    expect(avail[0]!.offerType).toBe("flatrate");
  });

  test("unrelated platforms survive seeding", () => {
    const tmdbId = 999999;
    expect(SEED_DATA.some((s) => s.tmdbProviderIds.includes(tmdbId))).toBe(false);
    insertPlatform({ id: "p-x", name: "Tiny", tmdbProviderIds: [tmdbId] });

    seedPlatforms();

    expect(testDb.select().from(platforms).where(eq(platforms.id, "p-x")).all()).toHaveLength(1);
    const mapping = testDb
      .select()
      .from(platformTmdbIds)
      .where(eq(platformTmdbIds.tmdbProviderId, tmdbId))
      .all();
    expect(mapping).toHaveLength(1);
    expect(mapping[0]!.platformId).toBe("p-x");
  });
});
