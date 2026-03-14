import { beforeEach, describe, expect, mock, test } from "bun:test";
import { eq } from "@sofa/db/helpers";
import { episodes, seasons, titles } from "@sofa/db/schema";
import { clearAllTables, insertTitle, testDb } from "@sofa/db/test-utils";

interface MockSeasonEpisode {
  episode_number: number;
  name: string | null;
  overview: string | null;
  still_path: string | null;
  air_date: string | null;
  runtime: number | null;
}

interface MockSeasonDetails {
  season_number: number;
  name: string | null;
  overview: string | null;
  poster_path: string | null;
  air_date: string | null;
  episodes: MockSeasonEpisode[];
}

let seasonDetails: MockSeasonDetails = {
  season_number: 1,
  name: "Season 1",
  overview: null,
  poster_path: "/new-season.png",
  air_date: null,
  episodes: [
    {
      episode_number: 1,
      name: "Episode 1",
      overview: null,
      still_path: "/new-still.png",
      air_date: null,
      runtime: null,
    },
  ],
};

mock.module("@sofa/tmdb/client", () => ({
  getMovieDetails: async () => {
    throw new Error("not used");
  },
  getRecommendations: async () => ({ results: [] }),
  getSimilar: async () => ({ results: [] }),
  getTvDetails: async () => {
    throw new Error("not used");
  },
  getTvSeasonDetails: async () => seasonDetails,
  getVideos: async () => ({ results: [] }),
}));

import {
  refreshTvChildren,
  updateTitleWithArtInvalidation,
} from "../src/metadata";

beforeEach(() => {
  clearAllTables();
  seasonDetails = {
    season_number: 1,
    name: "Season 1",
    overview: null,
    poster_path: "/new-season.png",
    air_date: null,
    episodes: [
      {
        episode_number: 1,
        name: "Episode 1",
        overview: null,
        still_path: "/new-still.png",
        air_date: null,
        runtime: null,
      },
    ],
  };
});

describe("refreshTvChildren", () => {
  test("clears stale season and episode thumbhashes when artwork paths change", async () => {
    insertTitle({ id: "tv-1", tmdbId: 10, type: "tv", title: "Show" });
    testDb
      .insert(seasons)
      .values({
        id: "season-1",
        titleId: "tv-1",
        seasonNumber: 1,
        posterPath: "/old-season.png",
        posterThumbHash: "stale-season-hash",
      })
      .run();
    testDb
      .insert(episodes)
      .values({
        id: "episode-1",
        seasonId: "season-1",
        episodeNumber: 1,
        stillPath: "/old-still.png",
        stillThumbHash: "stale-episode-hash",
      })
      .run();

    await refreshTvChildren("tv-1", 10, 1);

    const season = testDb
      .select()
      .from(seasons)
      .where(eq(seasons.id, "season-1"))
      .get();
    const episode = testDb
      .select()
      .from(episodes)
      .where(eq(episodes.id, "episode-1"))
      .get();

    expect(season?.posterPath).toBe("/new-season.png");
    expect(season?.posterThumbHash).toBeNull();
    expect(episode?.stillPath).toBe("/new-still.png");
    expect(episode?.stillThumbHash).toBeNull();
  });

  test("clears an episode thumbhash when the still disappears", async () => {
    insertTitle({ id: "tv-1", tmdbId: 10, type: "tv", title: "Show" });
    testDb
      .insert(seasons)
      .values({
        id: "season-1",
        titleId: "tv-1",
        seasonNumber: 1,
        posterPath: "/season.png",
      })
      .run();
    testDb
      .insert(episodes)
      .values({
        id: "episode-1",
        seasonId: "season-1",
        episodeNumber: 1,
        stillPath: "/old-still.png",
        stillThumbHash: "stale-episode-hash",
      })
      .run();

    seasonDetails = {
      ...seasonDetails,
      poster_path: "/season.png",
      episodes: [
        {
          episode_number: 1,
          name: "Episode 1",
          overview: null,
          still_path: null,
          air_date: null,
          runtime: null,
        },
      ],
    };

    await refreshTvChildren("tv-1", 10, 1);

    const episode = testDb
      .select()
      .from(episodes)
      .where(eq(episodes.id, "episode-1"))
      .get();

    expect(episode?.stillPath).toBeNull();
    expect(episode?.stillThumbHash).toBeNull();
  });
});

describe("updateTitleWithArtInvalidation", () => {
  test("clears stale title hashes and palette when artwork changes", () => {
    testDb
      .insert(titles)
      .values({
        id: "movie-1",
        tmdbId: 20,
        type: "movie",
        title: "Movie",
        posterPath: "/old-poster.png",
        posterThumbHash: "stale-poster-hash",
        backdropPath: "/old-backdrop.png",
        backdropThumbHash: "stale-backdrop-hash",
        colorPalette: JSON.stringify({ vibrant: "#fff" }),
        lastFetchedAt: new Date(),
      })
      .run();

    const existing = testDb
      .select()
      .from(titles)
      .where(eq(titles.id, "movie-1"))
      .get();

    expect(existing).not.toBeUndefined();
    if (!existing) {
      throw new Error("Expected seeded title row");
    }

    updateTitleWithArtInvalidation(existing, {
      posterPath: "/new-poster.png",
      backdropPath: "/new-backdrop.png",
    });

    const title = testDb
      .select()
      .from(titles)
      .where(eq(titles.id, "movie-1"))
      .get();

    expect(title?.posterPath).toBe("/new-poster.png");
    expect(title?.backdropPath).toBe("/new-backdrop.png");
    expect(title?.posterThumbHash).toBeNull();
    expect(title?.backdropThumbHash).toBeNull();
    expect(title?.colorPalette).toBeNull();
  });
});
