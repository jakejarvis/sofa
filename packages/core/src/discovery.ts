import { db } from "@sofa/db/client";
import { and, desc, eq, inArray, sql } from "@sofa/db/helpers";
import {
  availabilityOffers,
  episodes,
  seasons,
  titleRecommendations,
  titles,
  userEpisodeWatches,
  userMovieWatches,
  userRatings,
  userTitleStatus,
} from "@sofa/db/schema";
import { tmdbImageUrl } from "@sofa/tmdb/image";

export type TimePeriod = "today" | "this_week" | "this_month" | "this_year";

export function periodStartTimestamp(period: TimePeriod): number {
  const now = new Date();
  const start = new Date(now);
  switch (period) {
    case "today":
      start.setHours(now.getHours() - 24, now.getMinutes(), 0, 0);
      break;
    case "this_week":
      start.setDate(now.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      break;
    case "this_month":
      start.setDate(now.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      break;
    case "this_year":
      start.setFullYear(now.getFullYear() - 1);
      start.setHours(0, 0, 0, 0);
      break;
  }
  return Math.floor(start.getTime() / 1000);
}

export function getWatchCount(
  userId: string,
  table: "movies" | "episodes",
  period: TimePeriod,
): number {
  const timestamp = periodStartTimestamp(period);
  const watchTable = table === "movies" ? userMovieWatches : userEpisodeWatches;
  const [row] = db
    .select({ count: sql<number>`count(*)` })
    .from(watchTable)
    .where(
      and(
        eq(watchTable.userId, userId),
        sql`${watchTable.watchedAt} >= ${timestamp}`,
      ),
    )
    .all();
  return row?.count ?? 0;
}

export interface HistoryBucket {
  bucket: string;
  count: number;
}

function toLocalDateBucket(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getWatchHistory(
  userId: string,
  table: "movies" | "episodes",
  period: TimePeriod,
): HistoryBucket[] {
  const startTs = periodStartTimestamp(period);
  const watchTable = table === "movies" ? userMovieWatches : userEpisodeWatches;
  const now = new Date();

  let fmt: string;
  let buckets: string[];

  switch (period) {
    case "today":
      fmt = "%H";
      buckets = Array.from({ length: 24 }, (_, i) => {
        const d = new Date(now);
        d.setHours(now.getHours() - 23 + i);
        return d.getHours().toString().padStart(2, "0");
      });
      break;
    case "this_week": {
      fmt = "%Y-%m-%d";
      buckets = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now);
        d.setDate(now.getDate() - 6 + i);
        return toLocalDateBucket(d);
      });
      break;
    }
    case "this_month": {
      fmt = "%Y-%m-%d";
      buckets = Array.from({ length: 30 }, (_, i) => {
        const d = new Date(now);
        d.setDate(now.getDate() - 29 + i);
        return toLocalDateBucket(d);
      });
      break;
    }
    case "this_year":
      fmt = "%Y-%m";
      buckets = Array.from({ length: 12 }, (_, i) => {
        const d = new Date(now);
        d.setMonth(now.getMonth() - 11 + i);
        return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;
      });
      break;
  }

  const rows = db
    .select({
      bucket:
        sql<string>`strftime(${fmt}, ${watchTable.watchedAt}, 'unixepoch', 'localtime')`.as(
          "bucket",
        ),
      count: sql<number>`count(*)`.as("cnt"),
    })
    .from(watchTable)
    .where(
      and(
        eq(watchTable.userId, userId),
        sql`${watchTable.watchedAt} >= ${startTs}`,
      ),
    )
    .groupBy(
      sql`strftime(${fmt}, ${watchTable.watchedAt}, 'unixepoch', 'localtime')`,
    )
    .all();

  const countMap = new Map(rows.map((r) => [r.bucket, r.count]));
  return buckets.map((b) => ({ bucket: b, count: countMap.get(b) ?? 0 }));
}

export interface DashboardStats {
  moviesThisMonth: number;
  episodesThisWeek: number;
  librarySize: number;
  completed: number;
}

