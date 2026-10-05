import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";

import {
  clearAllTables,
  insertPlatform,
  insertTitleAvailability,
  insertEpisodeWatch,
  insertStatus,
  insertTitle,
  insertTvShow,
  insertUser,
} from "@sofa/test/db";

import { getUpcomingFeed } from "../src/discovery";

const TEST_NOW = new Date("2026-03-01T12:00:00Z");

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(TEST_NOW);
});

afterAll(() => {
  vi.useRealTimers();
});

function daysFromNow(offset: number): string {
  const d = new Date(TEST_NOW);
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

beforeEach(() => {
  clearAllTables();
  insertUser();
});

// ── Basic feed ──────────────────────────────────────────────────────

describe("getUpcomingFeed", () => {
  test("returns upcoming episodes for tracked shows", () => {
    const tomorrow = daysFromNow(1);
    insertTvShow("tv-1", 100, 1, 2, {
      title: "Breaking Bad",
      airDates: [tomorrow, tomorrow],
    });
    insertStatus("user-1", "tv-1", "in_progress");

    const result = getUpcomingFeed("user-1", { days: 7 });
    expect(result.items).toHaveLength(2);
    expect(result.items[0].titleName).toBe("Breaking Bad");
    expect(result.items[0].titleType).toBe("tv");
    expect(result.items[0].date).toBe(tomorrow);
  });

  test("returns upcoming movies for tracked titles", () => {
    const nextWeek = daysFromNow(5);
    insertTitle({ id: "m1", tmdbId: 1, type: "movie", title: "Dune 3", releaseDate: nextWeek });
    insertStatus("user-1", "m1", "watchlist");

    const result = getUpcomingFeed("user-1", { days: 7 });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].titleName).toBe("Dune 3");
    expect(result.items[0].titleType).toBe("movie");
    expect(result.items[0].date).toBe(nextWeek);
  });

  test("includes items airing today", () => {
    const today = daysFromNow(0);
    insertTvShow("tv-1", 100, 1, 1, { airDates: [today] });
    insertStatus("user-1", "tv-1", "in_progress");

    const result = getUpcomingFeed("user-1", { days: 7 });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].date).toBe(today);
  });

  test("excludes items beyond the days window", () => {
    const farFuture = daysFromNow(91);
    insertTvShow("tv-1", 100, 1, 1, { airDates: [farFuture] });
    insertStatus("user-1", "tv-1", "in_progress");

    const result = getUpcomingFeed("user-1", { days: 90 });
    expect(result.items).toHaveLength(0);
  });

  test("excludes titles not in user's library", () => {
    const tomorrow = daysFromNow(1);
    insertTvShow("tv-1", 100, 1, 1, { airDates: [tomorrow] });
    // No insertStatus — not tracked

    const result = getUpcomingFeed("user-1", { days: 7 });
    expect(result.items).toHaveLength(0);
  });

  test("returns empty when no upcoming items", () => {
    const result = getUpcomingFeed("user-1", { days: 7 });
    expect(result.items).toHaveLength(0);
    expect(result.nextCursor).toBeNull();
  });
});

// ── Sorting ─────────────────────────────────────────────────────────

describe("sorting", () => {
  test("sorts by date ascending, then title name", () => {
    const day1 = daysFromNow(1);
    const day2 = daysFromNow(2);

    insertTvShow("tv-z", 101, 1, 1, { title: "Zebra Show", airDates: [day1] });
    insertTvShow("tv-a", 102, 1, 1, { title: "Alpha Show", airDates: [day2] });
    insertTvShow("tv-b", 103, 1, 1, { title: "Alpha Show 2", airDates: [day1] });
    insertStatus("user-1", "tv-z", "in_progress");
    insertStatus("user-1", "tv-a", "in_progress");
    insertStatus("user-1", "tv-b", "in_progress");

    const result = getUpcomingFeed("user-1", { days: 7 });
    expect(result.items.map((i) => i.titleName)).toEqual([
      "Alpha Show 2",
      "Zebra Show",
      "Alpha Show",
    ]);
  });

  test("merges movies and episodes in date order", () => {
    const day1 = daysFromNow(1);
    const day2 = daysFromNow(2);

    insertTitle({ id: "m1", tmdbId: 1, type: "movie", title: "A Movie", releaseDate: day2 });
    insertTvShow("tv-1", 100, 1, 1, { title: "A Show", airDates: [day1] });
    insertStatus("user-1", "m1", "watchlist");
    insertStatus("user-1", "tv-1", "in_progress");

    const result = getUpcomingFeed("user-1", { days: 7 });
    expect(result.items[0].titleType).toBe("tv");
    expect(result.items[1].titleType).toBe("movie");
  });
});

