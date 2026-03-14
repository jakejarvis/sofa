import { beforeEach, describe, expect, mock, test } from "bun:test";
import { eq } from "@sofa/db/helpers";
import { episodes, seasons, titles } from "@sofa/db/schema";
import { clearAllTables, testDb } from "@sofa/db/test-utils";

const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4//8/AwAI/AL+X2NDNwAAAABJRU5ErkJggg==",
  "base64",
);

let nextBuffer: Buffer | null = TINY_PNG;

mock.module("../src/image-cache", () => ({
  loadImageBuffer: async () => nextBuffer,
}));

import { generateEpisodeThumbHash, generateThumbHash } from "../src/thumbhash";

beforeEach(() => {
  clearAllTables();
  nextBuffer = TINY_PNG;
});

describe("thumbhash generation", () => {
  test("generates a thumbhash from a loaded image buffer", async () => {
    const hash = await generateThumbHash("/poster.png", "posters");
    expect(hash).toBeString();
    expect(hash).not.toBe("");
  });

  test("clears a stale episode thumbhash when regeneration fails", async () => {
    testDb
      .insert(titles)
      .values({ id: "tv-1", tmdbId: 100, type: "tv", title: "Show" })
      .run();
    testDb
      .insert(seasons)
      .values({ id: "season-1", titleId: "tv-1", seasonNumber: 1 })
      .run();
    testDb
      .insert(episodes)
      .values({
        id: "ep-1",
        seasonId: "season-1",
        episodeNumber: 1,
        stillPath: "/old-still.png",
        stillThumbHash: "stale-hash",
      })
      .run();

    nextBuffer = null;
    const hash = await generateEpisodeThumbHash("ep-1", "/new-still.png");

    const episode = testDb
      .select()
      .from(episodes)
      .where(eq(episodes.id, "ep-1"))
      .get();

    expect(hash).toBeNull();
    expect(episode?.stillThumbHash).toBeNull();
  });
});
