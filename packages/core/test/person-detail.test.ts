import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { personFilmography, persons } from "@sofa/db/schema";
import { clearAllTables, eq, testDb } from "@sofa/test/db";

const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4//8/AwAI/AL+X2NDNwAAAABJRU5ErkJggg==",
  "base64",
);

const defaultPersonDetails = {
  id: 100,
  name: "Updated Person",
  biography: "Bio",
  birthday: null,
  deathday: null,
  place_of_birth: null,
  profile_path: "/new-profile.png",
  known_for_department: "Acting",
  popularity: 10,
  imdb_id: null,
};

const defaultCombinedCredits = {
  cast: [
    {
      id: 501,
      media_type: "movie",
      title: "Cached Movie",
      name: undefined,
      overview: "Overview",
      release_date: "2024-01-01",
      first_air_date: undefined,
      poster_path: "/poster.png",
      backdrop_path: "/backdrop.png",
      popularity: 5,
      vote_average: 7.5,
      vote_count: 42,
      character: "Lead",
    },
  ],
  crew: [],
};

const { mockGetPersonDetails, mockGetPersonCombinedCredits } = vi.hoisted(() => ({
  mockGetPersonDetails: vi.fn(),
  mockGetPersonCombinedCredits: vi.fn(),
}));

vi.mock("@sofa/tmdb/client", () => ({
  getPersonDetails: mockGetPersonDetails,
  getPersonCombinedCredits: mockGetPersonCombinedCredits,
}));

import { fetchFullFilmography, getOrFetchPerson } from "../src/person";

let combinedCreditsCalls = 0;

beforeEach(() => {
  clearAllTables();
  process.env.IMAGE_CACHE_ENABLED = "false";
  combinedCreditsCalls = 0;
  mockGetPersonDetails.mockImplementation(async () => ({ ...defaultPersonDetails }));
  mockGetPersonCombinedCredits.mockImplementation(async () => {
    combinedCreditsCalls++;
    return { cast: [...defaultCombinedCredits.cast], crew: [] };
  });
  vi.spyOn(globalThis, "fetch").mockImplementation((async (
    _input: string | URL | Request,
    _init?: RequestInit,
  ) => {
    return new Response(TINY_PNG, {
      status: 200,
      headers: { "content-type": "image/png" },
    });
  }) as typeof fetch);
});

afterEach(() => {
  delete process.env.IMAGE_CACHE_ENABLED;
});

describe("getOrFetchPerson", () => {
  test("backfills a missing profile thumbhash for an already-fetched person", async () => {
    testDb
      .insert(persons)
      .values({
        id: "p1",
        tmdbId: 100,
        name: "Existing Person",
        profilePath: "/profile.png",
        profileThumbHash: null,
        lastFetchedAt: new Date(),
      })
      .run();

    const person = await getOrFetchPerson("p1");
    const stored = testDb.select().from(persons).where(eq(persons.id, "p1")).get();

    expect(person?.profileThumbHash).toBeTypeOf("string");
    expect(stored?.profileThumbHash).toBe(person?.profileThumbHash);
  });

  test("replaces a stale profile thumbhash when shell hydration changes the image path", async () => {
    testDb
      .insert(persons)
      .values({
        id: "p1",
        tmdbId: 100,
        name: "Shell Person",
        profilePath: "/old-profile.png",
        profileThumbHash: "stale-hash",
        lastFetchedAt: null,
      })
      .run();

    const person = await getOrFetchPerson("p1");
    const stored = testDb.select().from(persons).where(eq(persons.id, "p1")).get();

    expect(stored?.profilePath).toBe("/new-profile.png");
    expect(person?.profileThumbHash).toBeTypeOf("string");
    expect(person?.profileThumbHash).not.toBe("stale-hash");
    expect(stored?.profileThumbHash).toBe(person?.profileThumbHash);
  });
});

describe("fetchFullFilmography", () => {
  test("stores and reuses synced filmography rows from the database", async () => {
    testDb
      .insert(persons)
      .values({
        id: "p1",
        tmdbId: 100,
        name: "Cached Person",
        lastFetchedAt: new Date(),
      })
      .run();

    const first = await fetchFullFilmography("p1");
    const second = await fetchFullFilmography("p1");
    const storedPerson = testDb.select().from(persons).where(eq(persons.id, "p1")).get();
    const storedCredits = testDb
      .select()
      .from(personFilmography)
      .where(eq(personFilmography.personId, "p1"))
      .all();

    expect(first).toHaveLength(1);
    expect(second).toEqual(first);
    expect(combinedCreditsCalls).toBe(1);
    expect(storedPerson?.filmographyLastFetchedAt).toBeInstanceOf(Date);
    expect(storedCredits).toHaveLength(1);
  });
});