// ── Batch collapse ──────────────────────────────────────────────────

describe("batch collapse", () => {
  test("collapses 3+ same-day episodes from the same title", () => {
    const tomorrow = daysFromNow(1);
    insertTvShow("tv-1", 100, 1, 4, {
      title: "Batch Show",
      airDates: [tomorrow, tomorrow, tomorrow, tomorrow],
    });
    insertStatus("user-1", "tv-1", "in_progress");

    const result = getUpcomingFeed("user-1", { days: 7 });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].episodeCount).toBe(4);
    expect(result.items[0].episodeName).toBeNull();
  });

  test("does not collapse fewer than 3 same-day episodes", () => {
    const tomorrow = daysFromNow(1);
    insertTvShow("tv-1", 100, 1, 2, {
      title: "Small Drop",
      airDates: [tomorrow, tomorrow],
    });
    insertStatus("user-1", "tv-1", "in_progress");

    const result = getUpcomingFeed("user-1", { days: 7 });
    expect(result.items).toHaveLength(2);
    expect(result.items[0].episodeCount).toBe(1);
    expect(result.items[0].episodeName).toBe("S1E1");
  });

  test("does not collapse episodes on different dates", () => {
    const day1 = daysFromNow(1);
    const day2 = daysFromNow(2);
    const day3 = daysFromNow(3);
    insertTvShow("tv-1", 100, 1, 3, {
      title: "Spread Show",
      airDates: [day1, day2, day3],
    });
    insertStatus("user-1", "tv-1", "in_progress");

    const result = getUpcomingFeed("user-1", { days: 7 });
    expect(result.items).toHaveLength(3);
  });
});

// ── Cursor pagination ───────────────────────────────────────────────

describe("cursor pagination", () => {
  test("paginates with limit and returns nextCursor", () => {
    const day1 = daysFromNow(1);
    const day2 = daysFromNow(2);
    const day3 = daysFromNow(3);

    insertTvShow("tv-a", 101, 1, 1, { title: "Show A", airDates: [day1] });
    insertTvShow("tv-b", 102, 1, 1, { title: "Show B", airDates: [day2] });
    insertTvShow("tv-c", 103, 1, 1, { title: "Show C", airDates: [day3] });
    insertStatus("user-1", "tv-a", "in_progress");
    insertStatus("user-1", "tv-b", "in_progress");
    insertStatus("user-1", "tv-c", "in_progress");

    const page1 = getUpcomingFeed("user-1", { days: 7, limit: 2 });
    expect(page1.items).toHaveLength(2);
    expect(page1.items[0].titleName).toBe("Show A");
    expect(page1.items[1].titleName).toBe("Show B");
    expect(page1.nextCursor).not.toBeNull();

    const page2 = getUpcomingFeed("user-1", { days: 7, limit: 2, cursor: page1.nextCursor! });
    expect(page2.items).toHaveLength(1);
    expect(page2.items[0].titleName).toBe("Show C");
    expect(page2.nextCursor).toBeNull();
  });

  test("handles invalid cursor gracefully", () => {
    const tomorrow = daysFromNow(1);
    insertTvShow("tv-1", 100, 1, 1, { airDates: [tomorrow] });
    insertStatus("user-1", "tv-1", "in_progress");

    const result = getUpcomingFeed("user-1", { days: 7, cursor: "not-valid-base64!" });
    expect(result.items).toHaveLength(1);
  });
});

// ── Cursor pagination edge cases ────────────────────────────────────

