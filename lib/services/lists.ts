import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { integrations, titles, userTitleStatus } from "@/lib/db/schema";
import { createLogger } from "@/lib/logger";
import { getTvExternalIds } from "@/lib/tmdb/client";

const log = createLogger("lists");

/** Look up a list integration token and return the userId + provider, or null. */
export function resolveListToken(
  token: string,
): { userId: string; provider: "sonarr" | "radarr" } | null {
  const row = db
    .select({
      userId: integrations.userId,
      provider: integrations.provider,
    })
    .from(integrations)
    .where(
      and(
        eq(integrations.token, token),
        eq(integrations.type, "list"),
        eq(integrations.enabled, true),
      ),
    )
    .get();
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
  const parsed = param
    .split(",")
    .filter((s) => statusSchema.safeParse(s).success) as Status[];
  return parsed.length > 0 ? parsed : ["watchlist"];
}

/** Radarr custom list format: `[{ Id: tmdbId }]` for movies. */
export function getRadarrList(
  userId: string,
  statuses: Status[] = ["watchlist"],
): { Id: number }[] {
  const rows = db
    .select({ tmdbId: titles.tmdbId })
    .from(userTitleStatus)
    .innerJoin(titles, eq(userTitleStatus.titleId, titles.id))
    .where(
      and(
        eq(userTitleStatus.userId, userId),
        eq(titles.type, "movie"),
        inArray(userTitleStatus.status, statuses),
      ),
    )
    .all();
  return rows.map((r) => ({ Id: r.tmdbId }));
}

/** Sonarr custom list format: `[{ TvdbId, Title }]` for TV shows.
 *  Lazily resolves missing TVDB IDs via TMDB API and caches them. */
export async function getSonarrList(
  userId: string,
  statuses: Status[] = ["watchlist"],
): Promise<{ TvdbId: number; Title: string }[]> {
  const rows = db
    .select({
      id: titles.id,
      tmdbId: titles.tmdbId,
      tvdbId: titles.tvdbId,
      title: titles.title,
    })
    .from(userTitleStatus)
    .innerJoin(titles, eq(userTitleStatus.titleId, titles.id))
    .where(
      and(
        eq(userTitleStatus.userId, userId),
        eq(titles.type, "tv"),
        inArray(userTitleStatus.status, statuses),
      ),
    )
    .all();

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
    // Batch update resolved IDs in a single transaction
    db.transaction((tx) => {
      for (const { row, tvdbId } of resolved) {
        if (tvdbId != null) {
          row.tvdbId = tvdbId;
          tx.update(titles).set({ tvdbId }).where(eq(titles.id, row.id)).run();
        }
      }
    });
  }

  return rows
    .filter((r): r is typeof r & { tvdbId: number } => r.tvdbId != null)
    .map((r) => ({ TvdbId: r.tvdbId, Title: r.title }));
}
