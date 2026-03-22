import { beforeEach, describe, expect, test, vi } from "vitest";

import {
  clearAllTables,
  insertIntegration,
  insertMovieWatch,
  insertTvShow,
  insertUser,
} from "@sofa/test/db";

import {
  parseEmbyPayload,
  parseJellyfinPayload,
  parsePlexPayload,
  processWebhook,
  toOptionalInt,
  type WebhookEvent,
} from "../src/webhooks";

const { mockResolveMovieTmdbId, mockResolveShowTmdbId } = vi.hoisted(() => ({
  mockResolveMovieTmdbId: vi.fn(async () => null as number | null),
  mockResolveShowTmdbId: vi.fn(async () => null as number | null),
}));

vi.mock("../src/imports/resolve", () => ({
  resolveMovieTmdbId: mockResolveMovieTmdbId,
  resolveShowTmdbId: mockResolveShowTmdbId,
}));

const { mockGetOrFetchTitleByTmdbId, mockRefreshTvChildren } = vi.hoisted(() => ({
  mockGetOrFetchTitleByTmdbId: vi.fn(async () => null as { id: string } | null),
  mockRefreshTvChildren: vi.fn(async () => {}),
}));

vi.mock("../src/metadata", () => ({
  getOrFetchTitleByTmdbId: mockGetOrFetchTitleByTmdbId,
  refreshTvChildren: mockRefreshTvChildren,
}));

const { mockGetTvDetails } = vi.hoisted(() => ({
  mockGetTvDetails: vi.fn(async () => ({ number_of_seasons: 1 })),
}));

vi.mock("@sofa/tmdb/client", () => ({
  getTvDetails: mockGetTvDetails,
}));

beforeEach(() => {
  clearAllTables();
  mockResolveMovieTmdbId.mockReset().mockResolvedValue(null);
  mockResolveShowTmdbId.mockReset().mockResolvedValue(null);
  mockGetOrFetchTitleByTmdbId.mockReset().mockResolvedValue(null);
  mockRefreshTvChildren.mockReset();
  mockGetTvDetails.mockReset().mockResolvedValue({ number_of_seasons: 1 });
});

// ─── toOptionalInt ──────────────────────────────────────────────────

describe("toOptionalInt", () => {
  test("returns integer from number", () => {
    expect(toOptionalInt(42)).toBe(42);
  });

  test("returns undefined for float", () => {
    expect(toOptionalInt(3.14)).toBeUndefined();
  });

  test("parses integer from string", () => {
    expect(toOptionalInt("123")).toBe(123);
  });

  test("returns undefined for non-numeric string", () => {
    expect(toOptionalInt("abc")).toBeUndefined();
  });

  test("returns undefined for empty string", () => {
    expect(toOptionalInt("")).toBeUndefined();
  });

  test("returns undefined for null/undefined", () => {
    expect(toOptionalInt(null)).toBeUndefined();
    expect(toOptionalInt(undefined)).toBeUndefined();
  });
});

// ─── parsePlexPayload ───────────────────────────────────────────────

