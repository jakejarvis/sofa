import { eq } from "drizzle-orm";

import { db } from "../client";
import {
  episodes,
  seasons,
  titles,
  userEpisodeWatches,
  userMovieWatches,
  userRatings,
  userTitleStatus,
} from "../schema";

export function getUserLibrary(userId: string) {
  return db
    .select({
      tmdbId: titles.tmdbId,
      title: titles.title,
      year: titles.releaseDate,
      firstAirDate: titles.firstAirDate,
      type: titles.type,
      status: userTitleStatus.status,
      addedAt: userTitleStatus.addedAt,
    })
    .from(userTitleStatus)
    .innerJoin(titles, eq(userTitleStatus.titleId, titles.id))
    .where(eq(userTitleStatus.userId, userId))
    .all();
}

export function getUserMovieWatches(userId: string) {
  return db
    .select({
      tmdbId: titles.tmdbId,
      title: titles.title,
      year: titles.releaseDate,
      watchedAt: userMovieWatches.watchedAt,
    })
    .from(userMovieWatches)
    .innerJoin(titles, eq(userMovieWatches.titleId, titles.id))
    .where(eq(userMovieWatches.userId, userId))
    .all();
}

export function getUserEpisodeWatches(userId: string) {
  return db
    .select({
      showTmdbId: titles.tmdbId,
      showTitle: titles.title,
      showFirstAirDate: titles.firstAirDate,
      seasonNumber: seasons.seasonNumber,
      episodeNumber: episodes.episodeNumber,
      episodeName: episodes.name,
      watchedAt: userEpisodeWatches.watchedAt,
    })
    .from(userEpisodeWatches)
    .innerJoin(episodes, eq(userEpisodeWatches.episodeId, episodes.id))
    .innerJoin(seasons, eq(episodes.seasonId, seasons.id))
    .innerJoin(titles, eq(seasons.titleId, titles.id))
    .where(eq(userEpisodeWatches.userId, userId))
    .all();
}

export function getUserRatings(userId: string) {
  return db
    .select({
      tmdbId: titles.tmdbId,
      title: titles.title,
      year: titles.releaseDate,
      firstAirDate: titles.firstAirDate,
      type: titles.type,
      ratingStars: userRatings.ratingStars,
      ratedAt: userRatings.ratedAt,
    })
    .from(userRatings)
    .innerJoin(titles, eq(userRatings.titleId, titles.id))
    .where(eq(userRatings.userId, userId))
    .all();
}
