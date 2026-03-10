import { beforeEach, describe, expect, mock, test } from "bun:test";
import { persons, titleCast } from "@sofa/db/schema";
import { clearAllTables, insertTitle, testDb } from "@sofa/db/test-utils";

mock.module("../src/image-cache", () => ({
  imageCacheEnabled: () => false,
  cacheProfilePhotos: async () => {},
}));

import { getCastForTitle } from "../src/credits";

beforeEach(() => {
  clearAllTables();
});

function insertPerson(
  id: string,
  tmdbId: number,
  name: string,
  profilePath: string | null = null,
) {
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
