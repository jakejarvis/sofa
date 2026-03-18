import { createLogger } from "@sofa/logger";

const log = createLogger("imports");

// ─── Types ──────────────────────────────────────────────────────────

export interface ImportMovie {
  tmdbId?: number;
  imdbId?: string;
  title: string;
  year?: number;
  watchedAt?: string;
  watchedOn?: string;
}

export interface ImportEpisode {
  showTmdbId?: number;
  imdbId?: string;
  tvdbId?: number;
  showTitle?: string;
  year?: number;
  seasonNumber: number;
  episodeNumber: number;
  watchedAt?: string;
  watchedOn?: string;
}

export interface ImportWatchlistItem {
  tmdbId?: number;
  imdbId?: string;
  tvdbId?: number;
  title: string;
  year?: number;
  type: "movie" | "tv";
}

export interface ImportRating {
  tmdbId?: number;
  imdbId?: string;
  tvdbId?: number;
  title: string;
  year?: number;
  type: "movie" | "tv";
  rating: number; // 1-5 (Sofa scale)
  ratedAt?: string;
  ratedOn?: string;
}

export type ImportSource = "trakt" | "simkl" | "letterboxd";

export interface NormalizedImport {
  source: ImportSource;
  movies: ImportMovie[];
  episodes: ImportEpisode[];
  watchlist: ImportWatchlistItem[];
  ratings: ImportRating[];
}

export interface ParseDiagnostics {
  unresolved: number;
  unsupported: number;
}

export interface ParseResult {
  data: NormalizedImport;
  warnings: string[];
  diagnostics?: ParseDiagnostics;
}

// ─── Diagnostics ────────────────────────────────────────────────────

/** Count items that have no external IDs and will need title-based resolution. */
export function countUnresolved(data: NormalizedImport): number {
  let count = 0;
  for (const m of data.movies) {
    if (!m.tmdbId && !m.imdbId) count++;
  }
  for (const e of data.episodes) {
    if (!e.showTmdbId && !e.imdbId && !e.tvdbId) count++;
  }
  for (const w of data.watchlist) {
    if (!w.tmdbId && !w.imdbId && !w.tvdbId) count++;
  }
  for (const r of data.ratings) {
    if (!r.tmdbId && !r.imdbId && !r.tvdbId) count++;
  }
  return count;
}

// ─── Rating Conversion ──────────────────────────────────────────────

/** Convert a 1-10 rating to Sofa's 1-5 integer scale. */
function convertRating10to5(rating: number): number | null {
  if (rating < 1 || rating > 10) return null;
  return Math.max(1, Math.min(5, Math.round(rating / 2)));
}

/** Convert Letterboxd's 0.5-5 half-star rating to Sofa's 1-5 integer scale. */
function convertLetterboxdRating(rating: number): number | null {
  if (rating < 0.5 || rating > 5) return null;
  return Math.max(1, Math.min(5, Math.round(rating)));
}

// ─── CSV Parsing ────────────────────────────────────────────────────

/** Simple CSV parser that handles quoted fields with commas. */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      fields.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] ?? "";
    }
    rows.push(row);
  }
  return rows;
}

// ─── Trakt Parser ───────────────────────────────────────────────────

interface TraktIds {
  trakt?: number;
  slug?: string;
  imdb?: string;
  tmdb?: number;
  tvdb?: number;
}

interface TraktHistoryMovie {
  watched_at?: string;
  movie?: { title?: string; year?: number; ids?: TraktIds };
}

interface TraktHistoryEpisode {
  watched_at?: string;
  show?: { title?: string; year?: number; ids?: TraktIds };
  episode?: {
    season?: number;
    number?: number;
    title?: string;
    ids?: TraktIds;
  };
}

interface TraktWatchlistItem {
  type?: "movie" | "show";
  movie?: { title?: string; year?: number; ids?: TraktIds };
  show?: { title?: string; year?: number; ids?: TraktIds };
}

interface TraktRatingItem {
  type?: "movie" | "show";
  rating?: number;
  rated_at?: string;
  movie?: { title?: string; year?: number; ids?: TraktIds };
  show?: { title?: string; year?: number; ids?: TraktIds };
}

