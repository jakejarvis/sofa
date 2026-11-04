import { findEpisodeBySeasonAndNumber, findSeasonByTitleAndNumber } from "@sofa/db/queries/title";
import {
  getLibraryShows,
  getRecentEpisodeWatch,
  getRecentMovieWatch,
  insertIntegrationEventTransaction,
} from "@sofa/db/queries/webhooks";
import { createLogger } from "@sofa/logger";
import { getTvDetails } from "@sofa/tmdb/client";

import {
  resolveEpisodeByExternalIds,
  resolveMovieTmdbId,
  resolveShowTmdbId,
} from "./imports/resolve";
import { getOrFetchTitleByTmdbId, refreshTvChildren } from "./metadata";
import { logEpisodeWatch, logMovieWatch } from "./tracking";

const log = createLogger("webhooks");

const IMDB_GUID_PREFIX = "imdb://";
const TMDB_GUID_PREFIX = "tmdb://";
const TVDB_GUID_PREFIX = "tvdb://";

// ─── Types ──────────────────────────────────────────────────────────

export interface WebhookEvent {
  provider: "plex" | "jellyfin" | "emby";
  mediaType: "movie" | "episode";
  title: string;
  tmdbId?: number;
  imdbId?: string;
  tvdbId?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  showTitle?: string;
  /** Media server user who played the item, when the payload includes one. */
  username?: string;
}

/** @internal */
export function toOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Whether an event passes an integration's username filter. No filter accepts everyone; with a
 * filter, the event must name the same user (compared case-insensitively).
 */
export function matchesServerUsername(
  expected: string | null | undefined,
  actual: string | undefined,
): boolean {
  const wanted = toOptionalString(expected);
  if (!wanted) return true;
  if (!actual) return false;
  return wanted.localeCompare(actual, undefined, { sensitivity: "accent" }) === 0;
}

/** @internal */
export function toOptionalInt(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return undefined;
}

// ─── Payload Parsers ────────────────────────────────────────────────

export function parsePlexPayload(formData: FormData): WebhookEvent | null {
  const raw = formData.get("payload");
  if (!raw || typeof raw !== "string") return null;

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(raw);
  } catch {
    return null;
  }

  if (payload.event !== "media.scrobble") return null;

  const metadata = payload.Metadata as Record<string, unknown> | undefined;
  if (!metadata) return null;

  const metaType = metadata.type as string;
  const isMovie = metaType === "movie";
  const isEpisode = metaType === "episode";
  if (!isMovie && !isEpisode) return null;

  // Extract external IDs from Guid array
  const guids = (metadata.Guid ?? metadata.guid) as { id: string }[] | undefined;
  let tmdbId: number | undefined;
  let imdbId: string | undefined;
  let tvdbId: string | undefined;

  if (Array.isArray(guids)) {
    for (const g of guids) {
      const id = g.id ?? "";
      if (id.startsWith(TMDB_GUID_PREFIX)) {
        // Plex episode TMDB GUIDs identify episodes, not series.
        if (isMovie) tmdbId = toOptionalInt(id.slice(TMDB_GUID_PREFIX.length));
      } else if (id.startsWith(IMDB_GUID_PREFIX)) {
        imdbId = id.slice(IMDB_GUID_PREFIX.length);
      } else if (id.startsWith(TVDB_GUID_PREFIX)) {
        tvdbId = id.slice(TVDB_GUID_PREFIX.length);
      }
    }
  }

  return {
    provider: "plex",
    mediaType: isMovie ? "movie" : "episode",
    title: (metadata.title ?? metadata.Title ?? "") as string,
    tmdbId,
    imdbId,
    tvdbId,
    seasonNumber: toOptionalInt(metadata.parentIndex),
    episodeNumber: toOptionalInt(metadata.index),
    showTitle: (metadata.grandparentTitle ?? metadata.parentTitle) as string | undefined,
    // Plex sends one webhook per account for every user on the server; `Account` says who played it.
    username: toOptionalString((payload.Account as Record<string, unknown> | undefined)?.title),
  };
}

