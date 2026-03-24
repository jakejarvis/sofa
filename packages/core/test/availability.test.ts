import { beforeEach, describe, expect, test, vi } from "vitest";

import { titleAvailability } from "@sofa/db/schema";
import {
  clearAllTables,
  eq,
  insertPlatform,
  insertTitle,
  insertTitleAvailability,
  testDb,
} from "@sofa/test/db";

const { getWatchProviders } = vi.hoisted(() => ({
  getWatchProviders: vi.fn(async () => ({ results: {} as Record<string, unknown> })),
}));

vi.mock("@sofa/tmdb/client", () => ({
  getWatchProviders,
}));

import { refreshAvailability } from "../src/availability";

beforeEach(() => {
  clearAllTables();
  getWatchProviders.mockImplementation(async () => ({ results: {} }));
});

describe("refreshAvailability", () => {
  test("clears stale US offers when TMDB returns no US availability", async () => {
    insertTitle({ id: "movie-1", tmdbId: 101, type: "movie", title: "Movie" });
    const platformId = insertPlatform({ id: "p-1", tmdbProviderId: 8 });
    insertTitleAvailability("movie-1", platformId);

    await refreshAvailability("movie-1");

    const offers = testDb
      .select()
      .from(titleAvailability)
      .where(eq(titleAvailability.titleId, "movie-1"))
      .all();

    expect(offers).toHaveLength(0);
  });
});