function collectAllTitles(limit: number) {
  const names: string[] = [];
  let cursor: string | undefined;
  for (let guard = 0; guard < 50; guard++) {
    const page = getUpcomingFeed("user-1", { days: 30, limit, cursor });
    names.push(...page.items.map((i) => `${i.titleName}#${i.episodeNumber ?? "-"}`));
    if (!page.nextCursor) break;
    cursor = page.nextCursor;
  }
  return names;
}

describe("cursor pagination edge cases", () => {
  test("handles non-Latin-1 title names at a page boundary", () => {
    insertTvShow("tv-s", 201, 1, 1, { title: "Shōgun", airDates: [daysFromNow(1)] });
    insertTvShow("tv-z", 202, 1, 1, { title: "Zzz Show", airDates: [daysFromNow(2)] });
    insertStatus("user-1", "tv-s", "in_progress");
    insertStatus("user-1", "tv-z", "in_progress");

    const page1 = getUpcomingFeed("user-1", { days: 30, limit: 1 });
    expect(page1.items.map((i) => i.titleName)).toEqual(["Shōgun"]);
    expect(page1.nextCursor).not.toBeNull();

    const page2 = getUpcomingFeed("user-1", { days: 30, limit: 1, cursor: page1.nextCursor! });
    expect(page2.items.map((i) => i.titleName)).toEqual(["Zzz Show"]);
  });

  test("does not skip mixed-case names airing on the same date", () => {
    const d = daysFromNow(1);
    insertTvShow("tv-a", 211, 1, 1, { title: "apple show", airDates: [d] });
    insertTvShow("tv-b", 212, 1, 1, { title: "Banana Show", airDates: [d] });
    insertTvShow("tv-c", 213, 1, 1, { title: "cherry show", airDates: [d] });
    insertStatus("user-1", "tv-a", "in_progress");
    insertStatus("user-1", "tv-b", "in_progress");
    insertStatus("user-1", "tv-c", "in_progress");

    const all = getUpcomingFeed("user-1", { days: 30, limit: 50 }).items.map(
      (i) => `${i.titleName}#${i.episodeNumber ?? "-"}`,
    );
    const paged = collectAllTitles(1);
    expect(paged).toHaveLength(3);
    expect(paged).toEqual(all);
  });

  test("does not skip a second same-day episode split across pages", () => {
    const d = daysFromNow(1);
    insertTvShow("tv-x", 300, 1, 2, { title: "Pair Show", airDates: [d, d] });
    insertStatus("user-1", "tv-x", "in_progress");

    expect(collectAllTitles(1)).toEqual(["Pair Show#1", "Pair Show#2"]);
  });
});

// ── isNewSeason ─────────────────────────────────────────────────────

describe("isNewSeason", () => {
  test("marks episode 1 as new season for caught_up shows", () => {
    const yesterday = daysFromNow(-1);
    const tomorrow = daysFromNow(1);
    // 2 seasons, 1 ep each; S1E1 aired yesterday, S2E1 airs tomorrow
    const { episodeIds } = insertTvShow("tv-1", 100, 2, 1, {
      title: "Returning Show",
      airDates: [yesterday, tomorrow],
      status: "Returning Series",
    });
    insertStatus("user-1", "tv-1", "in_progress");
    // Watch S1E1 (the only aired episode) → caught_up display status
    insertEpisodeWatch("user-1", episodeIds[0]);

    const result = getUpcomingFeed("user-1", { days: 7 });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].isNewSeason).toBe(true);
  });

  test("does not mark non-episode-1 as new season", () => {
    const yesterday = daysFromNow(-1);
    const tomorrow = daysFromNow(1);
    // 1 season, 3 episodes — ep 1 aired yesterday, ep 2 and 3 air tomorrow
    const { episodeIds } = insertTvShow("tv-1", 100, 1, 3, {
      title: "Mid Show",
      airDates: [yesterday, tomorrow, tomorrow],
      status: "Returning Series",
    });
    insertStatus("user-1", "tv-1", "in_progress");
    // Watch ep 1 (only aired episode) → caught_up
    insertEpisodeWatch("user-1", episodeIds[0]);

    const result = getUpcomingFeed("user-1", { days: 7 });
    // episodes 2 and 3 air tomorrow (not collapsed since only 2)
    expect(result.items.every((i) => i.isNewSeason === false)).toBe(true);
  });

  test("does not mark episode 1 as new season for watching shows", () => {
    const yesterday = daysFromNow(-1);
    const tomorrow = daysFromNow(1);
    // 2 seasons, 1 ep each; S1E1 aired yesterday, S2E1 airs tomorrow
    insertTvShow("tv-1", 100, 2, 1, {
      airDates: [yesterday, tomorrow],
      status: "Returning Series",
    });
    insertStatus("user-1", "tv-1", "in_progress");
    // No episodes watched → display status is "watching", not "caught_up"

    const result = getUpcomingFeed("user-1", { days: 7 });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].isNewSeason).toBe(false);
  });
});

