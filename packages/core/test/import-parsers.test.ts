import AdmZip from "adm-zip";
import { describe, expect, test } from "vitest";

import {
  type ParseResult,
  parseLetterboxdExport,
  parseSimklPayload,
  parseTraktPayload,
} from "../src/imports/parsers";

// ─── Helpers ─────────────────────────────────────────────────────────

function createLetterboxdZip(files: Record<string, string>): Blob {
  const zip = new AdmZip();
  for (const [name, content] of Object.entries(files)) {
    zip.addFile(name, Buffer.from(content, "utf-8"));
  }
  return new Blob([zip.toBuffer()], { type: "application/zip" });
}

// ─── parseTraktPayload ───────────────────────────────────────────────

describe("parseTraktPayload", () => {
  test("parses valid data with movies, episodes, watchlist, and ratings", () => {
    const result = parseTraktPayload({
      history: {
        movies: [
          {
            watched_at: "2024-01-15T20:00:00.000Z",
            movie: {
              title: "Inception",
              year: 2010,
              ids: { tmdb: 27205, imdb: "tt1375666" },
            },
          },
        ],
        shows: [
          {
            watched_at: "2024-02-10T21:00:00.000Z",
            show: {
              title: "Breaking Bad",
              year: 2008,
              ids: { tmdb: 1396, imdb: "tt0903747", tvdb: 81189 },
            },
            episode: { season: 1, number: 1, title: "Pilot" },
          },
        ],
      },
      watchlist: [
        {
          type: "movie",
          movie: {
            title: "Dune: Part Two",
            year: 2024,
            ids: { tmdb: 693134 },
          },
        },
        {
          type: "show",
          show: {
            title: "The Bear",
            year: 2022,
            ids: { tmdb: 136315 },
          },
        },
      ],
      ratings: [
        {
          type: "movie",
          rating: 9,
          rated_at: "2024-01-16T10:00:00.000Z",
          movie: {
            title: "Inception",
            year: 2010,
            ids: { tmdb: 27205, imdb: "tt1375666" },
          },
        },
      ],
    });

    expect(result.data.source).toBe("trakt");
    expect(result.data.movies).toHaveLength(1);
    expect(result.data.movies[0].title).toBe("Inception");
    expect(result.data.movies[0].tmdbId).toBe(27205);
    expect(result.data.movies[0].imdbId).toBe("tt1375666");
    expect(result.data.movies[0].year).toBe(2010);
    expect(result.data.movies[0].watchedAt).toBe("2024-01-15T20:00:00.000Z");

    expect(result.data.episodes).toHaveLength(1);
    expect(result.data.episodes[0].showTitle).toBe("Breaking Bad");
    expect(result.data.episodes[0].showTmdbId).toBe(1396);
    expect(result.data.episodes[0].seasonNumber).toBe(1);
    expect(result.data.episodes[0].episodeNumber).toBe(1);

    expect(result.data.watchlist).toHaveLength(2);
    expect(result.data.watchlist[0].title).toBe("Dune: Part Two");
    expect(result.data.watchlist[0].type).toBe("movie");
    expect(result.data.watchlist[1].title).toBe("The Bear");
    expect(result.data.watchlist[1].type).toBe("tv");

    expect(result.data.ratings).toHaveLength(1);
    expect(result.data.ratings[0].title).toBe("Inception");
    expect(result.data.ratings[0].rating).toBe(5); // 9 → round(9/2) = 5
    expect(result.data.ratings[0].type).toBe("movie");

    expect(result.warnings).toHaveLength(0);
  });

  test("returns empty arrays for missing/empty fields", () => {
    const result = parseTraktPayload({
      history: { movies: [], shows: [] },
      watchlist: [],
      ratings: [],
    });

    expect(result.data.movies).toHaveLength(0);
    expect(result.data.episodes).toHaveLength(0);
    expect(result.data.watchlist).toHaveLength(0);
    expect(result.data.ratings).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  test("returns empty result for empty input object", () => {
    const result = parseTraktPayload({});

    expect(result.data.source).toBe("trakt");
    expect(result.data.movies).toHaveLength(0);
    expect(result.data.episodes).toHaveLength(0);
    expect(result.data.watchlist).toHaveLength(0);
    expect(result.data.ratings).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  test("skips movie items without titles", () => {
    const result = parseTraktPayload({
      history: {
        movies: [
          {
            watched_at: "2024-01-15T20:00:00.000Z",
            movie: { year: 2010, ids: { tmdb: 27205 } },
          },
          {
            watched_at: "2024-01-15T20:00:00.000Z",
            movie: {
              title: "Valid Movie",
              year: 2020,
              ids: { tmdb: 12345 },
            },
          },
        ],
      },
    });

    expect(result.data.movies).toHaveLength(1);
    expect(result.data.movies[0].title).toBe("Valid Movie");
  });

  test("skips episode items without show title", () => {
    const result = parseTraktPayload({
      history: {
        shows: [
          {
            watched_at: "2024-01-01T00:00:00.000Z",
            show: { year: 2020, ids: { tmdb: 1 } },
            episode: { season: 1, number: 1 },
          },
        ],
      },
    });

    expect(result.data.episodes).toHaveLength(0);
  });

  test("skips episode items with missing season or number", () => {
    const result = parseTraktPayload({
      history: {
        shows: [
          {
            show: {
              title: "Show A",
              ids: { tmdb: 1 },
            },
            episode: { number: 1 },
          },
          {
            show: {
              title: "Show B",
              ids: { tmdb: 2 },
            },
            episode: { season: 1 },
          },
        ],
      },
    });

    expect(result.data.episodes).toHaveLength(0);
  });

  test("skips watchlist items without titles", () => {
    const result = parseTraktPayload({
      watchlist: [
        {
          type: "movie",
          movie: { year: 2024, ids: { tmdb: 1 } },
        },
      ],
    });

    expect(result.data.watchlist).toHaveLength(0);
  });

  test("skips rating items without titles", () => {
    const result = parseTraktPayload({
      ratings: [
        {
          type: "movie",
          rating: 8,
          movie: { year: 2020, ids: { tmdb: 1 } },
        },
      ],
    });

    expect(result.data.ratings).toHaveLength(0);
  });

  describe("rating conversion (1-10 to 1-5)", () => {
    function rateMovie(rating: number): ParseResult {
      return parseTraktPayload({
        ratings: [
          {
            type: "movie",
            rating,
            movie: {
              title: "Test",
              year: 2020,
              ids: { tmdb: 1 },
            },
          },
        ],
      });
    }

    test("converts 1 → 1", () => {
      expect(rateMovie(1).data.ratings[0].rating).toBe(1);
    });

    test("converts 2 → 1", () => {
      expect(rateMovie(2).data.ratings[0].rating).toBe(1);
    });

    test("converts 3 → 2", () => {
      expect(rateMovie(3).data.ratings[0].rating).toBe(2);
    });

    test("converts 4 → 2", () => {
      expect(rateMovie(4).data.ratings[0].rating).toBe(2);
    });

    test("converts 5 → 3", () => {
      expect(rateMovie(5).data.ratings[0].rating).toBe(3);
    });

    test("converts 6 → 3", () => {
      expect(rateMovie(6).data.ratings[0].rating).toBe(3);
    });

    test("converts 7 → 4", () => {
      expect(rateMovie(7).data.ratings[0].rating).toBe(4);
    });

    test("converts 8 → 4", () => {
      expect(rateMovie(8).data.ratings[0].rating).toBe(4);
    });

    test("converts 9 → 5", () => {
      expect(rateMovie(9).data.ratings[0].rating).toBe(5);
    });

    test("converts 10 → 5", () => {
      expect(rateMovie(10).data.ratings[0].rating).toBe(5);
    });

    test("skips rating 0 with warning", () => {
      const result = rateMovie(0);
      expect(result.data.ratings).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain("Skipped invalid Trakt rating 0");
    });

    test("skips rating 11 with warning", () => {
      const result = rateMovie(11);
      expect(result.data.ratings).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain("Skipped invalid Trakt rating 11");
    });
  });

  test("diagnostics: items with TMDB IDs have unresolved = 0", () => {
    const result = parseTraktPayload({
      history: {
        movies: [
          {
            movie: {
              title: "Movie A",
              ids: { tmdb: 100 },
            },
          },
        ],
      },
      watchlist: [
        {
          type: "show",
          show: {
            title: "Show A",
            ids: { tmdb: 200 },
          },
        },
      ],
    });

    expect(result.diagnostics?.unresolved).toBe(0);
  });

  test("diagnostics: items without any IDs are counted as unresolved", () => {
    const result = parseTraktPayload({
      history: {
        movies: [
          {
            movie: { title: "No IDs Movie", year: 2020, ids: {} },
          },
        ],
      },
    });

    expect(result.diagnostics?.unresolved).toBe(1);
  });

  test("maps show watchlist type to tv", () => {
    const result = parseTraktPayload({
      watchlist: [
        {
          type: "show",
          show: { title: "My Show", ids: { tmdb: 1 } },
        },
      ],
    });

    expect(result.data.watchlist[0].type).toBe("tv");
  });

  test("maps show rating type to tv", () => {
    const result = parseTraktPayload({
      ratings: [
        {
          type: "show",
          rating: 8,
          show: { title: "My Show", ids: { tmdb: 1 } },
        },
      ],
    });

    expect(result.data.ratings[0].type).toBe("tv");
  });
});

// ─── parseSimklPayload ───────────────────────────────────────────────

describe("parseSimklPayload", () => {
  test("parses completed movies into movies array", () => {
    const result = parseSimklPayload({
      movies: [
        {
          title: "Inception",
          year: 2010,
          status: "completed",
          ids: { tmdb: 27205, imdb: "tt1375666" },
          last_watched_at: "2024-01-15T20:00:00.000Z",
        },
      ],
    });

    expect(result.data.source).toBe("simkl");
    expect(result.data.movies).toHaveLength(1);
    expect(result.data.movies[0].title).toBe("Inception");
    expect(result.data.movies[0].tmdbId).toBe(27205);
    expect(result.data.movies[0].watchedAt).toBe("2024-01-15T20:00:00.000Z");
  });

  test("parses plantowatch movies into watchlist", () => {
    const result = parseSimklPayload({
      movies: [
        {
          title: "Dune: Part Two",
          year: 2024,
          status: "plantowatch",
          ids: { tmdb: 693134 },
        },
      ],
    });

    expect(result.data.movies).toHaveLength(0);
    expect(result.data.watchlist).toHaveLength(1);
    expect(result.data.watchlist[0].title).toBe("Dune: Part Two");
    expect(result.data.watchlist[0].type).toBe("movie");
  });

  test("parses watching movies into movies array", () => {
    const result = parseSimklPayload({
      movies: [
        {
          title: "Long Movie",
          year: 2024,
          status: "watching",
          ids: { tmdb: 1 },
        },
      ],
    });

    expect(result.data.movies).toHaveLength(1);
    expect(result.data.movies[0].title).toBe("Long Movie");
  });

  test("movies with last_watched_at but no status are treated as watched", () => {
    const result = parseSimklPayload({
      movies: [
        {
          title: "Ambiguous Movie",
          year: 2023,
          ids: { tmdb: 999 },
          last_watched_at: "2023-06-01T00:00:00.000Z",
        },
      ],
    });

    expect(result.data.movies).toHaveLength(1);
  });

  test("shows and anime are both parsed as TV type", () => {
    const result = parseSimklPayload({
      shows: [
        {
          title: "Breaking Bad",
          year: 2008,
          status: "plantowatch",
          ids: { tmdb: 1396, tvdb: 81189 },
        },
      ],
      anime: [
        {
          title: "Attack on Titan",
          year: 2013,
          status: "plantowatch",
          ids: { tmdb: 1429 },
        },
      ],
    });

    expect(result.data.watchlist).toHaveLength(2);
    expect(result.data.watchlist[0].type).toBe("tv");
    expect(result.data.watchlist[0].title).toBe("Breaking Bad");
    expect(result.data.watchlist[1].type).toBe("tv");
    expect(result.data.watchlist[1].title).toBe("Attack on Titan");
  });

  test("extracts individual episodes from seasons data", () => {
    const result = parseSimklPayload({
      shows: [
        {
          title: "The Office",
          year: 2005,
          status: "completed",
          ids: { tmdb: 2316 },
          seasons: [
            {
              number: 1,
              episodes: [
                { number: 1, watched_at: "2024-01-01T00:00:00.000Z" },
                { number: 2, watched_at: "2024-01-02T00:00:00.000Z" },
              ],
            },
            {
              number: 2,
              episodes: [{ number: 1, watched_at: "2024-01-03T00:00:00.000Z" }],
            },
          ],
        },
      ],
    });

    expect(result.data.episodes).toHaveLength(3);
    expect(result.data.episodes[0].seasonNumber).toBe(1);
    expect(result.data.episodes[0].episodeNumber).toBe(1);
    expect(result.data.episodes[0].showTitle).toBe("The Office");
    expect(result.data.episodes[0].showTmdbId).toBe(2316);
    expect(result.data.episodes[1].seasonNumber).toBe(1);
    expect(result.data.episodes[1].episodeNumber).toBe(2);
    expect(result.data.episodes[2].seasonNumber).toBe(2);
    expect(result.data.episodes[2].episodeNumber).toBe(1);
  });

  test("skips seasons or episodes with missing number", () => {
    const result = parseSimklPayload({
      shows: [
        {
          title: "Some Show",
          status: "completed",
          ids: { tmdb: 1 },
          seasons: [
            {
              // missing number
              episodes: [{ number: 1, watched_at: "2024-01-01T00:00:00Z" }],
            },
            {
              number: 1,
              episodes: [
                { number: 1, watched_at: "2024-01-01T00:00:00Z" },
                {}, // missing episode number
              ],
            },
          ],
        },
      ],
    });

    // Only season 1, episode 1 should be parsed (season without number skipped,
    // episode without number skipped)
    expect(result.data.episodes).toHaveLength(1);
    expect(result.data.episodes[0].seasonNumber).toBe(1);
    expect(result.data.episodes[0].episodeNumber).toBe(1);
  });

  test("parses movie ratings", () => {
    const result = parseSimklPayload({
      movies: [
        {
          title: "Rated Movie",
          year: 2020,
          status: "completed",
          ids: { tmdb: 1 },
          user_rating: 8,
          last_watched_at: "2024-01-01T00:00:00.000Z",
        },
      ],
    });

    expect(result.data.ratings).toHaveLength(1);
    expect(result.data.ratings[0].title).toBe("Rated Movie");
    expect(result.data.ratings[0].rating).toBe(4); // 8 → round(8/2) = 4
    expect(result.data.ratings[0].type).toBe("movie");
  });

  test("parses show ratings", () => {
    const result = parseSimklPayload({
      shows: [
        {
          title: "Rated Show",
          year: 2020,
          status: "completed",
          ids: { tmdb: 1 },
          user_rating: 10,
        },
      ],
    });

    expect(result.data.ratings).toHaveLength(1);
    expect(result.data.ratings[0].rating).toBe(5); // 10 → 5
    expect(result.data.ratings[0].type).toBe("tv");
  });

  test("handles TMDB IDs provided as strings", () => {
    const result = parseSimklPayload({
      movies: [
        {
          title: "String ID Movie",
          year: 2020,
          status: "completed",
          ids: { tmdb: "27205" as unknown as number },
          last_watched_at: "2024-01-01T00:00:00.000Z",
        },
      ],
    });

    expect(result.data.movies[0].tmdbId).toBe(27205);
  });

  test("handles TVDB IDs provided as strings", () => {
    const result = parseSimklPayload({
      shows: [
        {
          title: "String TVDB Show",
          year: 2020,
          status: "plantowatch",
          ids: { tvdb: "81189" as unknown as number },
        },
      ],
    });

    expect(result.data.watchlist[0].tvdbId).toBe(81189);
  });

  test("returns empty result for empty input", () => {
    const result = parseSimklPayload({});

    expect(result.data.source).toBe("simkl");
    expect(result.data.movies).toHaveLength(0);
    expect(result.data.episodes).toHaveLength(0);
    expect(result.data.watchlist).toHaveLength(0);
    expect(result.data.ratings).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  test("skips items without titles", () => {
    const result = parseSimklPayload({
      movies: [
        {
          year: 2020,
          status: "completed",
          ids: { tmdb: 1 },
          last_watched_at: "2024-01-01T00:00:00.000Z",
        },
      ],
      shows: [
        {
          year: 2020,
          status: "plantowatch",
          ids: { tmdb: 2 },
        },
      ],
    });

    expect(result.data.movies).toHaveLength(0);
    expect(result.data.watchlist).toHaveLength(0);
  });

  describe("rating conversion (1-10 to 1-5)", () => {
    function rateSimklMovie(rating: number): ParseResult {
      return parseSimklPayload({
        movies: [
          {
            title: "Test",
            year: 2020,
            status: "completed",
            ids: { tmdb: 1 },
            user_rating: rating,
            last_watched_at: "2024-01-01T00:00:00.000Z",
          },
        ],
      });
    }

    test("converts 1 → 1", () => {
      expect(rateSimklMovie(1).data.ratings[0].rating).toBe(1);
    });

    test("converts 5 → 3", () => {
      expect(rateSimklMovie(5).data.ratings[0].rating).toBe(3);
    });

    test("converts 6 → 3", () => {
      expect(rateSimklMovie(6).data.ratings[0].rating).toBe(3);
    });

    test("converts 7 → 4", () => {
      expect(rateSimklMovie(7).data.ratings[0].rating).toBe(4);
    });

    test("converts 10 → 5", () => {
      expect(rateSimklMovie(10).data.ratings[0].rating).toBe(5);
    });
  });

  test("diagnostics: items with TMDB IDs have unresolved = 0", () => {
    const result = parseSimklPayload({
      movies: [
        {
          title: "With ID",
          status: "completed",
          ids: { tmdb: 100 },
          last_watched_at: "2024-01-01T00:00:00.000Z",
        },
      ],
    });

    expect(result.diagnostics?.unresolved).toBe(0);
  });

  test("diagnostics: items without any IDs are counted as unresolved", () => {
    const result = parseSimklPayload({
      movies: [
        {
          title: "No IDs",
          status: "completed",
          ids: {},
          last_watched_at: "2024-01-01T00:00:00.000Z",
        },
      ],
    });

    // movie watch + library item, both without IDs
    expect(result.diagnostics?.unresolved).toBe(2);
  });
});

// ─── parseLetterboxdExport ───────────────────────────────────────────

describe("parseLetterboxdExport", () => {
  test("parses valid ZIP with all four CSV files", async () => {
    const zip = createLetterboxdZip({
      "diary.csv":
        "Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date\n2024-01-15,Inception,2010,https://boxd.it/123,,false,,2024-01-14",
      "watched.csv":
        "Date,Name,Year,Letterboxd URI\n2024-01-10,The Matrix,1999,https://boxd.it/456",
      "watchlist.csv":
        "Date,Name,Year,Letterboxd URI\n2024-01-20,Dune: Part Two,2024,https://boxd.it/789",
      "ratings.csv":
        "Date,Name,Year,Letterboxd URI,Rating\n2024-01-15,Inception,2010,https://boxd.it/123,4.5",
    });

    const result = await parseLetterboxdExport(zip);

    expect(result.data.source).toBe("letterboxd");
    expect(result.data.movies).toHaveLength(2);
    expect(result.data.movies[0].title).toBe("Inception");
    expect(result.data.movies[0].year).toBe(2010);
    expect(result.data.movies[0].watchedOn).toBe("2024-01-14");
    expect(result.data.movies[1].title).toBe("The Matrix");
    expect(result.data.movies[1].year).toBe(1999);

    expect(result.data.watchlist).toHaveLength(1);
    expect(result.data.watchlist[0].title).toBe("Dune: Part Two");
    expect(result.data.watchlist[0].type).toBe("movie");

    expect(result.data.ratings).toHaveLength(1);
    expect(result.data.ratings[0].title).toBe("Inception");
    expect(result.data.ratings[0].rating).toBe(5); // 4.5 → round(4.5) = 5
    expect(result.data.ratings[0].type).toBe("movie");

    expect(result.data.episodes).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  test("produces warnings for missing CSV files, not failures", async () => {
    const zip = createLetterboxdZip({
      "diary.csv":
        "Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date\n2024-01-15,Inception,2010,https://boxd.it/123,,false,,2024-01-14",
    });

    const result = await parseLetterboxdExport(zip);

    expect(result.data.movies).toHaveLength(1);
    // Should have warnings for missing watched.csv, watchlist.csv, ratings.csv
    const missingWarnings = result.warnings.filter((w) => w.includes("not found in export"));
    expect(missingWarnings).toHaveLength(3);
    expect(missingWarnings.some((w) => w.includes("watched.csv"))).toBe(true);
    expect(missingWarnings.some((w) => w.includes("watchlist.csv"))).toBe(true);
    expect(missingWarnings.some((w) => w.includes("ratings.csv"))).toBe(true);
  });

  test("deduplicates movies between diary.csv and watched.csv", async () => {
    const zip = createLetterboxdZip({
      "diary.csv":
        "Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date\n2024-01-15,Inception,2010,https://boxd.it/123,,false,,2024-01-14",
      "watched.csv":
        "Date,Name,Year,Letterboxd URI\n2024-01-10,Inception,2010,https://boxd.it/123\n2024-01-05,The Matrix,1999,https://boxd.it/456",
      "watchlist.csv": "Date,Name,Year,Letterboxd URI",
      "ratings.csv": "Date,Name,Year,Letterboxd URI,Rating",
    });

    const result = await parseLetterboxdExport(zip);

    // Inception appears in both diary and watched — should only appear once
    expect(result.data.movies).toHaveLength(2);
    const titles = result.data.movies.map((m) => m.title);
    expect(titles).toContain("Inception");
    expect(titles).toContain("The Matrix");
  });

  test("diary.csv entries take priority over watched.csv for dedup", async () => {
    const zip = createLetterboxdZip({
      "diary.csv":
        "Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date\n2024-01-15,Inception,2010,https://boxd.it/123,,false,,2024-01-14",
      "watched.csv": "Date,Name,Year,Letterboxd URI\n2024-01-10,Inception,2010,https://boxd.it/123",
      "watchlist.csv": "Date,Name,Year,Letterboxd URI",
      "ratings.csv": "Date,Name,Year,Letterboxd URI,Rating",
    });

    const result = await parseLetterboxdExport(zip);

    // The Inception entry should have the watchedOn from diary.csv
    const inception = result.data.movies.find((m) => m.title === "Inception");
    expect(inception?.watchedOn).toBe("2024-01-14");
  });

  describe("rating conversion (Letterboxd 0.5-5 to 1-5)", () => {
    async function rateLetterboxd(rating: number) {
      const zip = createLetterboxdZip({
        "diary.csv": "Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date",
        "watched.csv": "Date,Name,Year,Letterboxd URI",
        "watchlist.csv": "Date,Name,Year,Letterboxd URI",
        "ratings.csv": `Date,Name,Year,Letterboxd URI,Rating\n2024-01-15,Test,2020,https://boxd.it/1,${rating}`,
      });
      return parseLetterboxdExport(zip);
    }

    test("converts 0.5 → 1", async () => {
      const result = await rateLetterboxd(0.5);
      expect(result.data.ratings[0].rating).toBe(1);
    });

    test("converts 1 → 1", async () => {
      const result = await rateLetterboxd(1);
      expect(result.data.ratings[0].rating).toBe(1);
    });

    test("converts 1.5 → 2", async () => {
      const result = await rateLetterboxd(1.5);
      expect(result.data.ratings[0].rating).toBe(2);
    });

    test("converts 2 → 2", async () => {
      const result = await rateLetterboxd(2);
      expect(result.data.ratings[0].rating).toBe(2);
    });

    test("converts 2.5 → 3", async () => {
      const result = await rateLetterboxd(2.5);
      expect(result.data.ratings[0].rating).toBe(3);
    });

    test("converts 3 → 3", async () => {
      const result = await rateLetterboxd(3);
      expect(result.data.ratings[0].rating).toBe(3);
    });

    test("converts 3.5 → 4", async () => {
      const result = await rateLetterboxd(3.5);
      expect(result.data.ratings[0].rating).toBe(4);
    });

    test("converts 4 → 4", async () => {
      const result = await rateLetterboxd(4);
      expect(result.data.ratings[0].rating).toBe(4);
    });

    test("converts 4.5 → 5", async () => {
      const result = await rateLetterboxd(4.5);
      expect(result.data.ratings[0].rating).toBe(5);
    });

    test("converts 5 → 5", async () => {
      const result = await rateLetterboxd(5);
      expect(result.data.ratings[0].rating).toBe(5);
    });

    test("skips rating 0 with warning", async () => {
      const result = await rateLetterboxd(0);
      expect(result.data.ratings).toHaveLength(0);
      expect(result.warnings.some((w) => w.includes("Skipped invalid Letterboxd rating"))).toBe(
        true,
      );
    });

    test("skips rating 6 with warning", async () => {
      const result = await rateLetterboxd(6);
      expect(result.data.ratings).toHaveLength(0);
      expect(result.warnings.some((w) => w.includes("Skipped invalid Letterboxd rating"))).toBe(
        true,
      );
    });
  });

  test("CSV: handles quoted fields with commas", async () => {
    const zip = createLetterboxdZip({
      "diary.csv":
        'Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date\n2024-01-15,"The Good, the Bad and the Ugly",1966,https://boxd.it/999,,false,,2024-01-14',
      "watched.csv": "Date,Name,Year,Letterboxd URI",
      "watchlist.csv": "Date,Name,Year,Letterboxd URI",
      "ratings.csv": "Date,Name,Year,Letterboxd URI,Rating",
    });

    const result = await parseLetterboxdExport(zip);

    expect(result.data.movies).toHaveLength(1);
    expect(result.data.movies[0].title).toBe("The Good, the Bad and the Ugly");
    expect(result.data.movies[0].year).toBe(1966);
  });

  test("CSV: handles escaped quotes within quoted fields", async () => {
    const zip = createLetterboxdZip({
      "diary.csv":
        'Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date\n2024-01-15,"They ""Live""",1988,https://boxd.it/123,,false,,2024-01-14',
      "watched.csv": "Date,Name,Year,Letterboxd URI",
      "watchlist.csv": "Date,Name,Year,Letterboxd URI",
      "ratings.csv": "Date,Name,Year,Letterboxd URI,Rating",
    });

    const result = await parseLetterboxdExport(zip);

    expect(result.data.movies).toHaveLength(1);
    expect(result.data.movies[0].title).toBe('They "Live"');
  });

  test("skips rows without a title", async () => {
    const zip = createLetterboxdZip({
      "diary.csv":
        "Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date\n2024-01-15,,2020,https://boxd.it/1,,false,,2024-01-14\n2024-01-16,Valid Movie,2021,https://boxd.it/2,,false,,2024-01-15",
      "watched.csv": "Date,Name,Year,Letterboxd URI",
      "watchlist.csv": "Date,Name,Year,Letterboxd URI",
      "ratings.csv": "Date,Name,Year,Letterboxd URI,Rating",
    });

    const result = await parseLetterboxdExport(zip);

    expect(result.data.movies).toHaveLength(1);
    expect(result.data.movies[0].title).toBe("Valid Movie");
  });

  test("handles empty ZIP (no CSV files)", async () => {
    const zip = createLetterboxdZip({});

    const result = await parseLetterboxdExport(zip);

    expect(result.data.movies).toHaveLength(0);
    expect(result.data.watchlist).toHaveLength(0);
    expect(result.data.ratings).toHaveLength(0);
    expect(result.warnings.length).toBeGreaterThanOrEqual(4); // all 4 expected files missing
  });

  test("handles invalid ZIP file gracefully", async () => {
    const invalidBlob = new Blob(["not a zip file"], {
      type: "application/zip",
    });

    const result = await parseLetterboxdExport(invalidBlob);

    expect(result.data.movies).toHaveLength(0);
    expect(result.warnings.some((w) => w.includes("Failed to read ZIP"))).toBe(true);
  });

  test("handles CSV files nested in a subdirectory", async () => {
    const zip = new AdmZip();
    zip.addFile(
      "letterboxd-export/diary.csv",
      Buffer.from(
        "Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date\n2024-01-15,Inception,2010,https://boxd.it/123,,false,,2024-01-14",
        "utf-8",
      ),
    );
    zip.addFile(
      "letterboxd-export/watched.csv",
      Buffer.from("Date,Name,Year,Letterboxd URI", "utf-8"),
    );
    zip.addFile(
      "letterboxd-export/watchlist.csv",
      Buffer.from("Date,Name,Year,Letterboxd URI", "utf-8"),
    );
    zip.addFile(
      "letterboxd-export/ratings.csv",
      Buffer.from("Date,Name,Year,Letterboxd URI,Rating", "utf-8"),
    );
    const blob = new Blob([zip.toBuffer()], { type: "application/zip" });

    const result = await parseLetterboxdExport(blob);

    expect(result.data.movies).toHaveLength(1);
    expect(result.data.movies[0].title).toBe("Inception");
    expect(result.warnings).toHaveLength(0);
  });

  test("diagnostics: all Letterboxd items are unresolved (no IDs)", async () => {
    const zip = createLetterboxdZip({
      "diary.csv":
        "Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date\n2024-01-15,Movie A,2020,https://boxd.it/1,,false,,2024-01-14\n2024-01-16,Movie B,2021,https://boxd.it/2,,false,,2024-01-15",
      "watched.csv": "Date,Name,Year,Letterboxd URI",
      "watchlist.csv": "Date,Name,Year,Letterboxd URI\n2024-01-20,Movie C,2022,https://boxd.it/3",
      "ratings.csv":
        "Date,Name,Year,Letterboxd URI,Rating\n2024-01-15,Movie A,2020,https://boxd.it/1,4",
    });

    const result = await parseLetterboxdExport(zip);

    // 2 movies + 1 watchlist + 1 rating = 4 unresolved
    expect(result.diagnostics?.unresolved).toBe(4);
  });

  test("ratings.csv with missing rating column skips the row", async () => {
    const zip = createLetterboxdZip({
      "diary.csv": "Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date",
      "watched.csv": "Date,Name,Year,Letterboxd URI",
      "watchlist.csv": "Date,Name,Year,Letterboxd URI",
      "ratings.csv":
        "Date,Name,Year,Letterboxd URI,Rating\n2024-01-15,No Rating Movie,2020,https://boxd.it/1,",
    });

    const result = await parseLetterboxdExport(zip);

    expect(result.data.ratings).toHaveLength(0);
  });

  test("multiple movies in watched.csv are all parsed", async () => {
    const zip = createLetterboxdZip({
      "diary.csv": "Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date",
      "watched.csv":
        "Date,Name,Year,Letterboxd URI\n2024-01-10,Movie A,2020,https://boxd.it/1\n2024-01-11,Movie B,2021,https://boxd.it/2\n2024-01-12,Movie C,2022,https://boxd.it/3",
      "watchlist.csv": "Date,Name,Year,Letterboxd URI",
      "ratings.csv": "Date,Name,Year,Letterboxd URI,Rating",
    });

    const result = await parseLetterboxdExport(zip);

    expect(result.data.movies).toHaveLength(3);
    expect(result.data.movies.map((m) => m.title)).toEqual(["Movie A", "Movie B", "Movie C"]);
  });

  test("uses Title column as fallback when Name column is absent", async () => {
    const zip = createLetterboxdZip({
      "diary.csv": "Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date",
      "watched.csv":
        "Date,Title,Year,Letterboxd URI\n2024-01-10,Fallback Title,2020,https://boxd.it/1",
      "watchlist.csv": "Date,Name,Year,Letterboxd URI",
      "ratings.csv": "Date,Name,Year,Letterboxd URI,Rating",
    });

    const result = await parseLetterboxdExport(zip);

    expect(result.data.movies).toHaveLength(1);
    expect(result.data.movies[0].title).toBe("Fallback Title");
  });

  test("watchlist items all have type movie", async () => {
    const zip = createLetterboxdZip({
      "diary.csv": "Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date",
      "watched.csv": "Date,Name,Year,Letterboxd URI",
      "watchlist.csv":
        "Date,Name,Year,Letterboxd URI\n2024-01-20,WL Item A,2024,https://boxd.it/1\n2024-01-21,WL Item B,2025,https://boxd.it/2",
      "ratings.csv": "Date,Name,Year,Letterboxd URI,Rating",
    });

    const result = await parseLetterboxdExport(zip);

    expect(result.data.watchlist).toHaveLength(2);
    for (const item of result.data.watchlist) {
      expect(item.type).toBe("movie");
    }
  });
});