export function getUserStats(userId: string): DashboardStats {
  const moviesThisMonth = getWatchCount(userId, "movies", "this_month");
  const episodesThisWeek = getWatchCount(userId, "episodes", "this_week");

  const [statusCounts] = db
    .select({
      librarySize: sql<number>`count(*)`,
      completed: sql<number>`sum(case when ${userTitleStatus.status} = 'completed' then 1 else 0 end)`,
    })
    .from(userTitleStatus)
    .where(eq(userTitleStatus.userId, userId))
    .all();

  return {
    moviesThisMonth,
    episodesThisWeek,
    librarySize: statusCounts?.librarySize ?? 0,
    completed: statusCounts?.completed ?? 0,
  };
}

export interface ContinueWatchingItem {
  title: {
    id: string;
    title: string;
    posterPath: string | null;
    backdropPath: string | null;
    backdropThumbHash: string | null;
    type: string;
  };
  nextEpisode: {
    id: string;
    seasonNumber: number;
    episodeNumber: number;
    name: string | null;
    stillPath: string | null;
    stillThumbHash: string | null;
    overview: string | null;
  } | null;
  lastWatchedAt: Date | null;
  totalEpisodes: number;
  watchedEpisodes: number;
}

export function getContinueWatchingFeed(
  userId: string,
): ContinueWatchingItem[] {
  // Get in-progress TV shows
  const inProgress = db
    .select({
      titleId: userTitleStatus.titleId,
      updatedAt: userTitleStatus.updatedAt,
    })
    .from(userTitleStatus)
    .where(
      and(
        eq(userTitleStatus.userId, userId),
        eq(userTitleStatus.status, "in_progress"),
      ),
    )
    .all();

  if (inProgress.length === 0) return [];

  const titleIds = inProgress.map((r) => r.titleId);

  // Batch fetch all TV titles (1 query)
  const tvTitles = db
    .select()
    .from(titles)
    .where(and(inArray(titles.id, titleIds), eq(titles.type, "tv")))
    .all();

  if (tvTitles.length === 0) return [];

  const tvTitleIds = tvTitles.map((t) => t.id);
  const titleMap = new Map(tvTitles.map((t) => [t.id, t]));

  // Batch fetch all seasons for these titles (1 query)
  const allSeasons = db
    .select()
    .from(seasons)
    .where(inArray(seasons.titleId, tvTitleIds))
    .orderBy(seasons.titleId, seasons.seasonNumber)
    .all();

  const seasonIds = allSeasons.map((s) => s.id);

  // Batch fetch all episodes for these seasons (1 query)
  const allEpisodes =
    seasonIds.length > 0
      ? db
          .select()
          .from(episodes)
          .where(inArray(episodes.seasonId, seasonIds))
          .orderBy(episodes.seasonId, episodes.episodeNumber)
          .all()
      : [];

  // Batch fetch all watches for this user for these episodes (1 query)
  const episodeIds = allEpisodes.map((ep) => ep.id);
  const allWatches =
    episodeIds.length > 0
      ? db
          .select()
          .from(userEpisodeWatches)
          .where(
            and(
              eq(userEpisodeWatches.userId, userId),
              inArray(userEpisodeWatches.episodeId, episodeIds),
            ),
          )
          .all()
      : [];

  // Build lookup maps
  const watchedEpisodeIds = new Set(allWatches.map((w) => w.episodeId));
  const watchDateMap = new Map<string, Date>();
  for (const watch of allWatches) {
    const existing = watchDateMap.get(watch.episodeId);
    if (!existing || watch.watchedAt > existing) {
      watchDateMap.set(watch.episodeId, watch.watchedAt);
    }
  }

  // Group seasons by title
  const seasonsByTitle = new Map<string, typeof allSeasons>();
  for (const s of allSeasons) {
    const arr = seasonsByTitle.get(s.titleId) ?? [];
    arr.push(s);
    seasonsByTitle.set(s.titleId, arr);
  }

  // Group episodes by season
  const episodesBySeason = new Map<string, typeof allEpisodes>();
  for (const ep of allEpisodes) {
    const arr = episodesBySeason.get(ep.seasonId) ?? [];
    arr.push(ep);
    episodesBySeason.set(ep.seasonId, arr);
  }

  const items: ContinueWatchingItem[] = [];
  const today = new Date().toISOString().slice(0, 10);

  for (const row of inProgress) {
    const title = titleMap.get(row.titleId);
    if (!title) continue;

    const titleSeasonsArr = seasonsByTitle.get(title.id) ?? [];
    let nextEpisode: ContinueWatchingItem["nextEpisode"] = null;
    let lastWatchedAt: Date | null = null;
    let totalEpisodes = 0;
    let watchedEpisodes = 0;

    for (const s of titleSeasonsArr) {
      const eps = episodesBySeason.get(s.id) ?? [];
      totalEpisodes += eps.length;

      for (const ep of eps) {
        if (watchedEpisodeIds.has(ep.id)) {
          watchedEpisodes++;
          const watchDate = watchDateMap.get(ep.id);
          if (watchDate && (!lastWatchedAt || watchDate > lastWatchedAt)) {
            lastWatchedAt = watchDate;
          }
        } else if (!nextEpisode) {
          // Skip episodes not yet aired
          if (ep.airDate && ep.airDate > today) continue;
          nextEpisode = {
            id: ep.id,
            seasonNumber: s.seasonNumber,
            episodeNumber: ep.episodeNumber,
            name: ep.name,
            stillPath: ep.stillPath,
            stillThumbHash: ep.stillThumbHash,
            overview: ep.overview,
          };
        }
      }
    }

    if (nextEpisode) {
      items.push({
        title: {
          id: title.id,
          title: title.title,
          posterPath: title.posterPath,
          backdropPath: title.backdropPath,
          backdropThumbHash: title.backdropThumbHash,
          type: title.type,
        },
        nextEpisode,
        lastWatchedAt,
        totalEpisodes,
        watchedEpisodes,
      });
    }
  }

  // Sort by most recent watch
  items.sort((a, b) => {
    const aTime = a.lastWatchedAt?.getTime() ?? 0;
    const bTime = b.lastWatchedAt?.getTime() ?? 0;
    return bTime - aTime;
  });

  return items;
}

