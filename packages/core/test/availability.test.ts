import { beforeEach, describe, expect, mock, test } from "bun:test";

import { availabilityOffers } from "@sofa/db/schema";
import {
  clearAllTables,
  eq,
  insertAvailabilityOffer,
  insertTitle,
  testDb,
} from "@sofa/db/test-utils";

let watchProvidersResponse: { results: Record<string, unknown> } = { results: {} };

const getWatchProviders = mock(async () => watchProvidersResponse);

mock.module("@sofa/tmdb/client", () => ({
  getWatchProviders,
}));

import { refreshAvailability } from "../src/availability";

beforeEach(() => {
  clearAllTables();
  watchProvidersResponse = { results: {} };
});

describe("refreshAvailability", () => {
  test("clears stale US offers when TMDB returns no US availability", async () => {
    insertTitle({ id: "movie-1", tmdbId: 101, type: "movie", title: "Movie" });
    insertAvailabilityOffer("movie-1");

    await refreshAvailability("movie-1");

    const offers = testDb
      .select()
      .from(availabilityOffers)
      .where(eq(availabilityOffers.titleId, "movie-1"))
      .all();

    expect(offers).toHaveLength(0);
  });
});
