import { describe, expect, test } from "bun:test";

import { parseSofaExport } from "../src/imports/sofa-parser";

describe("parseSofaExport", () => {
  const validExport = {
    version: 1,
    exportedAt: "2026-01-15T12:00:00.000Z",
    user: { name: "Test", email: "test@example.com" },
    library: [
      {
        tmdbId: 550,
        title: "Fight Club",
        year: 1999,
        type: "movie",
        status: "completed",
        addedAt: "2025-01-15T10:30:00.000Z",
      },
      {
        tmdbId: 1396,
        title: "Breaking Bad",
        year: 2008,
        type: "tv",
        status: "in_progress",
        addedAt: "2025-02-01T08:00:00.000Z",
      },
    ],
    movieWatches: [
      {
        tmdbId: 550,
        title: "Fight Club",
        year: 1999,
        watchedAt: "2025-01-15T10:30:00.000Z",
      },
    ],
    episodeWatches: [
      {
        showTmdbId: 1396,
        showTitle: "Breaking Bad",
        showYear: 2008,
        seasonNumber: 1,
        episodeNumber: 1,
        episodeName: "Pilot",
        watchedAt: "2025-02-01T20:00:00.000Z",
      },
    ],
    ratings: [
      {
        tmdbId: 550,
        title: "Fight Club",
        year: 1999,
        type: "movie",
        rating: 5,
        ratedAt: "2025-01-15T10:35:00.000Z",
      },
    ],
  };

  test("parses a valid Sofa export", () => {
    const result = parseSofaExport(validExport);

    expect(result.data.source).toBe("sofa");
    expect(result.data.movies).toHaveLength(1);
    expect(result.data.episodes).toHaveLength(1);
    expect(result.data.watchlist).toHaveLength(2);
    expect(result.data.ratings).toHaveLength(1);
    expect(result.warnings).toHaveLength(0);
  });

  test("maps movie watches correctly", () => {
    const result = parseSofaExport(validExport);
    const movie = result.data.movies[0];

    expect(movie.tmdbId).toBe(550);
    expect(movie.title).toBe("Fight Club");
    expect(movie.year).toBe(1999);
    expect(movie.watchedAt).toBe("2025-01-15T10:30:00.000Z");
  });

  test("maps episode watches correctly", () => {
    const result = parseSofaExport(validExport);
    const ep = result.data.episodes[0];

    expect(ep.showTmdbId).toBe(1396);
    expect(ep.showTitle).toBe("Breaking Bad");
    expect(ep.seasonNumber).toBe(1);
    expect(ep.episodeNumber).toBe(1);
    expect(ep.watchedAt).toBe("2025-02-01T20:00:00.000Z");
  });

  test("preserves status and addedAt on library items", () => {
    const result = parseSofaExport(validExport);

    const movie = result.data.watchlist[0];
    expect(movie.status).toBe("completed");
    expect(movie.addedAt).toBe("2025-01-15T10:30:00.000Z");

    const show = result.data.watchlist[1];
    expect(show.status).toBe("in_progress");
    expect(show.addedAt).toBe("2025-02-01T08:00:00.000Z");
  });

  test("maps ratings correctly", () => {
    const result = parseSofaExport(validExport);
    const rating = result.data.ratings[0];

    expect(rating.tmdbId).toBe(550);
    expect(rating.rating).toBe(5);
    expect(rating.type).toBe("movie");
    expect(rating.ratedAt).toBe("2025-01-15T10:35:00.000Z");
  });

  test("handles empty export", () => {
    const result = parseSofaExport({
      version: 1,
      exportedAt: "2026-01-15T12:00:00.000Z",
      user: { name: "Test", email: "test@example.com" },
      library: [],
      movieWatches: [],
      episodeWatches: [],
      ratings: [],
    });

    expect(result.data.movies).toHaveLength(0);
    expect(result.data.episodes).toHaveLength(0);
    expect(result.data.watchlist).toHaveLength(0);
    expect(result.data.ratings).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  test("rejects invalid data with warnings", () => {
    const result = parseSofaExport({ version: 2, bad: true });

    expect(result.data.movies).toHaveLength(0);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain("Invalid Sofa export file");
  });

  test("rejects non-object input", () => {
    const result = parseSofaExport("not json");

    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain("Invalid Sofa export file");
  });
});