export function parseTraktPayload(data: {
  history?: { movies?: TraktHistoryMovie[]; shows?: TraktHistoryEpisode[] };
  watchlist?: TraktWatchlistItem[];
  ratings?: TraktRatingItem[];
}): ParseResult {
  const warnings: string[] = [];
  const movies: ImportMovie[] = [];
  const episodes: ImportEpisode[] = [];
  const watchlist: ImportWatchlistItem[] = [];
  const ratings: ImportRating[] = [];

  // Movie watch history
  for (const item of data.history?.movies ?? []) {
    const movie = item.movie;
    if (!movie?.title) continue;
    movies.push({
      tmdbId: movie.ids?.tmdb,
      imdbId: movie.ids?.imdb,
      title: movie.title,
      year: movie.year,
      watchedAt: item.watched_at,
    });
  }

  // Episode watch history
  for (const item of data.history?.shows ?? []) {
    const show = item.show;
    const ep = item.episode;
    if (!show?.title || ep?.season == null || ep?.number == null) continue;
    episodes.push({
      showTmdbId: show.ids?.tmdb,
      imdbId: show.ids?.imdb,
      tvdbId: show.ids?.tvdb,
      showTitle: show.title,
      year: show.year,
      seasonNumber: ep.season,
      episodeNumber: ep.number,
      watchedAt: item.watched_at,
    });
  }

  // Watchlist
  for (const item of data.watchlist ?? []) {
    const entry = item.type === "movie" ? item.movie : item.show;
    if (!entry?.title) continue;
    watchlist.push({
      tmdbId: entry.ids?.tmdb,
      imdbId: entry.ids?.imdb,
      tvdbId: entry.ids?.tvdb,
      title: entry.title,
      year: entry.year,
      type: item.type === "show" ? "tv" : "movie",
    });
  }

  // Ratings
  for (const item of data.ratings ?? []) {
    const entry = item.type === "movie" ? item.movie : item.show;
    if (!entry?.title || item.rating == null) continue;
    const converted = convertRating10to5(item.rating);
    if (converted == null) {
      warnings.push(`Skipped invalid Trakt rating ${item.rating} for "${entry.title}"`);
      continue;
    }
    ratings.push({
      tmdbId: entry.ids?.tmdb,
      imdbId: entry.ids?.imdb,
      tvdbId: entry.ids?.tvdb,
      title: entry.title,
      year: entry.year,
      type: item.type === "show" ? "tv" : "movie",
      rating: converted,
      ratedAt: item.rated_at,
    });
  }

  log.info(
    `Parsed Trakt data: ${movies.length} movies, ${episodes.length} episodes, ${watchlist.length} watchlist, ${ratings.length} ratings`,
  );

  const normalized: NormalizedImport = {
    source: "trakt",
    movies,
    episodes,
    watchlist,
    ratings,
  };

  return {
    data: normalized,
    warnings,
    diagnostics: { unresolved: countUnresolved(normalized), unsupported: 0 },
  };
}

// ─── Simkl Parser ───────────────────────────────────────────────────

interface SimklIds {
  simkl?: number;
  imdb?: string;
  tmdb?: string | number;
  tvdb?: string | number;
  mal?: string | number;
}

interface SimklItem {
  title?: string;
  year?: number;
  type?: string; // "movie", "show", "anime"
  ids?: SimklIds;
  status?: string; // "completed", "watching", "plantowatch", "dropped", "hold"
  user_rating?: number;
  last_watched_at?: string;
  watched_episodes_count?: number;
  total_episodes_count?: number;
  seasons?: {
    number?: number;
    episodes?: { number?: number; watched_at?: string }[];
  }[];
}

