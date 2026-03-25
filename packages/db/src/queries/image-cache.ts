import { eq } from "drizzle-orm";

import { db } from "../client";
import {
  episodes,
  persons,
  platforms,
  seasons,
  titleAvailability,
  titleCast,
  titles,
} from "../schema";

// ─── Title image paths ───────────────────────────────────────────────

export function getTitleWithPaths(titleId: string) {
  return db
    .select({
      id: titles.id,
      posterPath: titles.posterPath,
      backdropPath: titles.backdropPath,
      type: titles.type,
    })
    .from(titles)
    .where(eq(titles.id, titleId))
    .get();
}

// ─── Season posters ──────────────────────────────────────────────────

export function getSeasonPostersForTitle(titleId: string) {
  return db
    .select({ posterPath: seasons.posterPath })
    .from(seasons)
    .where(eq(seasons.titleId, titleId))
    .all();
}

// ─── Episode stills ──────────────────────────────────────────────────

export function getEpisodeStillsForTitle(titleId: string) {
  return db
    .select({ stillPath: episodes.stillPath })
    .from(episodes)
    .innerJoin(seasons, eq(episodes.seasonId, seasons.id))
    .where(eq(seasons.titleId, titleId))
    .all();
}

// ─── Availability logos ──────────────────────────────────────────────

export function getAvailabilityLogosForTitle(titleId: string) {
  return db
    .select({ logoPath: platforms.logoPath })
    .from(titleAvailability)
    .innerJoin(platforms, eq(titleAvailability.platformId, platforms.id))
    .where(eq(titleAvailability.titleId, titleId))
    .all();
}

// ─── Cast profile paths ─────────────────────────────────────────────

export function getCastProfilePathsForTitle(titleId: string) {
  return db
    .select({ profilePath: persons.profilePath })
    .from(titleCast)
    .innerJoin(persons, eq(titleCast.personId, persons.id))
    .where(eq(titleCast.titleId, titleId))
    .all();
}