// ── Streaming provider ──────────────────────────────────────────────

describe("streaming provider", () => {
  test("attaches flatrate streaming provider", () => {
    const tomorrow = daysFromNow(1);
    insertTvShow("tv-1", 100, 1, 1, { airDates: [tomorrow] });
    insertStatus("user-1", "tv-1", "in_progress");
    const pId = insertPlatform({ id: "p-netflix", name: "Netflix", tmdbProviderId: 8 });
    insertTitleAvailability("tv-1", pId, { offerType: "flatrate" });

    const result = getUpcomingFeed("user-1", { days: 7 });
    expect(result.items[0].streamingProvider).toEqual({
      platformId: "p-netflix",
      providerName: "Netflix",
      logoPath: "/logo.png",
    });
  });

  test("attaches ads-supported streaming provider", () => {
    const tomorrow = daysFromNow(1);
    insertTvShow("tv-1", 100, 1, 1, { airDates: [tomorrow] });
    insertStatus("user-1", "tv-1", "in_progress");
    const pId = insertPlatform({ id: "p-tubi", name: "Tubi", tmdbProviderId: 73 });
    insertTitleAvailability("tv-1", pId, { offerType: "ads" });

    const result = getUpcomingFeed("user-1", { days: 7 });
    expect(result.items[0].streamingProvider).toEqual({
      platformId: "p-tubi",
      providerName: "Tubi",
      logoPath: "/logo.png",
    });
  });

  test("prefers flatrate over ads when both exist", () => {
    const tomorrow = daysFromNow(1);
    insertTvShow("tv-1", 100, 1, 1, { airDates: [tomorrow] });
    insertStatus("user-1", "tv-1", "in_progress");
    const pAds = insertPlatform({ id: "p-tubi", name: "Tubi", tmdbProviderId: 73 });
    const pFlat = insertPlatform({ id: "p-netflix", name: "Netflix", tmdbProviderId: 8 });
    insertTitleAvailability("tv-1", pAds, { offerType: "ads" });
    insertTitleAvailability("tv-1", pFlat, { offerType: "flatrate" });

    const result = getUpcomingFeed("user-1", { days: 7 });
    expect(result.items[0].streamingProvider!.platformId).toBe("p-netflix");
  });

  test("returns null when only purchase providers exist", () => {
    const tomorrow = daysFromNow(1);
    insertTvShow("tv-1", 100, 1, 1, { airDates: [tomorrow] });
    insertStatus("user-1", "tv-1", "in_progress");
    const pId = insertPlatform({ id: "p-rent", tmdbProviderId: 99 });
    insertTitleAvailability("tv-1", pId, { offerType: "rent" });

    const result = getUpcomingFeed("user-1", { days: 7 });
    expect(result.items[0].streamingProvider).toBeNull();
  });
});

// ── Recent direction ────────────────────────────────────────────────