export function parseSimklPayload(data: {
  movies?: SimklItem[];
  shows?: SimklItem[];
  anime?: SimklItem[];
}): ParseResult {
  const warnings: string[] = [];
  const movies: ImportMovie[] = [];
  const episodes: ImportEpisode[] = [];
  const watchlist: ImportWatchlistItem[] = [];
  const ratings: ImportRating[] = [];

  // Movies
  for (const item of data.movies ?? []) {
    if (!item.title) continue;
    const tmdbId =
      typeof item.ids?.tmdb === "number"
        ? item.ids.tmdb
        : item.ids?.tmdb
          ? Number(item.ids.tmdb)
          : undefined;

    if (item.status === "plantowatch") {
      watchlist.push({
        tmdbId: tmdbId ?? undefined,
        imdbId: item.ids?.imdb,
        title: item.title,
        year: item.year,
        type: "movie",
      });
    } else if (item.status === "completed" || item.status === "watching" || item.last_watched_at) {
      movies.push({
        tmdbId: tmdbId ?? undefined,
        imdbId: item.ids?.imdb,
        title: item.title,
        year: item.year,
        watchedAt: item.last_watched_at,
      });
    }

    if (item.user_rating != null) {
      const converted = convertRating10to5(item.user_rating);
      if (converted != null) {
        ratings.push({
          tmdbId: tmdbId ?? undefined,
          imdbId: item.ids?.imdb,
          title: item.title,
          year: item.year,
          type: "movie",
          rating: converted,
        });
      }
    }
  }

  // Shows + Anime (both map to TV type)
  const allShows = [...(data.shows ?? []), ...(data.anime ?? [])];
  for (const item of allShows) {
    if (!item.title) continue;
    const tmdbId =
      typeof item.ids?.tmdb === "number"
        ? item.ids.tmdb
        : item.ids?.tmdb
          ? Number(item.ids.tmdb)
          : undefined;
    const tvdbId =
      typeof item.ids?.tvdb === "number"
        ? item.ids.tvdb
        : item.ids?.tvdb
          ? Number(item.ids.tvdb)
          : undefined;

    if (item.status === "plantowatch") {
      watchlist.push({
        tmdbId: tmdbId ?? undefined,
        imdbId: item.ids?.imdb,
        tvdbId: tvdbId ?? undefined,
        title: item.title,
        year: item.year,
        type: "tv",
      });
    }

    // Extract individual episodes from seasons data
    if (item.seasons) {
      for (const season of item.seasons) {
        if (season.number == null) continue;
        for (const ep of season.episodes ?? []) {
          if (ep.number == null) continue;
          episodes.push({
            showTmdbId: tmdbId ?? undefined,
            imdbId: item.ids?.imdb,
            tvdbId: tvdbId ?? undefined,
            showTitle: item.title,
            year: item.year,
            seasonNumber: season.number,
            episodeNumber: ep.number,
            watchedAt: ep.watched_at,
          });
        }
      }
    }

    if (!item.seasons?.length && (item.status === "completed" || item.status === "watching")) {
      warnings.push(
        `"${item.title}" is marked ${item.status} but has no episode data — episode watches were not imported.`,
      );
    }

    if (item.user_rating != null) {
      const converted = convertRating10to5(item.user_rating);
      if (converted != null) {
        ratings.push({
          tmdbId: tmdbId ?? undefined,
          imdbId: item.ids?.imdb,
          tvdbId: tvdbId ?? undefined,
          title: item.title,
          year: item.year,
          type: "tv",
          rating: converted,
        });
      }
    }
  }

  log.info(
    `Parsed Simkl data: ${movies.length} movies, ${episodes.length} episodes, ${watchlist.length} watchlist, ${ratings.length} ratings`,
  );

  const normalized: NormalizedImport = {
    source: "simkl",
    movies,
    episodes,
    watchlist,
    ratings,
  };

  return {
    data: normalized,
    warnings,
    diagnostics: { unresolved: countUnresolved(normalized), unsupported: 0 },
  };
}

// ─── Letterboxd Parser ──────────────────────────────────────────────

const LETTERBOXD_EXPECTED_FILES = [
  "diary.csv",
  "watched.csv",
  "watchlist.csv",
  "ratings.csv",
] as const;

const LETTERBOXD_IGNORED_FILES = new Set(["reviews.csv", "profile.csv", "comments.csv"]);

