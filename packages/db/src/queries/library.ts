import { and, asc, countDistinct, desc, eq, gte, isNotNull, lte, sql } from "drizzle-orm";

import { db } from "../client";
import {
  episodes,
  genres,
  seasons,
  titleAvailability,
  titleGenres,
  titles,
  userEpisodeWatches,
  userPlatforms,
  userRatings,
  userTitleStatus,
} from "../schema";

// ─── Display status SQL ─────────────────────────────────────────────
// Derives the user-facing display status inline for filtering/output.
// Mirrors the logic in @sofa/core/display-status.ts.
// Drizzle has no CASE/WHEN builder, but subqueries built with db.select()
// can be embedded in sql`` templates for type-safe column references.

function airedEpisodeCount(titleId: typeof titles.id, today: string) {
  return db
    .select({ count: countDistinct(episodes.id) })
    .from(episodes)
    .innerJoin(seasons, eq(episodes.seasonId, seasons.id))
    .where(
      and(eq(seasons.titleId, titleId), isNotNull(episodes.airDate), lte(episodes.airDate, today)),
    );
}

function watchedEpisodeCount(
  titleId: typeof titles.id,
  userId: typeof userTitleStatus.userId,
  today: string,
) {
  return db
    .select({ count: countDistinct(userEpisodeWatches.episodeId) })
    .from(userEpisodeWatches)
    .innerJoin(episodes, eq(userEpisodeWatches.episodeId, episodes.id))
    .innerJoin(seasons, eq(episodes.seasonId, seasons.id))
    .where(
      and(
        eq(seasons.titleId, titleId),
        eq(userEpisodeWatches.userId, userId),
        isNotNull(episodes.airDate),
        lte(episodes.airDate, today),
      ),
    );
}

function displayStatusExpr() {
  const today = new Date().toISOString().slice(0, 10);
  const aired = airedEpisodeCount(titles.id, today);
  const watched = watchedEpisodeCount(titles.id, userTitleStatus.userId, today);

  // Order must match @sofa/core/display-status.ts:
  // 1. watchlist → in_watchlist (any type)
  // 2. movie → completed if stored=completed, else in_watchlist
  // 3. TV completed → completed
  // 4. TV in_progress → check episode progress
  return sql<string>`(
    CASE
      WHEN ${userTitleStatus.status} = 'watchlist' THEN 'in_watchlist'
      WHEN ${titles.type} = 'movie' THEN
        CASE WHEN ${userTitleStatus.status} = 'completed' THEN 'completed' ELSE 'in_watchlist' END
      WHEN ${userTitleStatus.status} = 'completed' THEN 'completed'
      WHEN (${aired}) > 0 AND (${aired}) = (${watched})
      THEN CASE
        WHEN ${titles.status} IN ('Returning Series', 'In Production') THEN 'caught_up'
        ELSE 'completed'
      END
      ELSE 'watching'
    END
  )`;
}

// ─── Filtered library feed ──────────────────────────────────────────

export interface LibraryFilters {
  search?: string;
  statuses?: string[];
  type?: "movie" | "tv";
  genreId?: number;
  ratingMin?: number;
  ratingMax?: number;
  yearMin?: number;
  yearMax?: number;
  contentRating?: string;
  onMyServices?: boolean;
  sortBy: string;
  sortDirection: "asc" | "desc";
  page: number;
  limit: number;
}

