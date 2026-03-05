import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { persons, titleCast, titles } from "@/lib/db/schema";
import { createLogger } from "@/lib/logger";
import { getMovieCredits, getTvAggregateCredits } from "@/lib/tmdb/client";
import { tmdbImageUrl } from "@/lib/tmdb/image";
import type { CastMember } from "@/lib/types/title";
import { cacheProfilePhotos, imageCacheEnabled } from "./image-cache";

const log = createLogger("credits");

const NOTABLE_DEPARTMENTS = new Set([
  "Director",
  "Writer",
  "Screenplay",
  "Creator",
  "Executive Producer",
]);

function upsertPerson(
  tmdbId: number,
  name: string,
  profilePath: string | null,
  popularity?: number,
): string {
  const existing = db
    .select()
    .from(persons)
    .where(eq(persons.tmdbId, tmdbId))
    .get();
  if (existing) return existing.id;

  const row = db
    .insert(persons)
    .values({
      tmdbId,
      name,
      profilePath,
      popularity: popularity ?? null,
    })
    .onConflictDoNothing()
    .returning()
    .get();

  if (row) return row.id;

  // Race condition: another insert beat us
  const found = db
    .select()
    .from(persons)
    .where(eq(persons.tmdbId, tmdbId))
    .get();
  // biome-ignore lint/style/noNonNullAssertion: guaranteed by onConflictDoNothing + prior existence check
  return found!.id;
}

function upsertTitleCast(
  titleId: string,
  personId: string,
  character: string | null,
  department: string,
  job: string | null,
  displayOrder: number,
  episodeCount: number | null,
) {
  const now = new Date();
  db.insert(titleCast)
    .values({
      titleId,
      personId,
      character,
      department,
      job,
      displayOrder,
      episodeCount,
      lastFetchedAt: now,
    })
    .onConflictDoUpdate({
      target: [
        titleCast.titleId,
        titleCast.personId,
        titleCast.department,
        titleCast.character,
      ],
      set: {
        job,
        displayOrder,
        episodeCount,
        lastFetchedAt: now,
      },
    })
    .run();
}

export async function refreshCredits(titleId: string) {
  const title = db.select().from(titles).where(eq(titles.id, titleId)).get();
  if (!title) return;

  log.debug(`Refreshing credits for "${title.title}" (${title.type})`);

  try {
    if (title.type === "movie") {
      const credits = await getMovieCredits(title.tmdbId);

      // Top 20 cast
      const castSlice = credits.cast.slice(0, 20);
      for (let i = 0; i < castSlice.length; i++) {
        const c = castSlice[i];
        const personId = upsertPerson(
          c.id,
          c.name,
          c.profile_path,
          c.popularity,
        );
        upsertTitleCast(
          titleId,
          personId,
          c.character,
          "Acting",
          null,
          i,
          null,
        );
      }

      // Notable crew
      const seenCrew = new Set<string>();
      let crewOrder = 100;
      for (const c of credits.crew) {
        if (!NOTABLE_DEPARTMENTS.has(c.job)) continue;
        const key = `${c.id}-${c.job}`;
        if (seenCrew.has(key)) continue;
        seenCrew.add(key);

        const personId = upsertPerson(
          c.id,
          c.name,
          c.profile_path,
          c.popularity,
        );
        upsertTitleCast(
          titleId,
          personId,
          null,
          c.department,
          c.job,
          crewOrder++,
          null,
        );
      }
    } else {
      const credits = await getTvAggregateCredits(title.tmdbId);

      // Top 20 cast
      const castSlice = credits.cast.slice(0, 20);
      for (let i = 0; i < castSlice.length; i++) {
        const c = castSlice[i];
        const personId = upsertPerson(
          c.id,
          c.name,
          c.profile_path,
          c.popularity,
        );
        const character = c.roles?.[0]?.character ?? null;
        upsertTitleCast(
          titleId,
          personId,
          character,
          "Acting",
          null,
          i,
          c.total_episode_count,
        );
      }

      // Notable crew
      const seenCrew = new Set<string>();
      let crewOrder = 100;
      for (const c of credits.crew) {
        for (const j of c.jobs) {
          if (!NOTABLE_DEPARTMENTS.has(j.job)) continue;
          const key = `${c.id}-${j.job}`;
          if (seenCrew.has(key)) continue;
          seenCrew.add(key);

          const personId = upsertPerson(
            c.id,
            c.name,
            c.profile_path,
            c.popularity,
          );
          upsertTitleCast(
            titleId,
            personId,
            null,
            c.department,
            j.job,
            crewOrder++,
            j.episode_count,
          );
        }
      }
    }

    log.debug(`Credits refreshed for "${title.title}"`);

    if (imageCacheEnabled()) {
      cacheProfilePhotos(titleId).catch((err) =>
        log.debug("Profile photo caching failed:", err),
      );
    }
  } catch (err) {
    log.error(`Failed to refresh credits for title ${titleId}:`, err);
  }
}

export function getCastForTitle(titleId: string): CastMember[] {
  const rows = db
    .select({
      id: titleCast.id,
      personId: titleCast.personId,
      name: persons.name,
      character: titleCast.character,
      department: titleCast.department,
      job: titleCast.job,
      displayOrder: titleCast.displayOrder,
      episodeCount: titleCast.episodeCount,
      profilePath: persons.profilePath,
      tmdbId: persons.tmdbId,
    })
    .from(titleCast)
    .innerJoin(persons, eq(titleCast.personId, persons.id))
    .where(eq(titleCast.titleId, titleId))
    .orderBy(titleCast.displayOrder)
    .all();

  return rows.map((r) => ({
    ...r,
    profilePath: tmdbImageUrl(r.profilePath, "w185"),
  }));
}
