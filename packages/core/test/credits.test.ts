import { beforeEach, describe, expect, test, vi } from "vitest";

import { persons, titleCast } from "@sofa/db/schema";
import { clearAllTables, eq, insertTitle, testDb } from "@sofa/test/db";

const { mockGetMovieCredits, mockGetTvAggregateCredits } = vi.hoisted(() => ({
  mockGetMovieCredits: vi.fn(async () => ({
    cast: [] as Record<string, unknown>[],
    crew: [] as Record<string, unknown>[],
  })),
  mockGetTvAggregateCredits: vi.fn(async () => ({
    cast: [] as Record<string, unknown>[],
    crew: [] as Record<string, unknown>[],
  })),
}));

vi.mock("@sofa/tmdb/client", () => ({
  getMovieCredits: mockGetMovieCredits,
  getTvAggregateCredits: mockGetTvAggregateCredits,
}));

vi.mock("../src/image-cache", () => ({
  imageCacheEnabled: () => false,
  cacheProfilePhotos: async () => {},
}));

vi.mock("../src/thumbhash", () => ({
  generatePersonThumbHash: async () => null,
}));

import { getCastForTitle, refreshCredits } from "../src/credits";

beforeEach(() => {
  clearAllTables();
  mockGetMovieCredits.mockReset().mockResolvedValue({ cast: [], crew: [] });
  mockGetTvAggregateCredits.mockReset().mockResolvedValue({ cast: [], crew: [] });
});

function insertPerson(id: string, tmdbId: number, name: string, profilePath: string | null = null) {
  testDb.insert(persons).values({ id, tmdbId, name, profilePath }).run();
  return id;
}

function insertCastEntry(
  titleId: string,
  personId: string,
  overrides: {
    character?: string | null;
    department?: string;
    job?: string | null;
    displayOrder?: number;
    episodeCount?: number | null;
  } = {},
) {
  testDb
    .insert(titleCast)
    .values({
      titleId,
      personId,
      character: overrides.character ?? "Character",
      department: overrides.department ?? "Acting",
      job: overrides.job ?? null,
      displayOrder: overrides.displayOrder ?? 0,
      episodeCount: overrides.episodeCount ?? null,
      lastFetchedAt: new Date(),
    })
    .run();
}

// ─── getCastForTitle ────────────────────────────────────────────────

describe("getCastForTitle", () => {
  test("returns cast members ordered by displayOrder", () => {
    insertTitle({ id: "m1", tmdbId: 1 });
    insertPerson("p1", 100, "Actor One", "/path1.jpg");
    insertPerson("p2", 200, "Actor Two", "/path2.jpg");
    insertCastEntry("m1", "p1", { character: "Hero", displayOrder: 0 });
    insertCastEntry("m1", "p2", { character: "Villain", displayOrder: 1 });

    const cast = getCastForTitle("m1");
    expect(cast).toHaveLength(2);
    expect(cast[0].name).toBe("Actor One");
    expect(cast[0].character).toBe("Hero");
    expect(cast[0].profilePath).toBe("/images/profiles/path1.jpg");
    expect(cast[1].name).toBe("Actor Two");
  });

  test("includes crew members", () => {
    insertTitle({ id: "m1", tmdbId: 1 });
    insertPerson("p1", 100, "Director Person");
    insertCastEntry("m1", "p1", {
      character: null,
      department: "Directing",
      job: "Director",
      displayOrder: 100,
    });

    const cast = getCastForTitle("m1");
    expect(cast).toHaveLength(1);
    expect(cast[0].department).toBe("Directing");
    expect(cast[0].job).toBe("Director");
  });

  test("returns empty array for title with no cast", () => {
    insertTitle({ id: "m1", tmdbId: 1 });
    const cast = getCastForTitle("m1");
    expect(cast).toHaveLength(0);
  });
});

// ─── refreshCredits ─────────────────────────────────────────────────

