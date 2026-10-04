import { afterEach, describe, expect, test, vi } from "vitest";

import {
  fitToBudget,
  jsonBytes,
  MAX_PAGES_PER_LIST,
  slimTraktItem,
  trakt,
  type TraktPayload,
} from "./trakt";

type FetchFn = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

interface StubReply {
  body?: unknown;
  status?: number;
  pageCount?: number;
}

/** Stub fetch; `reply` answers by Trakt path and page number. */
function stubTrakt(reply: (path: string, page: number) => StubReply | undefined) {
  const fetchMock = vi.fn<FetchFn>(async (input, _init) => {
    const url = new URL(String(input));
    const page = Number(url.searchParams.get("page") ?? "1");
    const r = reply(url.pathname, page) ?? {};
    const headers: Record<string, string> = {};
    if (r.pageCount !== undefined) headers["X-Pagination-Page-Count"] = String(r.pageCount);
    return new Response(JSON.stringify(r.body ?? []), { status: r.status ?? 200, headers });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function requestsFor(fetchMock: ReturnType<typeof stubTrakt>, path: string) {
  return fetchMock.mock.calls
    .map(([input]) => new URL(String(input)))
    .filter((url) => url.pathname === path);
}

function movieWatch(i: number) {
  return {
    id: i,
    watched_at: new Date(Date.UTC(2024, 0, 1) + i * 86_400_000).toISOString(),
    action: "watch",
    type: "movie",
    movie: {
      title: `M${i}`,
      year: 2000,
      ids: { trakt: i, slug: `m-${i}`, tmdb: i + 1, imdb: null },
    },
  };
}

function emptyPayload(): TraktPayload {
  return { history: { movies: [], shows: [] }, watchlist: [], ratings: [], warnings: [] };
}

interface FetchedPayload {
  history: { movies: unknown[]; shows: unknown[] };
  watchlist: unknown[];
  ratings: unknown[];
  warnings: string[];
}

async function fetchData(): Promise<FetchedPayload> {
  return (await trakt.fetchUserData("token", "client")) as FetchedPayload;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("trakt.fetchUserData", () => {
  test("follows X-Pagination-Page-Count", async () => {
    const fetchMock = stubTrakt((path, page) =>
      path === "/sync/history/movies" ? { body: [movieWatch(page)], pageCount: 3 } : undefined,
    );
    const data = await fetchData();
    expect(data.history.movies).toHaveLength(3);
    const pages = requestsFor(fetchMock, "/sync/history/movies").map((u) =>
      u.searchParams.get("page"),
    );
    expect(pages).toContain("2");
    expect(pages).toContain("3");
  });

  test("treats a response without pagination headers as one page", async () => {
    const fetchMock = stubTrakt((path) =>
      path === "/sync/ratings"
        ? {
            body: [
              {
                rated_at: "2024-01-01T00:00:00.000Z",
                rating: 8,
                type: "movie",
                movie: { title: "A" },
              },
              {
                rated_at: "2024-01-02T00:00:00.000Z",
                rating: 9,
                type: "movie",
                movie: { title: "B" },
              },
            ],
          }
        : undefined,
    );
    const data = await fetchData();
    expect(data.ratings).toHaveLength(2);
    expect(requestsFor(fetchMock, "/sync/ratings")).toHaveLength(1);
  });

  test("warns instead of silently dropping a failed list", async () => {
    stubTrakt((path) => (path === "/sync/watchlist" ? { status: 500 } : undefined));
    const data = await fetchData();
    expect(data.watchlist).toEqual([]);
    expect(data.warnings).toHaveLength(1);
    expect(data.warnings[0]).toContain("watchlist");
  });

  test("throws when every list fails", async () => {
    stubTrakt(() => ({ status: 500 }));
    await expect(trakt.fetchUserData("token", "client")).rejects.toThrow("every list");
  });

  test("keeps a partial list when a later page fails", async () => {
    stubTrakt((path, page) => {
      if (path !== "/sync/history/shows") return undefined;
      if (page === 1) {
        return {
          body: [{ watched_at: "2024-01-01T00:00:00.000Z", type: "episode" }],
          pageCount: 3,
        };
      }
      if (page === 2) return { status: 500 };
      return { body: [{ watched_at: "2024-01-03T00:00:00.000Z", type: "episode" }] };
    });
    const data = await fetchData();
    expect(data.history.shows).toHaveLength(1);
    expect(data.warnings.some((w) => w.includes("page 2 of 3"))).toBe(true);
  });

  test("stops at MAX_PAGES_PER_LIST", async () => {
    stubTrakt((path, page) =>
      path === "/sync/history/movies" ? { body: [movieWatch(page)], pageCount: 1000 } : undefined,
    );
    const data = await fetchData();
    expect(data.history.movies).toHaveLength(MAX_PAGES_PER_LIST);
    expect(data.warnings.some((w) => w.includes(`first ${MAX_PAGES_PER_LIST} pages`))).toBe(true);
  });
});

describe("slimTraktItem", () => {
  test("slims items to the fields Sofa reads", () => {
    expect(
      slimTraktItem({
        id: 1,
        watched_at: "2024-01-01T00:00:00.000Z",
        action: "watch",
        type: "movie",
        movie: { title: "M", year: null, ids: { trakt: 9, slug: "m", imdb: null, tmdb: 5 } },
      }),
    ).toEqual({
      watched_at: "2024-01-01T00:00:00.000Z",
      type: "movie",
      movie: { title: "M", ids: { tmdb: 5 } },
    });

    const episodePlay = slimTraktItem({
      watched_at: "2024-01-01T00:00:00.000Z",
      type: "episode",
      episode: { season: 1, number: 2, title: "x", ids: { trakt: 3 } },
      show: { title: "S", year: 2020, ids: { tvdb: 7 } },
    });
    expect(episodePlay).toMatchObject({ episode: { season: 1, number: 2 } });
    expect(episodePlay?.episode).toEqual({ season: 1, number: 2 });
  });

  test("returns null for non-object input", () => {
    expect(slimTraktItem(null)).toBeNull();
    expect(slimTraktItem("x")).toBeNull();
  });
});

describe("fitToBudget", () => {
  test("keeps the most recent plays", () => {
    const payload = emptyPayload();
    for (let i = 0; i < 60; i++) {
      payload.history.movies.push(slimTraktItem(movieWatch(i)));
    }
    const result = fitToBudget(payload, 3_000);
    expect(jsonBytes(result)).toBeLessThanOrEqual(3_000);
    const kept = result.history.movies as { watched_at: string }[];
    expect(kept.length).toBeGreaterThan(0);
    expect(kept.length).toBeLessThan(60);

    const keptDates = new Set(kept.map((m) => m.watched_at));
    const dropped = (payload.history.movies as { watched_at: string }[]).filter(
      (m) => !keptDates.has(m.watched_at),
    );
    const oldestKept = [...keptDates].sort()[0] as string;
    for (const d of dropped) {
      expect(oldestKept > d.watched_at).toBe(true);
    }
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("60 plays");
  });

  test("leaves a small payload untouched", () => {
    const payload = emptyPayload();
    payload.history.movies.push(slimTraktItem(movieWatch(1)));
    const result = fitToBudget(payload, 1_000_000);
    expect(result).toEqual(payload);
    expect(result.warnings).toEqual([]);
  });
});