// biome-ignore lint/correctness/noUnusedFunctionParameters: days reserved for future date filtering
export function getNewAvailableFeed(userId: string, days = 14) {
  // Get titles the user has in any status that have availability offers
  // and recent release/air dates
  const results = db
    .select({
      titleId: titles.id,
      title: titles.title,
      type: titles.type,
      tmdbId: titles.tmdbId,
      posterPath: titles.posterPath,
      posterThumbHash: titles.posterThumbHash,
      releaseDate: titles.releaseDate,
      firstAirDate: titles.firstAirDate,
      voteAverage: titles.voteAverage,
      popularity: titles.popularity,
      userStatus: userTitleStatus.status,
    })
    .from(titles)
    .innerJoin(
      userTitleStatus,
      and(
        eq(userTitleStatus.titleId, titles.id),
        eq(userTitleStatus.userId, userId),
      ),
    )
    .where(
      sql`EXISTS (SELECT 1 FROM ${availabilityOffers} WHERE ${availabilityOffers.titleId} = ${titles.id})`,
    )
    .orderBy(desc(titles.popularity))
    .limit(20)
    .all();

  return results;
}

export function getLibraryFeed(userId: string, page = 1, limit = 20) {
  const offset = (page - 1) * limit;

  const availabilityFilter = sql`EXISTS (SELECT 1 FROM ${availabilityOffers} WHERE ${availabilityOffers.titleId} = ${titles.id})`;
  const joinCondition = and(
    eq(userTitleStatus.titleId, titles.id),
    eq(userTitleStatus.userId, userId),
  );

  const [{ count }] = db
    .select({ count: sql<number>`count(*)` })
    .from(titles)
    .innerJoin(userTitleStatus, joinCondition)
    .where(availabilityFilter)
    .all();

  const items = db
    .select({
      titleId: titles.id,
      title: titles.title,
      type: titles.type,
      tmdbId: titles.tmdbId,
      posterPath: titles.posterPath,
      posterThumbHash: titles.posterThumbHash,
      releaseDate: titles.releaseDate,
      firstAirDate: titles.firstAirDate,
      voteAverage: titles.voteAverage,
      popularity: titles.popularity,
      userStatus: userTitleStatus.status,
    })
    .from(titles)
    .innerJoin(userTitleStatus, joinCondition)
    .where(availabilityFilter)
    .orderBy(desc(titles.popularity))
    .limit(limit)
    .offset(offset)
    .all();

  const totalResults = count ?? 0;
  return {
    items,
    page,
    totalPages: Math.max(1, Math.ceil(totalResults / limit)),
    totalResults,
  };
}