describe("parsePlexPayload", () => {
  function makePlexForm(payload: Record<string, unknown>): FormData {
    const form = new FormData();
    form.set("payload", JSON.stringify(payload));
    return form;
  }

  test("parses a movie scrobble event", () => {
    const result = parsePlexPayload(
      makePlexForm({
        event: "media.scrobble",
        Metadata: {
          type: "movie",
          title: "Inception",
          Guid: [{ id: "tmdb://27205" }, { id: "imdb://tt1375666" }],
        },
      }),
    );
    expect(result).toEqual({
      provider: "plex",
      mediaType: "movie",
      title: "Inception",
      tmdbId: 27205,
      imdbId: "tt1375666",
      tvdbId: undefined,
      seasonNumber: undefined,
      episodeNumber: undefined,
      showTitle: undefined,
    });
  });

  test("parses an episode scrobble event", () => {
    const result = parsePlexPayload(
      makePlexForm({
        event: "media.scrobble",
        Metadata: {
          type: "episode",
          title: "Pilot",
          grandparentTitle: "Breaking Bad",
          parentIndex: 1,
          index: 1,
          Guid: [{ id: "tvdb://349232" }],
        },
      }),
    );
    expect(result).toEqual({
      provider: "plex",
      mediaType: "episode",
      title: "Pilot",
      tmdbId: undefined,
      imdbId: undefined,
      tvdbId: "349232",
      seasonNumber: 1,
      episodeNumber: 1,
      showTitle: "Breaking Bad",
    });
  });

  test("returns null for non-scrobble events", () => {
    expect(parsePlexPayload(makePlexForm({ event: "media.play" }))).toBeNull();
  });

  test("returns null for missing payload", () => {
    expect(parsePlexPayload(new FormData())).toBeNull();
  });

  test("returns null for invalid JSON", () => {
    const form = new FormData();
    form.set("payload", "not json");
    expect(parsePlexPayload(form)).toBeNull();
  });

  test("returns null for unsupported media type", () => {
    const result = parsePlexPayload(
      makePlexForm({
        event: "media.scrobble",
        Metadata: { type: "track", title: "Some Song" },
      }),
    );
    expect(result).toBeNull();
  });

  test("returns null when Metadata is missing", () => {
    expect(parsePlexPayload(makePlexForm({ event: "media.scrobble" }))).toBeNull();
  });

  test("handles lowercase guid key", () => {
    const result = parsePlexPayload(
      makePlexForm({
        event: "media.scrobble",
        Metadata: {
          type: "movie",
          title: "Test",
          guid: [{ id: "tmdb://999" }],
        },
      }),
    );
    expect(result?.tmdbId).toBe(999);
  });
});

// ─── parseJellyfinPayload ───────────────────────────────────────────

describe("parseJellyfinPayload", () => {
  test("parses a completed movie playback", () => {
    const result = parseJellyfinPayload({
      NotificationType: "PlaybackStop",
      PlayedToCompletion: true,
      ItemType: "Movie",
      Name: "The Matrix",
      Provider_tmdb: "603",
      Provider_imdb: "tt0133093",
    });
    expect(result).toEqual({
      provider: "jellyfin",
      mediaType: "movie",
      title: "The Matrix",
      tmdbId: 603,
      imdbId: "tt0133093",
      tvdbId: undefined,
      seasonNumber: undefined,
      episodeNumber: undefined,
      showTitle: undefined,
    });
  });

  test("parses a completed episode playback", () => {
    const result = parseJellyfinPayload({
      NotificationType: "PlaybackStop",
      PlayedToCompletion: true,
      ItemType: "Episode",
      Name: "Ozymandias",
      SeriesName: "Breaking Bad",
      SeasonNumber: 5,
      EpisodeNumber: 14,
      Provider_tvdb: "4882562",
    });
    expect(result).toEqual({
      provider: "jellyfin",
      mediaType: "episode",
      title: "Ozymandias",
      tmdbId: undefined,
      imdbId: undefined,
      tvdbId: "4882562",
      seasonNumber: 5,
      episodeNumber: 14,
      showTitle: "Breaking Bad",
    });
  });

  test("returns null when not PlaybackStop", () => {
    expect(
      parseJellyfinPayload({
        NotificationType: "PlaybackStart",
        PlayedToCompletion: true,
        ItemType: "Movie",
      }),
    ).toBeNull();
  });

  test("returns null when not played to completion", () => {
    expect(
      parseJellyfinPayload({
        NotificationType: "PlaybackStop",
        PlayedToCompletion: false,
        ItemType: "Movie",
      }),
    ).toBeNull();
  });

  test("returns null for unsupported item type", () => {
    expect(
      parseJellyfinPayload({
        NotificationType: "PlaybackStop",
        PlayedToCompletion: true,
        ItemType: "Audio",
      }),
    ).toBeNull();
  });
});

// ─── parseEmbyPayload ───────────────────────────────────────────────

