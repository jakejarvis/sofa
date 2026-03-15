import {
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  spyOn,
  test,
} from "bun:test";
import { eq } from "@sofa/db/helpers";
import { persons } from "@sofa/db/schema";
import { clearAllTables, testDb } from "@sofa/db/test-utils";

const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4//8/AwAI/AL+X2NDNwAAAABJRU5ErkJggg==",
  "base64",
);

let nextBuffer: Buffer | null = TINY_PNG;
let nextPersonDetails = {
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

mock.module("@sofa/tmdb/client", () => ({
  getPersonDetails: async () => nextPersonDetails,
  getPersonCombinedCredits: async () => ({ cast: [] }),
}));

import { getOrFetchPerson } from "../src/person";

beforeEach(() => {
  clearAllTables();
  process.env.IMAGE_CACHE_ENABLED = "false";
  nextBuffer = TINY_PNG;
  nextPersonDetails = {
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
  spyOn(globalThis, "fetch").mockImplementation((async (
    _input: string | URL | Request,
    _init?: RequestInit,
  ) => {
    if (!nextBuffer) {
      return new Response(null, { status: 404 });
    }

    return new Response(nextBuffer, {
      status: 200,
      headers: { "content-type": "image/png" },
    });
  }) as typeof fetch);
});

afterEach(() => {
  delete process.env.IMAGE_CACHE_ENABLED;
  mock.restore();
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
    const stored = testDb
      .select()
      .from(persons)
      .where(eq(persons.id, "p1"))
      .get();

    expect(person?.profileThumbHash).toBeString();
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
    const stored = testDb
      .select()
      .from(persons)
      .where(eq(persons.id, "p1"))
      .get();

    expect(stored?.profilePath).toBe("/new-profile.png");
    expect(person?.profileThumbHash).toBeString();
    expect(person?.profileThumbHash).not.toBe("stale-hash");
    expect(stored?.profileThumbHash).toBe(person?.profileThumbHash);
  });
});
