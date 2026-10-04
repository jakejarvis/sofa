import type { z } from "zod";

import {
  ImportEpisodeSchema,
  ImportMovieSchema,
  ImportRatingSchema,
  ImportWatchlistItemSchema,
} from "@sofa/api/schemas";
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
  status?: "watchlist" | "in_progress" | "completed";
  addedAt?: string;
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

export type ImportSource = "trakt" | "simkl" | "letterboxd" | "sofa";

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

/** Mirrors the `.max()` on each list in NormalizedImportSchema. */
const MAX_ITEMS_PER_LIST = 50_000;

/** Turn `null` / `NaN` field values into `undefined` (the API schemas allow optional, not null). */
function withoutNulls<T extends object>(item: T): T {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(item)) {
    if (value === null || (typeof value === "number" && Number.isNaN(value))) continue;
    clean[key] = value;
  }
  return clean as T;
}

/**
 * Make parser output conform to NormalizedImportSchema. Real exports contain
 * nulls (Trakt sends `"imdb": null`, `"year": null`) and occasional invalid
 * entries (e.g. episode number 0); one bad item must not fail the whole parse,
 * so invalid items are dropped and summarized in a warning.
 */
export function finalizeParseResult(
  data: NormalizedImport,
  warnings: string[],
  unsupported = 0,
): ParseResult {
  let dropped = 0;

  function clean<T extends object>(list: string, items: T[], schema: z.ZodType<T>): T[] {
    const kept: T[] = [];
    const examples: string[] = [];
    let invalid = 0;
    for (const raw of items) {
      const result = schema.safeParse(withoutNulls(raw));
      if (result.success) {
        kept.push(result.data);
      } else {
        invalid++;
        if (examples.length < 3) {
          const issue = result.error.issues[0];
          examples.push(`${issue?.path.join(".") || "item"}: ${issue?.message ?? "invalid"}`);
        }
      }
    }
    if (invalid > 0) {
      dropped += invalid;
      warnings.push(`Skipped ${invalid} invalid ${list} (${examples.join("; ")})`);
    }
    if (kept.length > MAX_ITEMS_PER_LIST) {
      warnings.push(
        `Only the first ${MAX_ITEMS_PER_LIST.toLocaleString("en-US")} ${list} were included (${kept.length.toLocaleString("en-US")} found)`,
      );
      return kept.slice(0, MAX_ITEMS_PER_LIST);
    }
    return kept;
  }

  const normalized: NormalizedImport = {
    source: data.source,
    movies: clean("movies", data.movies, ImportMovieSchema),
    episodes: clean("episodes", data.episodes, ImportEpisodeSchema),
    watchlist: clean("watchlist items", data.watchlist, ImportWatchlistItemSchema),
    ratings: clean("ratings", data.ratings, ImportRatingSchema),
  };

  return {
    data: normalized,
    warnings,
    diagnostics: { unresolved: countUnresolved(normalized), unsupported: unsupported + dropped },
  };
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
  type?: "movie" | "show" | "season" | "episode";
  movie?: { title?: string; year?: number; ids?: TraktIds };
  show?: { title?: string; year?: number; ids?: TraktIds };
}

interface TraktRatingItem {
  type?: "movie" | "show" | "season" | "episode";
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
  // Sofa has no season/episode watchlist: those items mean "the user wants this show".
  for (const item of data.watchlist ?? []) {
    if (
      item.type !== "movie" &&
      item.type !== "show" &&
      item.type !== "season" &&
      item.type !== "episode"
    ) {
      continue;
    }
    const entry = item.type === "movie" ? item.movie : item.show;
    if (!entry?.title) continue;
    watchlist.push({
      tmdbId: entry.ids?.tmdb,
      imdbId: entry.ids?.imdb,
      tvdbId: entry.ids?.tvdb,
      title: entry.title,
      year: entry.year,
      type: item.type === "movie" ? "movie" : "tv",
    });
  }

