import { beforeEach, describe, expect, test, vi } from "vitest";

import { clearAllTables, insertTitle } from "@sofa/test/db";

const { mockRefreshCredits, mockRefreshAvailability } = vi.hoisted(() => ({
  mockRefreshCredits: vi.fn<(titleId: string) => Promise<void>>(async () => {}),
  mockRefreshAvailability: vi.fn<(titleId: string) => Promise<void>>(async () => {}),
}));

vi.mock("@sofa/tmdb/client", () => ({
  getMovieDetails: async () => {
    throw new Error("not used");
  },
  getRecommendations: async () => ({ results: [] }),
  getSimilar: async () => ({ results: [] }),
  getVideos: async () => ({ results: [] }),
  getTvDetails: async () => ({
    id: 777,
    name: "Hydrated Show",
    original_name: "Hydrated Show",
    overview: "o",
    first_air_date: "2020-01-05",
    poster_path: null,
    backdrop_path: null,
    popularity: 1,
    vote_average: 7,
    vote_count: 10,
    status: "Returning Series",
    number_of_seasons: 1,
    genres: [],
    external_ids: { imdb_id: "tt777", tvdb_id: 7 },
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
        still_path: null,
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

import { getOrFetchTitle } from "../src/metadata";

beforeEach(() => {
  clearAllTables();
  mockRefreshCredits.mockClear();
  mockRefreshAvailability.mockClear();
});

describe("getOrFetchTitle on a shell TV show", () => {
  test("hydrates all fields and runs enrichment on the first view", async () => {
    insertTitle({ id: "tv-shell", tmdbId: 777, type: "tv", title: "Shell" });

    const result = await getOrFetchTitle("tv-shell");

    expect(result?.title.title).toBe("Hydrated Show");
    expect(result?.title.status).toBe("Returning Series");
    expect(result?.title.firstAirDate).toBe("2020-01-05");
    expect(result?.title.imdbId).toBe("tt777");
    expect(result?.seasons).toHaveLength(1);

    expect(mockRefreshCredits).toHaveBeenCalledWith("tv-shell");
    expect(mockRefreshAvailability).toHaveBeenCalledWith("tv-shell");
  });
});