export async function parseLetterboxdExport(zipFile: Blob): Promise<ParseResult> {
  const warnings: string[] = [];
  const movies: ImportMovie[] = [];
  const watchlist: ImportWatchlistItem[] = [];
  const ratings: ImportRating[] = [];

  const AdmZip = (await import("adm-zip")).default;
  let zip: InstanceType<typeof AdmZip>;
  try {
    const buffer = Buffer.from(await zipFile.arrayBuffer());
    zip = new AdmZip(buffer);
  } catch {
    warnings.push("Failed to read ZIP file. Ensure it is a valid Letterboxd export.");
    return {
      data: {
        source: "letterboxd",
        movies,
        episodes: [],
        watchlist,
        ratings,
      },
      warnings,
    };
  }

  const entries = zip.getEntries();
  const entryMap = new Map<string, string>();
  const allFilenames: string[] = [];

  for (const entry of entries) {
    if (entry.isDirectory) continue;
    // Letterboxd exports may nest files in a subdirectory — use the basename
    const name = entry.entryName.split("/").pop() ?? entry.entryName;
    allFilenames.push(name);
    if (LETTERBOXD_EXPECTED_FILES.includes(name as (typeof LETTERBOXD_EXPECTED_FILES)[number])) {
      entryMap.set(name, entry.getData().toString("utf-8"));
    }
  }

  // Check which expected files exist
  for (const expected of LETTERBOXD_EXPECTED_FILES) {
    if (!entryMap.has(expected)) {
      warnings.push(
        `${expected} not found in export — the corresponding data will not be imported.`,
      );
    }
  }

  // Log ignored files
  for (const name of allFilenames) {
    if (LETTERBOXD_EXPECTED_FILES.includes(name as (typeof LETTERBOXD_EXPECTED_FILES)[number])) {
      continue;
    }
    if (!LETTERBOXD_IGNORED_FILES.has(name)) {
      log.debug(`Ignoring unknown file in Letterboxd export: ${name}`);
    }
  }

  function readCsv(filename: string): Record<string, string>[] {
    const text = entryMap.get(filename);
    if (!text) return [];
    return parseCsv(text);
  }

  // Track which movies we've already seen (for dedup between diary and watched.csv)
  const seenMovies = new Set<string>();

  // Parse diary.csv (watch history with dates and optional ratings)
  for (const row of readCsv("diary.csv")) {
    const title = row.Name || row.Title;
    const yearStr = row.Year;
    if (!title) continue;

    const year = yearStr ? Number.parseInt(yearStr, 10) : undefined;
    const watchedOn = (row["Watched Date"] || row.WatchedDate) ?? "";
    // Include date in key to preserve rewatches of the same movie
    const key = `${title}::${year ?? ""}::${watchedOn}`;
    if (seenMovies.has(key)) continue;
    seenMovies.add(key);
    // Also mark title+year as seen to dedup against watched.csv
    seenMovies.add(`${title}::${year ?? ""}`);

    movies.push({
      title,
      year: year && !Number.isNaN(year) ? year : undefined,
      watchedOn: row["Watched Date"] || row.WatchedDate || undefined,
    });
  }

  // Parse watched.csv (films marked watched without specific dates)
  for (const row of readCsv("watched.csv")) {
    const title = row.Name || row.Title;
    const yearStr = row.Year;
    if (!title) continue;

    const year = yearStr ? Number.parseInt(yearStr, 10) : undefined;
    const key = `${title}::${year ?? ""}`;
    if (seenMovies.has(key)) continue;
    seenMovies.add(key);

    movies.push({
      title,
      year: year && !Number.isNaN(year) ? year : undefined,
    });
  }

  // Parse watchlist.csv
  for (const row of readCsv("watchlist.csv")) {
    const title = row.Name || row.Title;
    const yearStr = row.Year;
    if (!title) continue;

    const year = yearStr ? Number.parseInt(yearStr, 10) : undefined;
    watchlist.push({
      title,
      year: year && !Number.isNaN(year) ? year : undefined,
      type: "movie",
    });
  }

  // Parse ratings.csv
  for (const row of readCsv("ratings.csv")) {
    const title = row.Name || row.Title;
    const yearStr = row.Year;
    const ratingStr = row.Rating;
    if (!title || !ratingStr) continue;

    const rawRating = Number.parseFloat(ratingStr);
    if (Number.isNaN(rawRating)) continue;

    const converted = convertLetterboxdRating(rawRating);
    if (converted == null) {
      warnings.push(`Skipped invalid Letterboxd rating ${rawRating} for "${title}"`);
      continue;
    }

    const year = yearStr ? Number.parseInt(yearStr, 10) : undefined;
    ratings.push({
      title,
      year: year && !Number.isNaN(year) ? year : undefined,
      type: "movie",
      rating: converted,
      ratedOn: row.Date || undefined,
    });
  }

  log.info(
    `Parsed Letterboxd export: ${movies.length} movies, ${watchlist.length} watchlist, ${ratings.length} ratings`,
  );

  // Letterboxd has no IDs — all items need title-based resolution
  const unresolved = movies.length + watchlist.length + ratings.length;

  return {
    data: { source: "letterboxd", movies, episodes: [], watchlist, ratings },
    warnings,
    diagnostics: { unresolved, unsupported: 0 },
  };
}
