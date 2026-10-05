import { beforeEach, describe, expect, test, vi } from "vitest";

import { clearAllTables, insertTitle } from "@sofa/test/db";

const { mockRefreshCredits, mockRefreshAvailability, mockCacheEpisodeStills } = vi.hoisted(() => ({
  mockRefreshCredits: vi.fn<(titleId: string) => Promise<void>>(async () => {}),
  mockRefreshAvailability: vi.fn<(titleId: string) => Promise<void>>(async () => {}),
  // Never resolves: simulates hundreds of slow episode still downloads
  mockCacheEpisodeStills: vi.fn<(titleId: string) => Promise<void>>(
    () => new Promise<void>(() => {}),
  ),
}));

vi.mock("@sofa/tmdb/client", () => ({
  getMovieDetails: async () => {
    throw new Error("not used");
  },
  getRecommendations: async () => ({ results: [] }),
  getSimilar: async () => ({ results: [] }),
  getVideos: async () => ({ results: [] }),
  getTvDetails: async () => ({
    id: 778,
    name: "Detached Show",
    original_name: "Detached Show",
    overview: "o",
    first_air_date: "2020-01-05",
    poster_path: "/poster.jpg",
    backdrop_path: null,
    popularity: 1,
    vote_average: 7,
    vote_count: 10,
    status: "Returning Series",
    number_of_seasons: 1,
    genres: [],
    external_ids: { imdb_id: "tt778", tvdb_id: 8 },
    original_language: "en",
    content_ratings: { results: [] },
  }),
  getTvSeasonDetails: async () => ({
    season_number: 1,
    name: "Season 1",
    overview: null,
    poster_path: null,
    air_date: null,
    episodes: [
      {
        episode_number: 1,
        name: "E1",
        overview: null,
        still_path: "/still.jpg",
        air_date: "2020-01-05",
        runtime: 30,
      },
    ],
  }),
}));

vi.mock("../src/credits", () => ({
  refreshCredits: mockRefreshCredits,
  getCastForTitle: () => [],
}));

vi.mock("../src/availability", () => ({
  refreshAvailability: mockRefreshAvailability,
}));

vi.mock("../src/image-cache", () => ({
  cacheEpisodeStills: mockCacheEpisodeStills,
  cacheImagesForTitle: async () => {},
  deleteOrphanedImage: async () => {},
  imageCacheEnabled: () => true,
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

import { getOrFetchTitle } from "../src/metadata";

beforeEach(() => {
  clearAllTables();
  mockRefreshCredits.mockClear();
  mockRefreshAvailability.mockClear();
  mockCacheEpisodeStills.mockClear();
});

describe("getOrFetchTitle episode art", () => {
  test("does not wait for episode still caching on the first view of a TV show", async () => {
    insertTitle({ id: "tv-shell", tmdbId: 778, type: "tv", title: "Shell" });

    const result = await getOrFetchTitle("tv-shell");

    expect(result?.title.title).toBe("Detached Show");
    expect(mockCacheEpisodeStills).toHaveBeenCalledWith("tv-shell");
  });
});
