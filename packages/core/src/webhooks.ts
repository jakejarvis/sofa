import { findEpisodeBySeasonAndNumber, findSeasonByTitleAndNumber } from "@sofa/db/queries/title";
import {
  getRecentEpisodeWatch,
  getRecentMovieWatch,
  insertIntegrationEvent,
  updateIntegrationLastEvent,
} from "@sofa/db/queries/webhooks";
import { createLogger } from "@sofa/logger";
import { getTvDetails } from "@sofa/tmdb/client";

import { resolveMovieTmdbId, resolveShowTmdbId } from "./imports/resolve";
import { getOrFetchTitleByTmdbId, refreshTvChildren } from "./metadata";
import { logEpisodeWatch, logMovieWatch } from "./tracking";

const log = createLogger("webhooks");

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
      if (id.startsWith("tmdb://")) tmdbId = toOptionalInt(id.slice(7));
      else if (id.startsWith("imdb://")) imdbId = id.slice(7);
      else if (id.startsWith("tvdb://")) tvdbId = id.slice(7);
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

  const tmdbId = toOptionalInt(body.Provider_tmdb);

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
  };
}

export function parseEmbyPayload(body: Record<string, unknown>): WebhookEvent | null {
  // Emby sends "playback.stop" or "PlaybackStop" depending on webhook plugin version
  const event = body.Event as string | undefined;
  if (event !== "playback.stop" && event !== "PlaybackStop") return null;
  if (body.PlayedToCompletion !== true) return null;

  const item = body.Item as Record<string, unknown> | undefined;
  if (!item) return null;

  const itemType = item.Type as string | undefined;
  const isMovie = itemType === "Movie";
  const isEpisode = itemType === "Episode";
  if (!isMovie && !isEpisode) return null;

  const providerIds = (item.ProviderIds ?? {}) as Record<string, string>;
  const tmdbId = toOptionalInt(providerIds.Tmdb);

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
  };
}

// ─── Title Resolution ───────────────────────────────────────────────

async function resolveEpisode(event: WebhookEvent): Promise<{
  showTmdbId: number;
  seasonNumber: number;
  episodeNumber: number;
} | null> {
  const { seasonNumber, episodeNumber } = event;
  if (seasonNumber == null || episodeNumber == null) return null;

  const showTmdbId = await resolveShowTmdbId({
    tmdbId: event.tmdbId,
    imdbId: event.imdbId,
    tvdbId: event.tvdbId,
    title: event.showTitle,
  });

  if (!showTmdbId) return null;
  return { showTmdbId, seasonNumber, episodeNumber };
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
  insertIntegrationEvent({
    integrationId: connectionId,
    eventType:
      event?.provider === "plex"
        ? "media.scrobble"
        : event?.provider === "emby"
          ? "playback.stop"
          : "PlaybackStop",
    mediaType: event?.mediaType ?? null,
    mediaTitle: event?.title ?? null,
    status,
    errorMessage: errorMessage ?? null,
    receivedAt: new Date(),
  });

  updateIntegrationLastEvent(connectionId);
}

// ─── Main Processing ────────────────────────────────────────────────

export async function processWebhook(
  connectionId: string,
  userId: string,
  provider: "plex" | "jellyfin" | "emby",
  event: WebhookEvent,
): Promise<{ status: "success" | "ignored" | "error"; message: string }> {
  log.info(`Received ${provider} webhook: ${event.mediaType} "${event.title}"`);
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
      const resolved = await resolveEpisode(event);
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

      // Find the episode in our DB
      let season = findSeasonByTitleAndNumber(title.id, resolved.seasonNumber);

      if (!season) {
        // Season might be newly released — try refreshing from TMDB
        try {
          const show = await getTvDetails(resolved.showTmdbId);
          await refreshTvChildren(title.id, resolved.showTmdbId, show.number_of_seasons);
          season = findSeasonByTitleAndNumber(title.id, resolved.seasonNumber);
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

      const episode = findEpisodeBySeasonAndNumber(season.id, resolved.episodeNumber);

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