export function getFilteredLibrary(userId: string, filters: LibraryFilters) {
  const offset = (filters.page - 1) * filters.limit;
  // Only "in_watchlist" maps 1:1 to a stored status. The others (watching, caught_up, completed)
  // all involve derived logic from episode progress / TMDB show status, so we need the full
  // display-status SQL computation to filter them correctly.
  const needsDisplayStatus =
    filters.statuses &&
    filters.statuses.some((s) => s === "watching" || s === "caught_up" || s === "completed");

  // Build WHERE conditions
  const conditions = [eq(userTitleStatus.userId, userId)];

  if (filters.search) {
    conditions.push(sql`${titles.title} LIKE ${"%" + filters.search + "%"}`);
  }

  if (filters.type) {
    conditions.push(eq(titles.type, filters.type));
  }

  if (filters.genreId) {
    conditions.push(
      sql`EXISTS (SELECT 1 FROM ${titleGenres} WHERE ${titleGenres.titleId} = ${titles.id} AND ${titleGenres.genreId} = ${filters.genreId})`,
    );
  }

  if (filters.ratingMin != null || filters.ratingMax != null) {
    conditions.push(sql`${userRatings.ratingStars} IS NOT NULL`);
    if (filters.ratingMin != null) {
      conditions.push(gte(userRatings.ratingStars, filters.ratingMin));
    }
    if (filters.ratingMax != null) {
      conditions.push(lte(userRatings.ratingStars, filters.ratingMax));
    }
  }

  if (filters.yearMin != null || filters.yearMax != null) {
    const yearExpr = sql`CAST(strftime('%Y', COALESCE(${titles.releaseDate}, ${titles.firstAirDate})) AS INTEGER)`;
    if (filters.yearMin != null) {
      conditions.push(sql`${yearExpr} >= ${filters.yearMin}`);
    }
    if (filters.yearMax != null) {
      conditions.push(sql`${yearExpr} <= ${filters.yearMax}`);
    }
  }

  if (filters.contentRating) {
    conditions.push(eq(titles.contentRating, filters.contentRating));
  }

  if (filters.onMyServices) {
    // Check if user has platforms set; if so, filter to titles available on their services
    const userHasPlatforms =
      db
        .select({ platformId: userPlatforms.platformId })
        .from(userPlatforms)
        .where(eq(userPlatforms.userId, userId))
        .limit(1)
        .get() != null;

    if (userHasPlatforms) {
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM ${titleAvailability} ta
          JOIN ${userPlatforms} up ON ta.platformId = up.platformId
          WHERE ta.titleId = ${titles.id} AND up.userId = ${userId}
        )`,
      );
    } else {
      // Fallback: any availability
      conditions.push(
        sql`EXISTS (SELECT 1 FROM ${titleAvailability} WHERE ${titleAvailability.titleId} = ${titles.id})`,
      );
    }
  }

  // Status filtering: optimize simple cases
  if (filters.statuses && filters.statuses.length > 0 && !needsDisplayStatus) {
    // Map display statuses to stored statuses for simple cases
    const storedStatuses: string[] = [];
    for (const s of filters.statuses) {
      if (s === "in_watchlist") storedStatuses.push("watchlist");
      if (s === "completed") storedStatuses.push("completed");
    }
    if (storedStatuses.length === 1) {
      conditions.push(eq(userTitleStatus.status, storedStatuses[0] as "watchlist" | "completed"));
    } else if (storedStatuses.length > 1) {
      conditions.push(
        sql`${userTitleStatus.status} IN (${sql.join(
          storedStatuses.map((s) => sql`${s}`),
          sql`, `,
        )})`,
      );
    }
  }

  // Sort expression
  const dirFn = filters.sortDirection === "asc" ? asc : desc;
  const sortExpressions = [];

  switch (filters.sortBy) {
    case "title":
      sortExpressions.push(dirFn(titles.title));
      break;
    case "added_at":
      sortExpressions.push(dirFn(userTitleStatus.addedAt));
      break;
    case "release_date":
      sortExpressions.push(dirFn(sql`COALESCE(${titles.releaseDate}, ${titles.firstAirDate})`));
      break;
    case "popularity":
      sortExpressions.push(dirFn(titles.popularity));
      break;
    case "user_rating":
      // NULLS LAST: put unrated items at the end
      sortExpressions.push(
        asc(sql`CASE WHEN ${userRatings.ratingStars} IS NULL THEN 1 ELSE 0 END`),
      );
      sortExpressions.push(dirFn(userRatings.ratingStars));
      break;
    case "vote_average":
      sortExpressions.push(dirFn(titles.voteAverage));
      break;
    default:
      sortExpressions.push(desc(userTitleStatus.addedAt));
  }

  // Build query with display status when needed for filtering
  if (needsDisplayStatus) {
    const rows = db
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
        userRating: userRatings.ratingStars,
        displayStatus: displayStatusExpr().as("display_status"),
      })
      .from(titles)
      .innerJoin(
        userTitleStatus,
        and(eq(userTitleStatus.titleId, titles.id), eq(userTitleStatus.userId, userId)),
      )
      .leftJoin(
        userRatings,
        and(eq(userRatings.titleId, titles.id), eq(userRatings.userId, userId)),
      )
      .where(and(...conditions))
      .orderBy(...sortExpressions)
      .all();

    // Post-filter by display status
    const filtered = rows.filter((r) => filters.statuses!.includes(r.displayStatus));
    const totalResults = filtered.length;
    const paged = filtered.slice(offset, offset + filters.limit);

    return {
      items: paged.map((row) => {
        const { displayStatus, ...item } = row;
        return Object.assign(item, { displayStatus });
      }),
      page: filters.page,
      totalPages: Math.max(1, Math.ceil(totalResults / filters.limit)),
      totalResults,
    };
  }

  // Standard query (no display status computation needed)
  const rows = db
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
      userRating: userRatings.ratingStars,
      totalCount: sql<number>`count(*) over()`.as("totalCount"),
    })
    .from(titles)
    .innerJoin(
      userTitleStatus,
      and(eq(userTitleStatus.titleId, titles.id), eq(userTitleStatus.userId, userId)),
    )
    .leftJoin(userRatings, and(eq(userRatings.titleId, titles.id), eq(userRatings.userId, userId)))
    .where(and(...conditions))
    .orderBy(...sortExpressions)
    .limit(filters.limit)
    .offset(offset)
    .all();

  const totalResults = rows[0]?.totalCount ?? 0;
  const items = rows.map(({ totalCount: _, ...item }) => item);

  return {
    items,
    page: filters.page,
    totalPages: Math.max(1, Math.ceil(totalResults / filters.limit)),
    totalResults,
  };
}

// ─── Library genres ─────────────────────────────────────────────────

export function getLibraryGenres(userId: string) {
  return db
    .select({
      id: genres.id,
      name: genres.name,
    })
    .from(genres)
    .innerJoin(titleGenres, eq(titleGenres.genreId, genres.id))
    .innerJoin(
      userTitleStatus,
      and(eq(userTitleStatus.titleId, titleGenres.titleId), eq(userTitleStatus.userId, userId)),
    )
    .groupBy(genres.id, genres.name)
    .orderBy(asc(genres.name))
    .all();
}
