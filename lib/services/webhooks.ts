import { and, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  episodes,
  seasons,
  userEpisodeWatches,
  userMovieWatches,
  webhookConnections,
  webhookEventLog,
} from "@/lib/db/schema";
import { findByExternalId, searchTv } from "@/lib/tmdb/client";
import { importTitle } from "./metadata";
import { logEpisodeWatch, logMovieWatch } from "./tracking";

// ─── Types ──────────────────────────────────────────────────────────

export interface WebhookEvent {
  provider: "plex" | "jellyfin";
  mediaType: "movie" | "episode";
  title: string;
  tmdbId?: number;
  imdbId?: string;
  tvdbId?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  showTitle?: string;
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
  const guids = (metadata.Guid ?? metadata.guid) as
    | { id: string }[]
    | undefined;
  let tmdbId: number | undefined;
  let imdbId: string | undefined;
  let tvdbId: string | undefined;

  if (Array.isArray(guids)) {
    for (const g of guids) {
      const id = g.id ?? "";
      if (id.startsWith("tmdb://")) tmdbId = Number.parseInt(id.slice(7), 10);
      else if (id.startsWith("imdb://")) imdbId = id.slice(7);
      else if (id.startsWith("tvdb://")) tvdbId = id.slice(7);
    }
  }

  return {
    provider: "plex",
    mediaType: isMovie ? "movie" : "episode",
    title: (metadata.title ?? metadata.Title ?? "") as string,
    tmdbId: tmdbId && !Number.isNaN(tmdbId) ? tmdbId : undefined,
    imdbId,
    tvdbId,
    seasonNumber: metadata.parentIndex as number | undefined,
    episodeNumber: metadata.index as number | undefined,
    showTitle: (metadata.grandparentTitle ?? metadata.parentTitle) as
      | string
      | undefined,
  };
}

export function parseJellyfinPayload(
  body: Record<string, unknown>,
): WebhookEvent | null {
  const notifType = body.NotificationType as string | undefined;
  if (notifType !== "PlaybackStop") return null;
  if (body.PlayedToCompletion !== true) return null;

  const itemType = body.ItemType as string | undefined;
  const isMovie = itemType === "Movie";
  const isEpisode = itemType === "Episode";
  if (!isMovie && !isEpisode) return null;

  const tmdbRaw = body.Provider_tmdb as string | undefined;
  const tmdbId = tmdbRaw ? Number.parseInt(tmdbRaw, 10) : undefined;

  return {
    provider: "jellyfin",
    mediaType: isMovie ? "movie" : "episode",
    title: (body.Name ?? "") as string,
    tmdbId: tmdbId && !Number.isNaN(tmdbId) ? tmdbId : undefined,
    imdbId: (body.Provider_imdb as string) || undefined,
    tvdbId: (body.Provider_tvdb as string) || undefined,
    seasonNumber: body.SeasonNumber as number | undefined,
    episodeNumber: body.EpisodeNumber as number | undefined,
    showTitle: (body.SeriesName ?? body.ShowName) as string | undefined,
  };
}

// ─── Title Resolution ───────────────────────────────────────────────

async function resolveMovieTmdbId(event: WebhookEvent): Promise<number | null> {
  if (event.tmdbId) return event.tmdbId;

  if (event.imdbId) {
    const result = await findByExternalId(event.imdbId, "imdb_id");
    if (result.movie_results.length > 0) return result.movie_results[0].id;
  }

  if (event.tvdbId) {
    const result = await findByExternalId(event.tvdbId, "tvdb_id");
    if (result.movie_results.length > 0) return result.movie_results[0].id;
  }

  return null;
}

async function resolveEpisode(event: WebhookEvent): Promise<{
  showTmdbId: number;
  seasonNumber: number;
  episodeNumber: number;
} | null> {
  const seasonNumber = event.seasonNumber;
  const episodeNumber = event.episodeNumber;
  if (seasonNumber == null || episodeNumber == null) return null;

  // Strategy 1: Use IMDB ID to find the episode and get show_id
  if (event.imdbId) {
    const result = await findByExternalId(event.imdbId, "imdb_id");
    if (result.tv_episode_results.length > 0) {
      return {
        showTmdbId: result.tv_episode_results[0].show_id,
        seasonNumber,
        episodeNumber,
      };
    }
    // IMDB ID might reference the show itself
    if (result.tv_results.length > 0) {
      return {
        showTmdbId: result.tv_results[0].id,
        seasonNumber,
        episodeNumber,
      };
    }
  }

  // Strategy 2: Use TVDB ID
  if (event.tvdbId) {
    const result = await findByExternalId(event.tvdbId, "tvdb_id");
    if (result.tv_episode_results.length > 0) {
      return {
        showTmdbId: result.tv_episode_results[0].show_id,
        seasonNumber,
        episodeNumber,
      };
    }
    if (result.tv_results.length > 0) {
      return {
        showTmdbId: result.tv_results[0].id,
        seasonNumber,
        episodeNumber,
      };
    }
  }

  // Strategy 3: Use TMDB ID directly if it's the show ID
  if (event.tmdbId) {
    return { showTmdbId: event.tmdbId, seasonNumber, episodeNumber };
  }

  // Strategy 4: Search by show title
  if (event.showTitle) {
    const searchResult = await searchTv(event.showTitle);
    if (searchResult.results.length > 0) {
      return {
        showTmdbId: searchResult.results[0].id,
        seasonNumber,
        episodeNumber,
      };
    }
  }

  return null;
}