export function getRecommendationsFeed(userId: string) {
  // Get recommendations from user's highly-rated or completed titles
  const userCompletedOrRated = db
    .select({ titleId: userTitleStatus.titleId })
    .from(userTitleStatus)
    .where(
      and(
        eq(userTitleStatus.userId, userId),
        eq(userTitleStatus.status, "completed"),
      ),
    )
    .all()
    .map((r) => r.titleId);

  const ratedIds = db
    .select({ titleId: userRatings.titleId })
    .from(userRatings)
    .where(
      and(eq(userRatings.userId, userId), sql`${userRatings.ratingStars} >= 4`),
    )
    .all()
    .map((r) => r.titleId);

  const sourceIds = [...new Set([...userCompletedOrRated, ...ratedIds])];
  if (sourceIds.length === 0) return [];

  // Get all tracked title IDs to exclude
  const trackedIds = new Set(
    db
      .select({ titleId: userTitleStatus.titleId })
      .from(userTitleStatus)
      .where(eq(userTitleStatus.userId, userId))
      .all()
      .map((r) => r.titleId),
  );

  // Batch fetch all recommendations for all source IDs (1 query)
  const allRecRows = db
    .select({
      recommendedTitleId: titleRecommendations.recommendedTitleId,
      rank: titleRecommendations.rank,
    })
    .from(titleRecommendations)
    .where(inArray(titleRecommendations.titleId, sourceIds))
    .all();

  const recs: Map<string, { titleId: string; score: number }> = new Map();

  for (const rec of allRecRows) {
    if (trackedIds.has(rec.recommendedTitleId)) continue;
    const existing = recs.get(rec.recommendedTitleId);
    const score = 100 - rec.rank;
    if (existing) {
      existing.score += score;
    } else {
      recs.set(rec.recommendedTitleId, {
        titleId: rec.recommendedTitleId,
        score,
      });
    }
  }

  const sorted = [...recs.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);

  if (sorted.length === 0) return [];

  // Batch fetch all recommended titles (1 query)
  const recTitleIds = sorted.map((r) => r.titleId);
  const recTitles = db
    .select()
    .from(titles)
    .where(inArray(titles.id, recTitleIds))
    .all();
  const recTitleMap = new Map(recTitles.map((t) => [t.id, t]));

  return sorted.map((r) => recTitleMap.get(r.titleId)).filter(Boolean);
}

export function getRecommendationsForTitle(titleId: string) {
  const title = db.select().from(titles).where(eq(titles.id, titleId)).get();
  if (!title) return [];

  const recs = db
    .select({
      recommendedTitleId: titleRecommendations.recommendedTitleId,
      source: titleRecommendations.source,
      rank: titleRecommendations.rank,
    })
    .from(titleRecommendations)
    .where(eq(titleRecommendations.titleId, titleId))
    .orderBy(titleRecommendations.rank)
    .all();

  if (recs.length === 0) return [];

  const sourcePriority = {
    tmdb_recommendations: 0,
    tmdb_similar: 1,
  } as const;
  const orderedRecs = [...recs].sort(
    (a, b) =>
      a.rank - b.rank || sourcePriority[a.source] - sourcePriority[b.source],
  );

  const seenRecommendedTitleIds = new Set<string>();
  const uniqueRecs = orderedRecs.filter((rec) => {
    if (seenRecommendedTitleIds.has(rec.recommendedTitleId)) {
      return false;
    }
    seenRecommendedTitleIds.add(rec.recommendedTitleId);
    return true;
  });

  // Batch fetch all recommended titles (1 query)
  const recTitleIds = uniqueRecs.map((r) => r.recommendedTitleId);
  const recTitles = db
    .select()
    .from(titles)
    .where(inArray(titles.id, recTitleIds))
    .all();
  const recTitleMap = new Map(recTitles.map((t) => [t.id, t]));

  return uniqueRecs
    .map((rec) => {
      const r = recTitleMap.get(rec.recommendedTitleId);
      if (!r) return null;
      return {
        id: r.id,
        tmdbId: r.tmdbId,
        type: r.type as "movie" | "tv",
        title: r.title,
        posterPath: tmdbImageUrl(r.posterPath, "posters"),
        posterThumbHash: r.posterThumbHash,
        releaseDate: r.releaseDate,
        firstAirDate: r.firstAirDate,
        voteAverage: r.voteAverage,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);
}