  // Ratings (Sofa only rates movies and shows; season/episode ratings are unsupported)
  let unsupported = 0;
  for (const item of data.ratings ?? []) {
    if (item.type === "season" || item.type === "episode") {
      unsupported++;
      continue;
    }
    if (item.type !== "movie" && item.type !== "show") continue;
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

  if (unsupported > 0) {
    warnings.push(
      `Skipped ${unsupported} Trakt season/episode ratings (Sofa only rates movies and shows)`,
    );
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

  return finalizeParseResult(normalized, warnings, unsupported);
}

interface TraktAggregate {
  history: { movies: TraktHistoryMovie[]; shows: TraktHistoryEpisode[] };
  watchlist: TraktWatchlistItem[];
  ratings: TraktRatingItem[];
}

function pushArray<T>(target: T[], value: unknown): void {
  if (Array.isArray(value)) target.push(...(value as T[]));
}

/** Sort one JSON document's Trakt items into the aggregate parseTraktPayload expects. */
function addTraktDocument(agg: TraktAggregate, json: unknown): void {
  if (json && typeof json === "object" && !Array.isArray(json)) {
    // Already-aggregated format: { history: { movies, shows }, watchlist, ratings }
    const obj = json as Record<string, unknown>;
    const history = obj.history;
    if (history && typeof history === "object" && !Array.isArray(history)) {
      const h = history as Record<string, unknown>;
      pushArray(agg.history.movies, h.movies);
      pushArray(agg.history.shows, h.shows);
    }
    pushArray(agg.watchlist, obj.watchlist);
    pushArray(agg.ratings, obj.ratings);
    return;
  }
  if (!Array.isArray(json)) return;
  for (const item of json as Record<string, unknown>[]) {
    if (!item || typeof item !== "object") continue;
    if ("watched_at" in item) {
      if (item.episode && item.show) agg.history.shows.push(item as TraktHistoryEpisode);
      else if (item.movie) agg.history.movies.push(item as TraktHistoryMovie);
    } else if ("rating" in item) {
      agg.ratings.push(item as TraktRatingItem);
    } else if ("listed_at" in item) {
      agg.watchlist.push(item as TraktWatchlistItem);
    }
  }
}

/** JSON.parse that tolerates a leading UTF-8 BOM (as Blob.json() does). */
function parseJsonText(text: string): unknown {
  return JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);
}

/**
 * Parse an uploaded Trakt export: Trakt's official ZIP (watched-history-*.json,
 * ratings-*.json, lists-watchlist.json, …), any single JSON file from it, or the
 * aggregated { history, watchlist, ratings } JSON. Items are classified by their
 * fields rather than file names.
 */
export async function parseTraktExport(file: Blob): Promise<ParseResult> {
  const agg: TraktAggregate = { history: { movies: [], shows: [] }, watchlist: [], ratings: [] };
  const buf = Buffer.from(await file.arrayBuffer());

  if (buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04) {
    const AdmZip = (await import("adm-zip")).default;
    let entries: ReturnType<InstanceType<typeof AdmZip>["getEntries"]>;
    try {
      entries = new AdmZip(buf).getEntries();
    } catch {
      throw new Error("Invalid export file");
    }
    for (const entry of entries) {
      if (entry.isDirectory) continue;
      const name = entry.entryName.split("/").pop() ?? entry.entryName;
      if (!name.toLowerCase().endsWith(".json")) continue;
      try {
        addTraktDocument(agg, parseJsonText(entry.getData().toString("utf-8")));
      } catch {
        log.debug(`Skipping unreadable Trakt export entry: ${entry.entryName}`);
      }
    }
  } else {
    let json: unknown;
    try {
      json = parseJsonText(buf.toString("utf8"));
    } catch {
      throw new Error("Invalid JSON file");
    }
    addTraktDocument(agg, json);
  }

  const empty =
    agg.history.movies.length === 0 &&
    agg.history.shows.length === 0 &&
    agg.watchlist.length === 0 &&
    agg.ratings.length === 0;

  const result = parseTraktPayload(agg);
  if (empty) {
    result.warnings.push("No Trakt history, ratings or watchlist items were found in this file.");
  }
  return result;
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
  added_to_watchlist_at?: string;
  movie?: { title?: string; year?: number; ids?: SimklIds };
  show?: { title?: string; year?: number; ids?: SimklIds };
  watched_episodes_count?: number;
  total_episodes_count?: number;
  seasons?: {
    number?: number;
    episodes?: { number?: number; watched_at?: string }[];
  }[];
}

function mapSimklStatus(status?: string): "watchlist" | "in_progress" | "completed" | undefined {
  switch (status) {
    case "plantowatch":
      return "watchlist";
    case "watching":
    case "dropped":
    case "hold":
      return "in_progress";
    case "completed":
      return "completed";
    default:
      return undefined;
  }
}

/**
 * Simkl's API and its SimklBackup.json nest title metadata under `movie`/`show`;
 * Sofa's public-api flattens it first. Accept both shapes. When episodes carry
 * `watched_at`, only those are watched (the API lists unwatched ones too);
 * when none do, every listed episode counts as watched.
 */
function normalizeSimklItem(item: SimklItem): SimklItem {
  const media = item.movie ?? item.show;
  const anyTimestamp = item.seasons?.some((s) => s.episodes?.some((ep) => ep.watched_at));
  const seasons = anyTimestamp
    ? item.seasons
        ?.map((s) => ({ ...s, episodes: s.episodes?.filter((ep) => ep.watched_at) }))
        .filter((s) => (s.episodes?.length ?? 0) > 0)
    : item.seasons;
  return {
    ...item,
    title: item.title ?? media?.title,
    year: item.year ?? media?.year,
    ids: item.ids ?? media?.ids,
    seasons,
  };
}

/** ISO timestamp for the schema's `.datetime()`, or undefined if unparseable. */
function simklAddedAt(value?: string): string | undefined {
  if (!value) return undefined;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? undefined : new Date(ms).toISOString();
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
  for (const raw of data.movies ?? []) {
    const item = normalizeSimklItem(raw);
    if (!item.title) continue;
    const tmdbId =
      typeof item.ids?.tmdb === "number"
        ? item.ids.tmdb
        : item.ids?.tmdb
          ? Number(item.ids.tmdb)
          : undefined;

    const sofaStatus = mapSimklStatus(item.status);
    if (sofaStatus) {
      watchlist.push({
        tmdbId: tmdbId ?? undefined,
        imdbId: item.ids?.imdb,
        title: item.title,
        year: item.year,
        type: "movie",
        status: sofaStatus,
        addedAt: simklAddedAt(item.added_to_watchlist_at),
      });
    }

    if (
      item.status === "completed" ||
      item.status === "watching" ||
      item.status === "dropped" ||
      item.status === "hold" ||
      item.last_watched_at
    ) {
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
  const allShows = [...(data.shows ?? []), ...(data.anime ?? [])].map(normalizeSimklItem);
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

    const sofaStatus = mapSimklStatus(item.status);
    if (sofaStatus) {
      watchlist.push({
        tmdbId: tmdbId ?? undefined,
        imdbId: item.ids?.imdb,
        tvdbId: tvdbId ?? undefined,
        title: item.title,
        year: item.year,
        type: "tv",
        status: sofaStatus,
        addedAt: simklAddedAt(item.added_to_watchlist_at),
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

  return finalizeParseResult(normalized, warnings);
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

  // Letterboxd has no IDs — all items need title-based resolution (counted by the finalizer)
  return finalizeParseResult(
    { source: "letterboxd", movies, episodes: [], watchlist, ratings },
    warnings,
  );
}