describe("parseEmbyPayload", () => {
  test("parses playback.stop movie event", () => {
    const result = parseEmbyPayload({
      Event: "playback.stop",
      PlayedToCompletion: true,
      Item: {
        Type: "Movie",
        Name: "Interstellar",
        ProviderIds: { Tmdb: "157336", Imdb: "tt0816692" },
      },
    });
    expect(result).toEqual({
      provider: "emby",
      mediaType: "movie",
      title: "Interstellar",
      tmdbId: 157336,
      imdbId: "tt0816692",
      tvdbId: undefined,
      seasonNumber: undefined,
      episodeNumber: undefined,
      showTitle: undefined,
    });
  });

  test("parses PlaybackStop event variant", () => {
    const result = parseEmbyPayload({
      Event: "PlaybackStop",
      PlayedToCompletion: true,
      Item: { Type: "Movie", Name: "Test", ProviderIds: {} },
    });
    expect(result?.provider).toBe("emby");
  });

  test("parses episode event", () => {
    const result = parseEmbyPayload({
      Event: "playback.stop",
      PlayedToCompletion: true,
      Item: {
        Type: "Episode",
        Name: "Pilot",
        SeriesName: "Lost",
        ParentIndexNumber: 1,
        IndexNumber: 1,
        ProviderIds: { Tvdb: "127131" },
      },
    });
    expect(result).toEqual({
      provider: "emby",
      mediaType: "episode",
      title: "Pilot",
      tmdbId: undefined,
      imdbId: undefined,
      tvdbId: "127131",
      seasonNumber: 1,
      episodeNumber: 1,
      showTitle: "Lost",
    });
  });

  test("returns null for non-stop events", () => {
    expect(
      parseEmbyPayload({
        Event: "playback.start",
        PlayedToCompletion: true,
        Item: { Type: "Movie", Name: "X" },
      }),
    ).toBeNull();
  });

  test("returns null when not played to completion", () => {
    expect(
      parseEmbyPayload({
        Event: "playback.stop",
        PlayedToCompletion: false,
        Item: { Type: "Movie", Name: "X" },
      }),
    ).toBeNull();
  });

  test("returns null when Item is missing", () => {
    expect(parseEmbyPayload({ Event: "playback.stop", PlayedToCompletion: true })).toBeNull();
  });
});

// ─── processWebhook ─────────────────────────────────────────────────

