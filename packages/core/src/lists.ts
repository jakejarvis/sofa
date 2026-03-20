import { z } from "zod";

import {
  batchUpdateTvdbIds,
  getRadarrMovies,
  getSonarrShows,
  resolveListIntegration,
} from "@sofa/db/queries/lists";
import { createLogger } from "@sofa/logger";
import { getTvExternalIds } from "@sofa/tmdb/client";

const log = createLogger("lists");

/** Look up a list integration token and return the userId + provider, or null. */
export function resolveListToken(
  token: string,
): { userId: string; provider: "sonarr" | "radarr" } | null {
  const row = resolveListIntegration(token);
  if (!row) return null;
  return {
    userId: row.userId,
    provider: row.provider as "sonarr" | "radarr",
  };
}

const statusSchema = z.enum(["watchlist", "in_progress", "completed"]);
type Status = z.infer<typeof statusSchema>;

/** Parse a comma-separated status query param into validated statuses. */
export function parseStatusParam(param: string | null): Status[] {
  if (!param) return ["watchlist"];
  const parsed = param.split(",").filter((s) => statusSchema.safeParse(s).success) as Status[];
  return parsed.length > 0 ? parsed : ["watchlist"];
}

/** Radarr custom list format: `[{ Id: tmdbId }]` for movies. */
export function getRadarrList(
  userId: string,
  statuses: Status[] = ["watchlist"],
): { Id: number }[] {
  const rows = getRadarrMovies(userId, statuses);
  return rows.map((r) => ({ Id: r.tmdbId }));
}

/** Sonarr custom list format: `[{ TvdbId, Title }]` for TV shows.
 *  Lazily resolves missing TVDB IDs via TMDB API and caches them. */
export async function getSonarrList(
  userId: string,
  statuses: Status[] = ["watchlist"],
): Promise<{ TvdbId: number; Title: string }[]> {
  // TV never stores 'completed' — map it to 'in_progress' (completion is derived)
  const mappedStatuses = [
    ...new Set(statuses.map((s) => (s === "completed" ? "in_progress" : s))),
  ] as Status[];
  const rows = getSonarrShows(userId, mappedStatuses);

  // Resolve missing TVDB IDs in parallel instead of sequentially
  const needsResolution = rows.filter((r) => r.tvdbId == null);
  if (needsResolution.length > 0) {
    const resolved = await Promise.all(
      needsResolution.map(async (row) => {
        try {
          const externalIds = await getTvExternalIds(row.tmdbId);
          return { row, tvdbId: externalIds.tvdb_id };
        } catch (err) {
          log.warn(`Failed to resolve TVDB ID for TMDB ${row.tmdbId}:`, err);
          return { row, tvdbId: null };
        }
      }),
    );
    // Batch update resolved IDs
    const updates: { titleId: string; tvdbId: number }[] = [];
    for (const { row, tvdbId } of resolved) {
      if (tvdbId != null) {
        row.tvdbId = tvdbId;
        updates.push({ titleId: row.id, tvdbId });
      }
    }
    batchUpdateTvdbIds(updates);
  }

  return rows
    .filter((r): r is typeof r & { tvdbId: number } => r.tvdbId != null)
    .map((r) => ({ TvdbId: r.tvdbId, Title: r.title }));
}