describe("recent direction", () => {
  test("returns recently aired episodes newest first", () => {
    insertTvShow("tv-1", 100, 1, 3, {
      title: "Show",
      airDates: [daysFromNow(-3), daysFromNow(-1), daysFromNow(-2)],
    });
    insertStatus("user-1", "tv-1", "in_progress");

    const result = getUpcomingFeed("user-1", { direction: "recent" });
    expect(result.items.map((i) => i.date)).toEqual([
      daysFromNow(-1),
      daysFromNow(-2),
      daysFromNow(-3),
    ]);
    expect(result.items.map((i) => i.episodeNumber)).toEqual([2, 3, 1]);
  });

  test("excludes watched episodes", () => {
    const { episodeIds } = insertTvShow("tv-1", 100, 1, 2, {
      airDates: [daysFromNow(-1), daysFromNow(-2)],
    });
    insertStatus("user-1", "tv-1", "in_progress");
    insertEpisodeWatch("user-1", episodeIds[0]!);

    const result = getUpcomingFeed("user-1", { direction: "recent" });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.episodeNumber).toBe(2);
  });

  test("excludes today's and future episodes", () => {
    insertTvShow("tv-1", 100, 1, 3, {
      airDates: [daysFromNow(0), daysFromNow(1), daysFromNow(-1)],
    });
    insertStatus("user-1", "tv-1", "in_progress");

    const result = getUpcomingFeed("user-1", { direction: "recent" });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.date).toBe(daysFromNow(-1));
  });

  test("excludes watchlist titles and includes completed titles", () => {
    insertTvShow("tv-w", 101, 1, 1, { title: "Watchlisted", airDates: [daysFromNow(-1)] });
    insertTvShow("tv-c", 102, 1, 1, { title: "Completed", airDates: [daysFromNow(-1)] });
    insertStatus("user-1", "tv-w", "watchlist");
    insertStatus("user-1", "tv-c", "completed");

    const result = getUpcomingFeed("user-1", { direction: "recent" });
    expect(result.items.map((i) => i.titleName)).toEqual(["Completed"]);
  });

  test("mediaType movie returns nothing and movies never appear", () => {
    insertTitle({ id: "m-1", tmdbId: 500, type: "movie", releaseDate: daysFromNow(-1) });
    insertStatus("user-1", "m-1", "completed");
    insertTvShow("tv-1", 100, 1, 1, { airDates: [daysFromNow(-1)] });
    insertStatus("user-1", "tv-1", "in_progress");

    expect(getUpcomingFeed("user-1", { direction: "recent", mediaType: "movie" }).items).toEqual(
      [],
    );
    const all = getUpcomingFeed("user-1", { direction: "recent" });
    expect(all.items.every((i) => i.titleType === "tv")).toBe(true);
    expect(all.items).toHaveLength(1);
  });

  test("respects days", () => {
    insertTvShow("tv-1", 100, 1, 2, { airDates: [daysFromNow(-7), daysFromNow(-8)] });
    insertStatus("user-1", "tv-1", "in_progress");

    const result = getUpcomingFeed("user-1", { direction: "recent", days: 7 });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.date).toBe(daysFromNow(-7));
  });

  test("paginates with a cursor in descending date order", () => {
    for (let n = 1; n <= 5; n++) {
      insertTvShow(`tv-${n}`, 100 + n, 1, 1, { title: `Show ${n}`, airDates: [daysFromNow(-n)] });
      insertStatus("user-1", `tv-${n}`, "in_progress");
    }

    const page1 = getUpcomingFeed("user-1", { direction: "recent", limit: 2 });
    expect(page1.items.map((i) => i.titleName)).toEqual(["Show 1", "Show 2"]);
    expect(page1.nextCursor).not.toBeNull();
    const page2 = getUpcomingFeed("user-1", {
      direction: "recent",
      limit: 2,
      cursor: page1.nextCursor!,
    });
    expect(page2.items.map((i) => i.titleName)).toEqual(["Show 3", "Show 4"]);
    expect(page2.nextCursor).not.toBeNull();
    const page3 = getUpcomingFeed("user-1", {
      direction: "recent",
      limit: 2,
      cursor: page2.nextCursor!,
    });
    expect(page3.items.map((i) => i.titleName)).toEqual(["Show 5"]);
    expect(page3.nextCursor).toBeNull();
  });

  test("default call still returns only today-and-later items", () => {
    insertTvShow("tv-1", 100, 1, 3, {
      airDates: [daysFromNow(-1), daysFromNow(0), daysFromNow(1)],
    });
    insertStatus("user-1", "tv-1", "in_progress");

    const result = getUpcomingFeed("user-1", { days: 7 });
    expect(result.items.map((i) => i.date)).toEqual([daysFromNow(0), daysFromNow(1)]);
  });
});