describe("processWebhook", () => {
  const userId = "user-1";
  let connectionId: string;

  beforeEach(() => {
    insertUser(userId);
    const integration = insertIntegration(userId, "plex", "plex-token");
    connectionId = integration.id;
  });

  test("logs a movie watch on successful resolution", async () => {
    const { insertTitle } = await import("@sofa/test/db");
    insertTitle({ id: "title-1", tmdbId: 27205, type: "movie", title: "Inception" });
    mockResolveMovieTmdbId.mockResolvedValue(27205);
    mockGetOrFetchTitleByTmdbId.mockResolvedValue({ id: "title-1" });

    const event: WebhookEvent = {
      provider: "plex",
      mediaType: "movie",
      title: "Inception",
      tmdbId: 27205,
    };

    const result = await processWebhook(connectionId, userId, "plex", event);
    expect(result.status).toBe("success");
  });

  test("returns error when movie TMDB ID cannot be resolved", async () => {
    mockResolveMovieTmdbId.mockResolvedValue(null);

    const event: WebhookEvent = {
      provider: "plex",
      mediaType: "movie",
      title: "Unknown Movie",
    };

    const result = await processWebhook(connectionId, userId, "plex", event);
    expect(result.status).toBe("error");
    expect(result.message).toContain("Could not resolve TMDB ID");
  });

  test("returns error when title import fails", async () => {
    mockResolveMovieTmdbId.mockResolvedValue(999);
    mockGetOrFetchTitleByTmdbId.mockResolvedValue(null);

    const event: WebhookEvent = {
      provider: "jellyfin",
      mediaType: "movie",
      title: "Bad Movie",
      tmdbId: 999,
    };

    const result = await processWebhook(connectionId, userId, "jellyfin", event);
    expect(result.status).toBe("error");
    expect(result.message).toContain("Failed to import movie");
  });

  test("deduplicates movie watches within 5 minutes", async () => {
    mockResolveMovieTmdbId.mockResolvedValue(27205);
    mockGetOrFetchTitleByTmdbId.mockResolvedValue({ id: "title-1" });

    // Seed a recent watch
    const { insertTitle } = await import("@sofa/test/db");
    insertTitle({ id: "title-1", tmdbId: 27205, type: "movie", title: "Inception" });
    insertMovieWatch(userId, "title-1");

    const event: WebhookEvent = {
      provider: "plex",
      mediaType: "movie",
      title: "Inception",
      tmdbId: 27205,
    };

    const result = await processWebhook(connectionId, userId, "plex", event);
    expect(result.status).toBe("ignored");
    expect(result.message).toContain("Duplicate");
  });

  test("logs an episode watch on successful resolution", async () => {
    mockResolveShowTmdbId.mockResolvedValue(1396);
    const { titleId } = insertTvShow("tv-1", 1396, 1, 1, { title: "Breaking Bad" });
    mockGetOrFetchTitleByTmdbId.mockResolvedValue({ id: titleId });

    const event: WebhookEvent = {
      provider: "jellyfin",
      mediaType: "episode",
      title: "Pilot",
      showTitle: "Breaking Bad",
      tmdbId: 1396,
      seasonNumber: 1,
      episodeNumber: 1,
    };

    const result = await processWebhook(connectionId, userId, "jellyfin", event);
    expect(result.status).toBe("success");
  });

  test("returns error when episode cannot be resolved", async () => {
    mockResolveShowTmdbId.mockResolvedValue(null);

    const event: WebhookEvent = {
      provider: "emby",
      mediaType: "episode",
      title: "Some Episode",
      seasonNumber: 1,
      episodeNumber: 1,
    };

    const result = await processWebhook(connectionId, userId, "emby", event);
    expect(result.status).toBe("error");
    expect(result.message).toContain("Could not resolve episode");
  });

  test("returns error when season is not found", async () => {
    mockResolveShowTmdbId.mockResolvedValue(1396);
    insertTvShow("tv-1", 1396, 1, 3, { title: "Breaking Bad" });
    mockGetOrFetchTitleByTmdbId.mockResolvedValue({ id: "tv-1" });
    mockGetTvDetails.mockResolvedValue({ number_of_seasons: 1 });

    const event: WebhookEvent = {
      provider: "plex",
      mediaType: "episode",
      title: "Episode",
      showTitle: "Breaking Bad",
      tmdbId: 1396,
      seasonNumber: 99,
      episodeNumber: 1,
    };

    const result = await processWebhook(connectionId, userId, "plex", event);
    expect(result.status).toBe("error");
    expect(result.message).toContain("Season 99 not found");
  });

  test("returns error when episode number is not found in season", async () => {
    mockResolveShowTmdbId.mockResolvedValue(1396);
    insertTvShow("tv-1", 1396, 1, 3, { title: "Breaking Bad" });
    mockGetOrFetchTitleByTmdbId.mockResolvedValue({ id: "tv-1" });

    const event: WebhookEvent = {
      provider: "plex",
      mediaType: "episode",
      title: "Episode",
      showTitle: "Breaking Bad",
      tmdbId: 1396,
      seasonNumber: 1,
      episodeNumber: 99,
    };

    const result = await processWebhook(connectionId, userId, "plex", event);
    expect(result.status).toBe("error");
    expect(result.message).toContain("S1E99 not found");
  });

  test("returns error when episode is missing season/episode numbers", async () => {
    const event: WebhookEvent = {
      provider: "plex",
      mediaType: "episode",
      title: "Mystery Episode",
    };

    const result = await processWebhook(connectionId, userId, "plex", event);
    expect(result.status).toBe("error");
  });
});
