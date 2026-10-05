import { beforeEach, describe, expect, test, vi } from "vitest";

import { getTitleIdsCheckedBefore } from "@sofa/db/queries/cron";
import { titles } from "@sofa/db/schema";
import { clearAllTables, eq, insertTitle, testDb } from "@sofa/test/db";

const { getVideos } = vi.hoisted(() => ({
  getVideos: vi.fn<() => Promise<{ results: unknown[] }>>(async () => ({ results: [] })),
}));

vi.mock("@sofa/tmdb/client", () => ({
  getVideos,
  getRecommendations: async () => ({ results: [] }),
  getSimilar: async () => ({ results: [] }),
}));

vi.mock("../src/credits", () => ({
  refreshCredits: async () => {},
  getCastForTitle: () => [],
}));

vi.mock("../src/availability", () => ({
  refreshAvailability: async () => {},
}));

vi.mock("../src/image-cache", () => ({
  cacheEpisodeStills: async () => {},
  cacheImagesForTitle: async () => {},
  deleteOrphanedImage: async () => {},
  imageCacheEnabled: () => false,
  loadImageBuffer: async () => undefined,
}));

vi.mock("../src/thumbhash", () => ({
  generateEpisodeThumbHash: async () => {},
  generateSeasonThumbHash: async () => {},
  generateTitleBackdropThumbHash: async () => {},
  generateTitlePosterThumbHash: async () => {},
}));

vi.mock("../src/colors", () => ({
  extractAndStoreColors: async () => {},
  parseColorPalette: () => null,
}));

import { getOrFetchTitle, refreshTrailer } from "../src/metadata";

const DAY = 24 * 60 * 60 * 1000;

function getTitle(id: string) {
  return testDb.select().from(titles).where(eq(titles.id, id)).get();
}

beforeEach(() => {
  clearAllTables();
  getVideos.mockReset();
  getVideos.mockImplementation(async () => ({ results: [] }));
});

describe("refreshTrailer", () => {
  test("stamps trailerCheckedAt even when TMDB has no trailer", async () => {
    insertTitle({ id: "m1", tmdbId: 1, type: "movie", title: "M" });

    await refreshTrailer("m1");

    const row = getTitle("m1");
    expect(row?.trailerVideoKey).toBeNull();
    expect(row?.trailerCheckedAt).toBeInstanceOf(Date);
  });

  test("does not stamp when the TMDB call fails", async () => {
    insertTitle({ id: "m1", tmdbId: 1, type: "movie", title: "M" });
    getVideos.mockRejectedValue(new Error("network"));

    await refreshTrailer("m1");

    expect(getTitle("m1")?.trailerCheckedAt).toBeNull();
  });
});

describe("getTitleIdsCheckedBefore", () => {
  test("returns titles with a null or old stamp only", () => {
    insertTitle({ id: "t-null", tmdbId: 1, type: "movie" });
    insertTitle({ id: "t-old", tmdbId: 2, type: "movie" });
    insertTitle({ id: "t-new", tmdbId: 3, type: "movie" });
    testDb
      .update(titles)
      .set({ creditsCheckedAt: new Date(Date.now() - 40 * DAY) })
      .where(eq(titles.id, "t-old"))
      .run();
    testDb.update(titles).set({ creditsCheckedAt: new Date() }).where(eq(titles.id, "t-new")).run();

    const ids = getTitleIdsCheckedBefore(
      ["t-null", "t-old", "t-new"],
      "creditsCheckedAt",
      new Date(Date.now() - 30 * DAY),
    );

    expect(ids.toSorted()).toEqual(["t-null", "t-old"]);
  });
});

describe("getOrFetchTitle trailer gating", () => {
  test("skips the trailer lookup until the empty answer is a week old", async () => {
    insertTitle({ id: "m1", tmdbId: 1, type: "movie", title: "M" });
    testDb
      .update(titles)
      .set({ lastFetchedAt: new Date(), trailerCheckedAt: new Date() })
      .where(eq(titles.id, "m1"))
      .run();

    await getOrFetchTitle("m1");
    expect(getVideos).not.toHaveBeenCalled();

    testDb
      .update(titles)
      .set({ trailerCheckedAt: new Date(Date.now() - 8 * DAY) })
      .where(eq(titles.id, "m1"))
      .run();

    await getOrFetchTitle("m1");
    expect(getVideos).toHaveBeenCalled();
  });
});