export function parseJellyfinPayload(body: Record<string, unknown>): WebhookEvent | null {
  const notifType = body.NotificationType as string | undefined;
  if (notifType !== "PlaybackStop") return null;
  if (body.PlayedToCompletion !== true) return null;

  const itemType = body.ItemType as string | undefined;
  const isMovie = itemType === "Movie";
  const isEpisode = itemType === "Episode";
  if (!isMovie && !isEpisode) return null;

  // Item-level TMDB ids on episode events identify the episode, not the series
  // (same as Plex, see #53) — rely on IMDb/TVDB/title to resolve the show.
  const tmdbId = isMovie ? toOptionalInt(body.Provider_tmdb) : undefined;

  return {
    provider: "jellyfin",
    mediaType: isMovie ? "movie" : "episode",
    title: (body.Name ?? "") as string,
    tmdbId,
    imdbId: (body.Provider_imdb as string) || undefined,
    tvdbId: (body.Provider_tvdb as string) || undefined,
    seasonNumber: toOptionalInt(body.SeasonNumber),
    episodeNumber: toOptionalInt(body.EpisodeNumber),
    showTitle: (body.SeriesName ?? body.ShowName) as string | undefined,
    username: toOptionalString(body.NotificationUsername ?? body.Username),
  };
}

export function parseEmbyPayload(body: Record<string, unknown>): WebhookEvent | null {
  // Emby sends "playback.stop" or "PlaybackStop" depending on webhook plugin version
  const event = body.Event as string | undefined;
  if (event !== "playback.stop" && event !== "PlaybackStop") return null;

  // Native Emby webhooks (4.7.9+) nest the flag under PlaybackInfo; older plugin
  // payloads put it at the top level. Accept either.
  const playbackInfo = body.PlaybackInfo as Record<string, unknown> | undefined;
  const playedToCompletion =
    body.PlayedToCompletion === true || playbackInfo?.PlayedToCompletion === true;
  if (!playedToCompletion) return null;

  const item = body.Item as Record<string, unknown> | undefined;
  if (!item) return null;

  const itemType = item.Type as string | undefined;
  const isMovie = itemType === "Movie";
  const isEpisode = itemType === "Episode";
  if (!isMovie && !isEpisode) return null;

  const providerIds = (item.ProviderIds ?? {}) as Record<string, string>;
  // Item-level TMDB ids on episode events identify the episode, not the series
  // (same as Plex, see #53) — rely on IMDb/TVDB/title to resolve the show.
  const tmdbId = isMovie ? toOptionalInt(providerIds.Tmdb) : undefined;

  return {
    provider: "emby",
    mediaType: isMovie ? "movie" : "episode",
    title: (item.Name ?? "") as string,
    tmdbId,
    imdbId: providerIds.Imdb || undefined,
    tvdbId: providerIds.Tvdb || undefined,
    seasonNumber: toOptionalInt(item.ParentIndexNumber),
    episodeNumber: toOptionalInt(item.IndexNumber),
    showTitle: (item.SeriesName ?? item.ShowName) as string | undefined,
    username: toOptionalString((body.User as Record<string, unknown> | undefined)?.Name),
  };
}

// ─── Title Resolution ───────────────────────────────────────────────

