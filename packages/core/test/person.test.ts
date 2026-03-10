import { beforeEach, describe, expect, test } from "bun:test";
import { persons, titleCast } from "@sofa/db/schema";
import { getLocalFilmography } from "../src/person";
import { clearAllTables, insertTitle, testDb } from "./sqlite";

beforeEach(() => {
  clearAllTables();
});

function insertPerson(id: string, tmdbId: number, name: string) {
  testDb.insert(persons).values({ id, tmdbId, name }).run();
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
      lastFetchedAt: new Date(),
    })
    .run();
}

describe("getLocalFilmography", () => {
  test("returns filmography for a person", () => {
    insertTitle({ id: "m1", tmdbId: 1, title: "Movie One" });
    insertTitle({ id: "m2", tmdbId: 2, title: "Movie Two" });
    insertPerson("p1", 100, "Test Actor");
    insertCastEntry("m1", "p1", { character: "Hero" });
    insertCastEntry("m2", "p1", { character: "Sidekick" });

    const filmography = getLocalFilmography("p1");
    expect(filmography).toHaveLength(2);
    expect(filmography.map((f) => f.title).sort()).toEqual([
      "Movie One",
      "Movie Two",
    ]);
  });

  test("includes crew roles", () => {
    insertTitle({ id: "m1", tmdbId: 1, title: "Directed Movie" });
    insertPerson("p1", 100, "Director Person");
    insertCastEntry("m1", "p1", {
      character: null,
      department: "Directing",
      job: "Director",
    });

    const filmography = getLocalFilmography("p1");
    expect(filmography).toHaveLength(1);
    expect(filmography[0].department).toBe("Directing");
    expect(filmography[0].job).toBe("Director");
  });

  test("returns empty for person with no credits", () => {
    insertPerson("p1", 100, "Unknown Actor");
    const filmography = getLocalFilmography("p1");
    expect(filmography).toHaveLength(0);
  });

  test("returns correct title types", () => {
    insertTitle({ id: "m1", tmdbId: 1, type: "movie", title: "A Movie" });
    insertTitle({ id: "tv1", tmdbId: 2, type: "tv", title: "A Show" });
    insertPerson("p1", 100, "Versatile Actor");
    insertCastEntry("m1", "p1");
    insertCastEntry("tv1", "p1");

    const filmography = getLocalFilmography("p1");
    const types = filmography.map((f) => f.type).sort();
    expect(types).toEqual(["movie", "tv"]);
  });
});
