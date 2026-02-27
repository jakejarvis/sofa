import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  availabilityOffers,
  episodes,
  seasons,
  titleRecommendations,
  titles,
  userEpisodeWatches,
  userRatings,
  userTitleStatus,
} from "@/lib/db/schema";

export interface ContinueWatchingItem {
  title: {
    id: string;
    title: string;
    posterPath: string | null;
    type: string;
  };
  nextEpisode: {
    id: string;
    seasonNumber: number;
    episodeNumber: number;
    name: string | null;
  } | null;
  lastWatchedAt: Date | null;
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

  const items: ContinueWatchingItem[] = [];
  const today = new Date().toISOString().slice(0, 10);

  for (const row of inProgress) {
    const title = db
      .select()
      .from(titles)
      .where(and(eq(titles.id, row.titleId), eq(titles.type, "tv")))
      .get();
    if (!title) continue;

    // Get all seasons for this title, ordered
    const titleSeasons = db
      .select()
      .from(seasons)
      .where(eq(seasons.titleId, title.id))
      .orderBy(seasons.seasonNumber)
      .all();

    // Find first unwatched episode
    let nextEpisode: ContinueWatchingItem["nextEpisode"] = null;
    let lastWatchedAt: Date | null = null;

    // Get most recent watch for this show
    for (const s of titleSeasons) {
      const eps = db
        .select()
        .from(episodes)
        .where(eq(episodes.seasonId, s.id))
        .orderBy(episodes.episodeNumber)
        .all();

      for (const ep of eps) {
        const watch = db
          .select()
          .from(userEpisodeWatches)
          .where(
            and(
              eq(userEpisodeWatches.userId, userId),
              eq(userEpisodeWatches.episodeId, ep.id),
            ),
          )
          .get();

        if (watch) {
          if (!lastWatchedAt || watch.watchedAt > lastWatchedAt) {
            lastWatchedAt = watch.watchedAt;
          }
        } else if (!nextEpisode) {
          // Skip episodes not yet aired
          if (ep.airDate && ep.airDate > today) continue;
          nextEpisode = {
            id: ep.id,
            seasonNumber: s.seasonNumber,
            episodeNumber: ep.episodeNumber,
            name: ep.name,
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
          type: title.type,
        },
        nextEpisode,
        lastWatchedAt,
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
      posterPath: titles.posterPath,
      releaseDate: titles.releaseDate,
      firstAirDate: titles.firstAirDate,
      popularity: titles.popularity,
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

  const recs: Map<string, { titleId: string; score: number }> = new Map();

  for (const sourceId of sourceIds) {
    const recRows = db
      .select({
        recommendedTitleId: titleRecommendations.recommendedTitleId,
        rank: titleRecommendations.rank,
      })
      .from(titleRecommendations)
      .where(eq(titleRecommendations.titleId, sourceId))
      .all();

    for (const rec of recRows) {
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
  }

  const sorted = [...recs.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);

  return sorted
    .map((r) => {
      const title = db
        .select()
        .from(titles)
        .where(eq(titles.id, r.titleId))
        .get();
      return title;
    })
    .filter(Boolean);
}
