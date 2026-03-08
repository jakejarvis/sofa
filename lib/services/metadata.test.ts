import { describe, expect, test } from "bun:test";
import type {
  TmdbMovieDetails,
  TmdbTvDetails,
  TmdbVideo,
} from "@/lib/tmdb/client";
import {
  extractMovieContentRating,
  extractTvContentRating,
  pickBestTrailer,
} from "./metadata";

function makeVideo(overrides: Partial<TmdbVideo> = {}): TmdbVideo {
  return {
    id: "v1",
    key: "abc123",
    name: "Trailer",
    site: "YouTube",
    type: "Trailer",
    official: false,
    published_at: "2024-01-01T00:00:00.000Z",
    size: 1080,
    iso_639_1: "en",
    iso_3166_1: "US",
    ...overrides,
  };
}

describe("pickBestTrailer", () => {
  test("returns null for empty array", () => {
    expect(pickBestTrailer([])).toBeNull();
  });

  test("returns null when no YouTube videos", () => {
    const videos = [makeVideo({ site: "Vimeo", key: "vimeo1" })];
    expect(pickBestTrailer(videos)).toBeNull();
  });

  test("prefers official trailers over unofficial", () => {
    const videos = [
      makeVideo({ key: "unofficial", official: false, type: "Trailer" }),
      makeVideo({ key: "official", official: true, type: "Trailer" }),
    ];
    expect(pickBestTrailer(videos)).toBe("official");
  });

  test("prefers trailers over teasers", () => {
    const videos = [
      makeVideo({ key: "teaser", type: "Teaser" }),
      makeVideo({ key: "trailer", type: "Trailer" }),
    ];
    expect(pickBestTrailer(videos)).toBe("trailer");
  });

  test("falls back to teaser when no trailers", () => {
    const videos = [
      makeVideo({ key: "teaser", type: "Teaser" }),
      makeVideo({ key: "featurette", type: "Featurette" }),
    ];
    expect(pickBestTrailer(videos)).toBe("teaser");
  });

  test("returns null when only non-trailer/teaser types exist", () => {
    const videos = [
      makeVideo({ key: "feat", type: "Featurette" }),
      makeVideo({ key: "clip", type: "Clip" }),
    ];
    expect(pickBestTrailer(videos)).toBeNull();
  });

  test("prefers English over other languages", () => {
    const videos = [
      makeVideo({ key: "french", iso_639_1: "fr", type: "Trailer" }),
      makeVideo({ key: "english", iso_639_1: "en", type: "Trailer" }),
    ];
    expect(pickBestTrailer(videos)).toBe("english");
  });

  test("sorts by newest published_at", () => {
    const videos = [
      makeVideo({
        key: "older",
        type: "Trailer",
        official: true,
        published_at: "2023-01-01T00:00:00.000Z",
      }),
      makeVideo({
        key: "newer",
        type: "Trailer",
        official: true,
        published_at: "2024-06-01T00:00:00.000Z",
      }),
    ];
    expect(pickBestTrailer(videos)).toBe("newer");
  });

  test("handles missing published_at", () => {
    const videos = [
      makeVideo({
        key: "no-date",
        type: "Trailer",
        official: true,
        published_at: undefined as unknown as string,
      }),
      makeVideo({
        key: "with-date",
        type: "Trailer",
        official: true,
        published_at: "2024-01-01T00:00:00.000Z",
      }),
    ];
    expect(pickBestTrailer(videos)).toBe("with-date");
  });
});

describe("extractMovieContentRating", () => {
  test("returns US certification", () => {
    const movie = {
      release_dates: {
        results: [
          {
            iso_3166_1: "US",
            release_dates: [{ certification: "PG-13", type: 3 }],
          },
        ],
      },
    } as unknown as TmdbMovieDetails;
    expect(extractMovieContentRating(movie)).toBe("PG-13");
  });

  test("returns first non-empty certification", () => {
    const movie = {
      release_dates: {
        results: [
          {
            iso_3166_1: "US",
            release_dates: [
              { certification: "", type: 1 },
              { certification: "R", type: 3 },
            ],
          },
        ],
      },
    } as unknown as TmdbMovieDetails;
    expect(extractMovieContentRating(movie)).toBe("R");
  });

  test("returns null when no US entry", () => {
    const movie = {
      release_dates: {
        results: [
          {
            iso_3166_1: "GB",
            release_dates: [{ certification: "15", type: 3 }],
          },
        ],
      },
    } as unknown as TmdbMovieDetails;
    expect(extractMovieContentRating(movie)).toBeNull();
  });

  test("returns null when release_dates is undefined", () => {
    const movie = {} as unknown as TmdbMovieDetails;
    expect(extractMovieContentRating(movie)).toBeNull();
  });

  test("returns null when all US certifications are empty", () => {
    const movie = {
      release_dates: {
        results: [
          {
            iso_3166_1: "US",
            release_dates: [
              { certification: "", type: 1 },
              { certification: "", type: 3 },
            ],
          },
        ],
      },
    } as unknown as TmdbMovieDetails;
    expect(extractMovieContentRating(movie)).toBeNull();
  });
});

describe("extractTvContentRating", () => {
  test("returns US rating", () => {
    const show = {
      content_ratings: {
        results: [{ iso_3166_1: "US", rating: "TV-MA" }],
      },
    } as unknown as TmdbTvDetails;
    expect(extractTvContentRating(show)).toBe("TV-MA");
  });

  test("returns null when no US entry", () => {
    const show = {
      content_ratings: {
        results: [{ iso_3166_1: "DE", rating: "16" }],
      },
    } as unknown as TmdbTvDetails;
    expect(extractTvContentRating(show)).toBeNull();
  });

  test("returns null when content_ratings is undefined", () => {
    const show = {} as unknown as TmdbTvDetails;
    expect(extractTvContentRating(show)).toBeNull();
  });

  test("returns null when US rating is empty", () => {
    const show = {
      content_ratings: {
        results: [{ iso_3166_1: "US", rating: "" }],
      },
    } as unknown as TmdbTvDetails;
    expect(extractTvContentRating(show)).toBeNull();
  });
});