// ─── Deduplication ──────────────────────────────────────────────────

async function isDuplicateMovieWatch(
  userId: string,
  titleId: string,
): Promise<boolean> {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const recent = await db
    .select()
    .from(userMovieWatches)
    .where(
      and(
        eq(userMovieWatches.userId, userId),
        eq(userMovieWatches.titleId, titleId),
        gte(userMovieWatches.watchedAt, fiveMinutesAgo),
      ),
    )
    .get();
  return !!recent;
}

async function isDuplicateEpisodeWatch(
  userId: string,
  episodeId: string,
): Promise<boolean> {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const recent = await db
    .select()
    .from(userEpisodeWatches)
    .where(
      and(
        eq(userEpisodeWatches.userId, userId),
        eq(userEpisodeWatches.episodeId, episodeId),
        gte(userEpisodeWatches.watchedAt, fiveMinutesAgo),
      ),
    )
    .get();
  return !!recent;
}

// ─── Event Logging ──────────────────────────────────────────────────

async function logEvent(
  connectionId: string,
  event: WebhookEvent | null,
  status: "success" | "ignored" | "error",
  errorMessage?: string,
) {
  await db
    .insert(webhookEventLog)
    .values({
      connectionId,
      eventType: event?.provider === "plex" ? "media.scrobble" : "PlaybackStop",
      mediaType: event?.mediaType ?? null,
      mediaTitle: event?.title ?? null,
      status,
      errorMessage: errorMessage ?? null,
      receivedAt: new Date(),
    })
    .run();

  await db
    .update(webhookConnections)
    .set({ lastEventAt: new Date() })
    .where(eq(webhookConnections.id, connectionId))
    .run();
}

// ─── Main Processing ────────────────────────────────────────────────

export async function processWebhook(
  connectionId: string,
  userId: string,
  provider: "plex" | "jellyfin",
  event: WebhookEvent,
): Promise<{ status: "success" | "ignored" | "error"; message: string }> {
  try {
    if (event.mediaType === "movie") {
      const tmdbId = await resolveMovieTmdbId(event);
      if (!tmdbId) {
        await logEvent(
          connectionId,
          event,
          "error",
          "Could not resolve TMDB ID for movie",
        );
        return { status: "error", message: "Could not resolve TMDB ID" };
      }

      const title = await importTitle(tmdbId, "movie");
      if (!title) {
        await logEvent(connectionId, event, "error", "Failed to import movie");
        return { status: "error", message: "Failed to import movie" };
      }

      if (await isDuplicateMovieWatch(userId, title.id)) {
        await logEvent(
          connectionId,
          event,
          "ignored",
          "Duplicate watch within 5 minutes",
        );
        return { status: "ignored", message: "Duplicate watch" };
      }

      await logMovieWatch(userId, title.id, provider);
      await logEvent(connectionId, event, "success");
      return { status: "success", message: `Logged watch for ${event.title}` };
    }

    if (event.mediaType === "episode") {
      const resolved = await resolveEpisode(event);
      if (!resolved) {
        await logEvent(
          connectionId,
          event,
          "error",
          "Could not resolve episode",
        );
        return { status: "error", message: "Could not resolve episode" };
      }

      const title = await importTitle(resolved.showTmdbId, "tv");
      if (!title) {
        await logEvent(
          connectionId,
          event,
          "error",
          "Failed to import TV show",
        );
        return { status: "error", message: "Failed to import TV show" };
      }

      // Find the episode in our DB
      const season = await db
        .select()
        .from(seasons)
        .where(
          and(
            eq(seasons.titleId, title.id),
            eq(seasons.seasonNumber, resolved.seasonNumber),
          ),
        )
        .get();

      if (!season) {
        await logEvent(
          connectionId,
          event,
          "error",
          `Season ${resolved.seasonNumber} not found`,
        );
        return {
          status: "error",
          message: `Season ${resolved.seasonNumber} not found`,
        };
      }

      const episode = await db
        .select()
        .from(episodes)
        .where(
          and(
            eq(episodes.seasonId, season.id),
            eq(episodes.episodeNumber, resolved.episodeNumber),
          ),
        )
        .get();

      if (!episode) {
        await logEvent(
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

      if (await isDuplicateEpisodeWatch(userId, episode.id)) {
        await logEvent(
          connectionId,
          event,
          "ignored",
          "Duplicate watch within 5 minutes",
        );
        return { status: "ignored", message: "Duplicate watch" };
      }

      await logEpisodeWatch(userId, episode.id, provider);
      await logEvent(connectionId, event, "success");
      return { status: "success", message: `Logged watch for ${event.title}` };
    }

    await logEvent(
      connectionId,
      event,
      "ignored",
      `Unsupported media type: ${event.mediaType}`,
    );
    return { status: "ignored", message: "Unsupported media type" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await logEvent(connectionId, event, "error", message).catch(() => {});
    return { status: "error", message };
  }
}
