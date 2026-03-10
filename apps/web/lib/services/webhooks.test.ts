import { describe, expect, test } from "bun:test";
import {
  parseEmbyPayload,
  parseJellyfinPayload,
  parsePlexPayload,
  toOptionalInt,
} from "./webhooks";

describe("toOptionalInt", () => {
  test("returns integer number as-is", () => {
    expect(toOptionalInt(42)).toBe(42);
  });

  test("returns 0 for zero", () => {
    expect(toOptionalInt(0)).toBe(0);
  });

  test("returns undefined for float", () => {
    expect(toOptionalInt(3.14)).toBeUndefined();
  });

  test("parses valid integer string", () => {
    expect(toOptionalInt("7")).toBe(7);
  });

  test("parses string with whitespace", () => {
    expect(toOptionalInt(" 12 ")).toBe(12);
  });

  test("returns undefined for non-numeric string", () => {
    expect(toOptionalInt("abc")).toBeUndefined();
  });

  test("returns undefined for empty string", () => {
    expect(toOptionalInt("")).toBeUndefined();
  });

  test("returns undefined for null", () => {
    expect(toOptionalInt(null)).toBeUndefined();
  });

  test("returns undefined for undefined", () => {
    expect(toOptionalInt(undefined)).toBeUndefined();
  });

  test("returns undefined for boolean", () => {
    expect(toOptionalInt(true)).toBeUndefined();
  });
});

describe("parsePlexPayload", () => {
  function makeFormData(payload: unknown): FormData {
    const fd = new FormData();
    fd.set("payload", JSON.stringify(payload));
    return fd;
  }

  test("returns null for missing payload field", () => {
    expect(parsePlexPayload(new FormData())).toBeNull();
  });

  test("returns null for invalid JSON", () => {
    const fd = new FormData();
    fd.set("payload", "not json{");
    expect(parsePlexPayload(fd)).toBeNull();
  });

  test("returns null for wrong event type", () => {
    expect(parsePlexPayload(makeFormData({ event: "media.play" }))).toBeNull();
  });

  test("returns null when Metadata is missing", () => {
    expect(
      parsePlexPayload(makeFormData({ event: "media.scrobble" })),
    ).toBeNull();
  });

  test("returns null for unsupported media type", () => {
    expect(
      parsePlexPayload(
        makeFormData({
          event: "media.scrobble",
          Metadata: { type: "track" },
        }),
      ),
    ).toBeNull();
  });

  test("parses movie scrobble", () => {
    const result = parsePlexPayload(
      makeFormData({
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

  test("parses episode scrobble", () => {
    const result = parsePlexPayload(
      makeFormData({
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

  test("extracts GUIDs from lowercase guid field", () => {
    const result = parsePlexPayload(
      makeFormData({
        event: "media.scrobble",
        Metadata: {
          type: "movie",
          title: "Test",
          guid: [{ id: "tmdb://12345" }],
        },
      }),
    );
    expect(result?.tmdbId).toBe(12345);
  });
});

describe("parseJellyfinPayload", () => {
  test("returns null for wrong NotificationType", () => {
    expect(
      parseJellyfinPayload({ NotificationType: "PlaybackStart" }),
    ).toBeNull();
  });

  test("returns null when PlayedToCompletion is false", () => {
    expect(
      parseJellyfinPayload({
        NotificationType: "PlaybackStop",
        PlayedToCompletion: false,
        ItemType: "Movie",
      }),
    ).toBeNull();
  });

  test("returns null for unsupported ItemType", () => {
    expect(
      parseJellyfinPayload({
        NotificationType: "PlaybackStop",
        PlayedToCompletion: true,
        ItemType: "Audio",
      }),
    ).toBeNull();
  });

  test("parses movie payload", () => {
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

  test("parses episode payload", () => {
    const result = parseJellyfinPayload({
      NotificationType: "PlaybackStop",
      PlayedToCompletion: true,
      ItemType: "Episode",
      Name: "Ozymandias",
      Provider_tmdb: "62161",
      SeasonNumber: 5,
      EpisodeNumber: 14,
      SeriesName: "Breaking Bad",
    });
    expect(result).toEqual({
      provider: "jellyfin",
      mediaType: "episode",
      title: "Ozymandias",
      tmdbId: 62161,
      imdbId: undefined,
      tvdbId: undefined,
      seasonNumber: 5,
      episodeNumber: 14,
      showTitle: "Breaking Bad",
    });
  });
});

describe("parseEmbyPayload", () => {
  test("returns null for wrong event type", () => {
    expect(
      parseEmbyPayload({ Event: "playback.start", PlayedToCompletion: true }),
    ).toBeNull();
  });

  test("returns null when PlayedToCompletion is false", () => {
    expect(
      parseEmbyPayload({ Event: "playback.stop", PlayedToCompletion: false }),
    ).toBeNull();
  });

  test("returns null when Item is missing", () => {
    expect(
      parseEmbyPayload({ Event: "playback.stop", PlayedToCompletion: true }),
    ).toBeNull();
  });

  test("accepts 'playback.stop' event string", () => {
    const result = parseEmbyPayload({
      Event: "playback.stop",
      PlayedToCompletion: true,
      Item: {
        Type: "Movie",
        Name: "Interstellar",
        ProviderIds: { Tmdb: "157336" },
      },
    });
    expect(result?.provider).toBe("emby");
    expect(result?.tmdbId).toBe(157336);
  });

  test("accepts 'PlaybackStop' event string", () => {
    const result = parseEmbyPayload({
      Event: "PlaybackStop",
      PlayedToCompletion: true,
      Item: {
        Type: "Movie",
        Name: "Interstellar",
        ProviderIds: { Tmdb: "157336" },
      },
    });
    expect(result?.provider).toBe("emby");
  });

  test("parses episode with ProviderIds", () => {
    const result = parseEmbyPayload({
      Event: "playback.stop",
      PlayedToCompletion: true,
      Item: {
        Type: "Episode",
        Name: "Pilot",
        ParentIndexNumber: 1,
        IndexNumber: 1,
        SeriesName: "Lost",
        ProviderIds: { Tmdb: "12345", Imdb: "tt0000001", Tvdb: "67890" },
      },
    });
    expect(result).toEqual({
      provider: "emby",
      mediaType: "episode",
      title: "Pilot",
      tmdbId: 12345,
      imdbId: "tt0000001",
      tvdbId: "67890",
      seasonNumber: 1,
      episodeNumber: 1,
      showTitle: "Lost",
    });
  });

  test("handles missing ProviderIds gracefully", () => {
    const result = parseEmbyPayload({
      Event: "playback.stop",
      PlayedToCompletion: true,
      Item: { Type: "Movie", Name: "Unknown Movie" },
    });
    expect(result?.tmdbId).toBeUndefined();
    expect(result?.imdbId).toBeUndefined();
  });
});
