import { afterEach, describe, expect, test, vi } from "vitest";

import { simkl } from "./simkl";

type FetchFn = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

function mockFetchJson(body: unknown, status = 200) {
  const fetchMock = vi.fn<FetchFn>(
    async (_input, _init) => new Response(JSON.stringify(body), { status }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("simkl.pollForToken", () => {
  test("KO (authorization pending) is pending, not denied", async () => {
    mockFetchJson({ result: "KO", message: "Authorization pending" });
    expect(await simkl.pollForToken("client-1", "", "ABC123")).toEqual({ status: "pending" });
  });

  test("OK with a token is authorized", async () => {
    mockFetchJson({ result: "OK", access_token: "tok" });
    expect(await simkl.pollForToken("client-1", "", "ABC123")).toEqual({
      status: "authorized",
      accessToken: "tok",
    });
  });

  test("non-2xx is pending", async () => {
    mockFetchJson({}, 500);
    expect(await simkl.pollForToken("client-1", "", "ABC123")).toEqual({ status: "pending" });
  });

  test("sends client_id as a query parameter", async () => {
    const fetchMock = mockFetchJson({ result: "KO" });
    await simkl.pollForToken("client-1", "", "ABC123");
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/oauth/pin/ABC123?client_id=client-1");
  });
});

const movieItem = {
  status: "completed",
  last_watched_at: "2024-01-15T20:00:00Z",
  movie: { title: "M", year: 2010, ids: { tmdb: 1 } },
};
const showItem = {
  status: "watching",
  show: { title: "S", ids: { tvdb: 2 } },
  seasons: [
    {
      number: 1,
      episodes: [{ number: 1, watched_at: "2024-01-16T20:00:00Z" }, { number: 2 }],
    },
  ],
};

type UserData = {
  movies: { title?: string }[];
  shows: { seasons?: { episodes?: unknown[] }[] }[];
  anime: unknown[];
};

function stubAllItems(responses: { movies: unknown; shows: unknown; anime: unknown }) {
  const fetchMock = vi.fn<FetchFn>(async (input, _init) => {
    const url = String(input);
    if (url.includes("/sync/all-items/movies")) {
      return new Response(JSON.stringify(responses.movies));
    }
    if (url.includes("/sync/all-items/shows")) {
      return new Response(JSON.stringify(responses.shows));
    }
    if (url.includes("/sync/all-items/anime")) {
      return new Response(JSON.stringify(responses.anime));
    }
    return new Response("{}", { status: 404 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("simkl.fetchUserData", () => {
  test("unwraps type-keyed all-items responses", async () => {
    stubAllItems({ movies: { movies: [movieItem] }, shows: { shows: [showItem] }, anime: {} });
    const data = (await simkl.fetchUserData("token", "client-1")) as UserData;
    expect(data.movies[0]?.title).toBe("M");
    expect(data.shows[0]?.seasons?.[0]?.episodes?.length).toBe(1);
    expect(data.anime.length).toBe(0);
  });

  test("still accepts bare arrays", async () => {
    stubAllItems({ movies: [movieItem], shows: [showItem], anime: [] });
    const data = (await simkl.fetchUserData("token", "client-1")) as UserData;
    expect(data.movies[0]?.title).toBe("M");
    expect(data.shows[0]?.seasons?.[0]?.episodes?.length).toBe(1);
    expect(data.anime.length).toBe(0);
  });
});