describe("refreshCredits", () => {
  test("creates persons and cast entries for a movie", async () => {
    insertTitle({ id: "m1", tmdbId: 100, type: "movie" });

    mockGetMovieCredits.mockResolvedValue({
      cast: [
        { id: 1, name: "Actor A", profile_path: "/a.jpg", character: "Hero", popularity: 10 },
        { id: 2, name: "Actor B", profile_path: null, character: "Villain", popularity: 5 },
      ],
      crew: [
        {
          id: 3,
          name: "Dir Person",
          profile_path: "/d.jpg",
          job: "Director",
          department: "Directing",
          popularity: 8,
        },
      ],
    });

    await refreshCredits("m1");

    const castRows = testDb.select().from(titleCast).where(eq(titleCast.titleId, "m1")).all();
    const personRows = testDb.select().from(persons).all();

    expect(personRows).toHaveLength(3);
    expect(castRows).toHaveLength(3);

    // Cast should be ordered: actors 0,1 then crew at 100+
    const sorted = castRows.sort((a, b) => a.displayOrder - b.displayOrder);
    expect(sorted[0].department).toBe("Acting");
    expect(sorted[0].character).toBe("Hero");
    expect(sorted[1].department).toBe("Acting");
    expect(sorted[2].department).toBe("Directing");
    expect(sorted[2].job).toBe("Director");
  });

  test("creates persons and cast entries for a TV show", async () => {
    insertTitle({ id: "tv1", tmdbId: 200, type: "tv" });

    mockGetTvAggregateCredits.mockResolvedValue({
      cast: [
        {
          id: 10,
          name: "TV Actor",
          profile_path: "/tv.jpg",
          popularity: 7,
          total_episode_count: 24,
          roles: [{ character: "Main Character", episode_count: 24 }],
        },
      ],
      crew: [
        {
          id: 20,
          name: "Show Creator",
          profile_path: null,
          department: "Production",
          popularity: 3,
          jobs: [{ job: "Creator", episode_count: 24 }],
        },
      ],
    });

    await refreshCredits("tv1");

    const castRows = testDb.select().from(titleCast).where(eq(titleCast.titleId, "tv1")).all();
    expect(castRows).toHaveLength(2);

    const actor = castRows.find((r) => r.department === "Acting");
    expect(actor?.character).toBe("Main Character");
    expect(actor?.episodeCount).toBe(24);

    const creator = castRows.find((r) => r.job === "Creator");
    expect(creator).toBeDefined();
  });

  test("does nothing for nonexistent title", async () => {
    await refreshCredits("nonexistent");
    expect(mockGetMovieCredits).not.toHaveBeenCalled();
    expect(mockGetTvAggregateCredits).not.toHaveBeenCalled();
  });

  test("limits movie cast to 20 entries", async () => {
    insertTitle({ id: "m1", tmdbId: 100, type: "movie" });

    const largeCast = Array.from({ length: 30 }, (_, i) => ({
      id: i + 1,
      name: `Actor ${i}`,
      profile_path: null,
      character: `Char ${i}`,
      popularity: 1,
    }));

    mockGetMovieCredits.mockResolvedValue({ cast: largeCast, crew: [] });

    await refreshCredits("m1");

    const castRows = testDb.select().from(titleCast).where(eq(titleCast.titleId, "m1")).all();
    expect(castRows).toHaveLength(20);
  });

  test("deduplicates persons by tmdbId", async () => {
    insertTitle({ id: "m1", tmdbId: 100, type: "movie" });

    mockGetMovieCredits.mockResolvedValue({
      cast: [{ id: 1, name: "Person", profile_path: null, character: "Role A", popularity: 5 }],
      crew: [
        {
          id: 1,
          name: "Person",
          profile_path: null,
          job: "Director",
          department: "Directing",
          popularity: 5,
        },
      ],
    });

    await refreshCredits("m1");

    const personRows = testDb.select().from(persons).all();
    expect(personRows).toHaveLength(1);

    const castRows = testDb.select().from(titleCast).where(eq(titleCast.titleId, "m1")).all();
    expect(castRows).toHaveLength(2);
  });

  test("filters crew to notable departments only", async () => {
    insertTitle({ id: "m1", tmdbId: 100, type: "movie" });

    mockGetMovieCredits.mockResolvedValue({
      cast: [],
      crew: [
        {
          id: 1,
          name: "Director",
          profile_path: null,
          job: "Director",
          department: "Directing",
          popularity: 5,
        },
        {
          id: 2,
          name: "Grip",
          profile_path: null,
          job: "Key Grip",
          department: "Camera",
          popularity: 1,
        },
        {
          id: 3,
          name: "Writer",
          profile_path: null,
          job: "Writer",
          department: "Writing",
          popularity: 3,
        },
      ],
    });

    await refreshCredits("m1");

    const castRows = testDb.select().from(titleCast).where(eq(titleCast.titleId, "m1")).all();
    // Only Director and Writer are in NOTABLE_DEPARTMENTS
    expect(castRows).toHaveLength(2);
    const jobs = castRows.map((r) => r.job).sort();
    expect(jobs).toEqual(["Director", "Writer"]);
  });
});