/** @internal Loose title key: "Ranma ½" and "Ranma1/2" both become "ranma12". */
export function normalizeShowTitle(title: string): string {
  return title
    .replaceAll("½", "1/2")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

/** The show in the user's library whose title matches, preferring ones they're watching. */
function findLibraryShowByTitle(userId: string, showTitle: string): number | null {
  const wanted = normalizeShowTitle(showTitle);
  if (!wanted) return null;
  const matches = getLibraryShows(userId).filter(
    (show) =>
      normalizeShowTitle(show.title) === wanted ||
      (show.originalTitle != null && normalizeShowTitle(show.originalTitle) === wanted),
  );
  const best = matches.find((show) => show.status === "in_progress") ?? matches[0];
  return best?.tmdbId ?? null;
}

async function resolveEpisode(
  event: WebhookEvent,
  userId: string,
): Promise<{
  showTmdbId: number;
  seasonNumber: number;
  episodeNumber: number;
  via: string;
} | null> {
  const { seasonNumber, episodeNumber } = event;
  if (seasonNumber == null || episodeNumber == null) return null;

  // 1. The episode's own IDs give TMDB's show and numbering, so a media server that numbers
  //    seasons differently (TVDB ordering, common for anime) still lands on the right episode.
  const exact = await resolveEpisodeByExternalIds({ imdbId: event.imdbId, tvdbId: event.tvdbId });
  if (exact) return { ...exact, via: "episode ID" };

  // 2. A show the user already tracks beats an arbitrary search hit with the same name.
  if (event.showTitle) {
    const libraryShow = findLibraryShowByTitle(userId, event.showTitle);
    if (libraryShow) {
      return { showTmdbId: libraryShow, seasonNumber, episodeNumber, via: "library title" };
    }
  }

  // 3. Last resort: search TMDB by title. Episode IDs were already tried above.
  const showTmdbId = await resolveShowTmdbId({ title: event.showTitle });
  if (!showTmdbId) return null;
  return { showTmdbId, seasonNumber, episodeNumber, via: "title search" };
}

// ─── Deduplication ──────────────────────────────────────────────────

function isDuplicateMovieWatch(userId: string, titleId: string): boolean {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const recent = getRecentMovieWatch(userId, titleId, fiveMinutesAgo);
  return !!recent;
}

function isDuplicateEpisodeWatch(userId: string, episodeId: string): boolean {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const recent = getRecentEpisodeWatch(userId, episodeId, fiveMinutesAgo);
  return !!recent;
}

// ─── Event Logging ──────────────────────────────────────────────────

function logEvent(
  connectionId: string,
  event: WebhookEvent | null,
  status: "success" | "ignored" | "error",
  errorMessage?: string,
) {
  insertIntegrationEventTransaction(
    {
      integrationId: connectionId,
      eventType:
        event?.provider === "plex"
          ? "media.scrobble"
          : event?.provider === "emby"
            ? "playback.stop"
            : "PlaybackStop",
      mediaType: event?.mediaType ?? null,
      mediaTitle: event?.title || null,
      status,
      errorMessage: errorMessage ?? null,
      receivedAt: new Date(),
    },
    connectionId,
  );
}

// ─── Main Processing ────────────────────────────────────────────────

export async function processWebhook(
  connectionId: string,
  userId: string,
  provider: "plex" | "jellyfin" | "emby",
  event: WebhookEvent,
  options: { serverUsername?: string | null } = {},
): Promise<{ status: "success" | "ignored" | "error"; message: string }> {
  log.info(`Received ${provider} webhook: ${event.mediaType} "${event.title}"`);

  if (!matchesServerUsername(options.serverUsername, event.username)) {
    const message = event.username
      ? `Played by another ${provider} user`
      : `No ${provider} user in the event to match`;
    log.debug(`Webhook ignored: ${message}`);
    // Don't record what someone else watched in this user's event log.
    logEvent(connectionId, { ...event, title: "" }, "ignored", message);
    return { status: "ignored", message };
  }

  try {
    if (event.mediaType === "movie") {
      const hasExternalId = event.tmdbId || event.imdbId || event.tvdbId;
      const tmdbId = await resolveMovieTmdbId({
        tmdbId: event.tmdbId,
        imdbId: event.imdbId,
        tvdbId: event.tvdbId,
        // Only use title fallback when at least one external ID is present;
        // title-only resolution without year is too unreliable for webhooks
        title: hasExternalId ? event.title : undefined,
      });
      if (!tmdbId) {
        log.warn(`Could not resolve TMDB ID for movie "${event.title}" from ${provider}`);
        logEvent(connectionId, event, "error", "Could not resolve TMDB ID for movie");
        return { status: "error", message: "Could not resolve TMDB ID" };
      }

      const title = await getOrFetchTitleByTmdbId(tmdbId, "movie");
      if (!title) {
        logEvent(connectionId, event, "error", "Failed to import movie");
        return { status: "error", message: "Failed to import movie" };
      }

      if (isDuplicateMovieWatch(userId, title.id)) {
        log.debug(`Duplicate movie watch ignored: "${event.title}"`);
        logEvent(connectionId, event, "ignored", "Duplicate watch within 5 minutes");
        return { status: "ignored", message: "Duplicate watch" };
      }

      logMovieWatch(userId, title.id, provider);
      log.info(`Logged movie watch: "${event.title}" (TMDB ${tmdbId})`);
      logEvent(connectionId, event, "success");
      return { status: "success", message: `Logged watch for ${event.title}` };
    }

    if (event.mediaType === "episode") {
      const resolved = await resolveEpisode(event, userId);
      if (!resolved) {
        log.warn(`Could not resolve episode "${event.title}" from ${provider}`);
        logEvent(connectionId, event, "error", "Could not resolve episode");
        return { status: "error", message: "Could not resolve episode" };
      }

      const title = await getOrFetchTitleByTmdbId(resolved.showTmdbId, "tv");
      if (!title) {
        logEvent(connectionId, event, "error", "Failed to import TV show");
        return { status: "error", message: "Failed to import TV show" };
      }

      log.info(
        `Matched ${provider} "${event.showTitle ?? event.title}" S${event.seasonNumber}E${event.episodeNumber} ` +
          `to "${title.title}" (TMDB ${resolved.showTmdbId}) S${resolved.seasonNumber}E${resolved.episodeNumber} via ${resolved.via}`,
      );

      // Find the episode in our DB
      let season = findSeasonByTitleAndNumber(title.id, resolved.seasonNumber);

      // Sofa doesn't store specials (season 0). Don't refetch the whole show for them.
      if (!season && resolved.seasonNumber === 0) {
        logEvent(connectionId, event, "ignored", "Specials (season 0) are not tracked");
        return { status: "ignored", message: "Specials are not tracked" };
      }

      let episode = season
        ? findEpisodeBySeasonAndNumber(season.id, resolved.episodeNumber)
        : undefined;

      if (!episode) {
        // Season or episode may be newer than our last TMDB fetch — refresh once.
        try {
          const show = await getTvDetails(resolved.showTmdbId);
          await refreshTvChildren(title.id, resolved.showTmdbId, show.number_of_seasons);
          season = findSeasonByTitleAndNumber(title.id, resolved.seasonNumber);
          episode = season
            ? findEpisodeBySeasonAndNumber(season.id, resolved.episodeNumber)
            : undefined;
        } catch (err) {
          log.warn(`Failed to refresh seasons for TMDB ${resolved.showTmdbId}:`, err);
        }
      }

      if (!season) {
        logEvent(connectionId, event, "error", `Season ${resolved.seasonNumber} not found`);
        return {
          status: "error",
          message: `Season ${resolved.seasonNumber} not found`,
        };
      }

      if (!episode) {
        logEvent(
          connectionId,
          event,
          "error",
          `S${resolved.seasonNumber}E${resolved.episodeNumber} not found`,
        );
        return {
          status: "error",
          message: `S${resolved.seasonNumber}E${resolved.episodeNumber} not found`,
        };
      }

      if (isDuplicateEpisodeWatch(userId, episode.id)) {
        log.debug(`Duplicate episode watch ignored: "${event.title}"`);
        logEvent(connectionId, event, "ignored", "Duplicate watch within 5 minutes");
        return { status: "ignored", message: "Duplicate watch" };
      }

      logEpisodeWatch(userId, episode.id, provider);
      log.info(
        `Logged episode watch: "${event.title}" S${resolved.seasonNumber}E${resolved.episodeNumber}`,
      );
      logEvent(connectionId, event, "success");
      return { status: "success", message: `Logged watch for ${event.title}` };
    }

    logEvent(connectionId, event, "ignored", `Unsupported media type: ${event.mediaType}`);
    return { status: "ignored", message: "Unsupported media type" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    try {
      logEvent(connectionId, event, "error", message);
    } catch {
      // best-effort
    }
    return { status: "error", message };
  }
}
