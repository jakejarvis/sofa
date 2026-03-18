import type { CastMember } from "@sofa/api/schemas";
import { db } from "@sofa/db/client";
import { eq, inArray, sql } from "@sofa/db/helpers";
import { persons, titleCast, titles } from "@sofa/db/schema";
import { createLogger } from "@sofa/logger";
import { getMovieCredits, getTvAggregateCredits } from "@sofa/tmdb/client";
import { tmdbImageUrl } from "@sofa/tmdb/image";

import { cacheProfilePhotos, imageCacheEnabled } from "./image-cache";
import { generatePersonThumbHash } from "./thumbhash";

const log = createLogger("credits");

const NOTABLE_DEPARTMENTS = new Set([
  "Director",
  "Writer",
  "Screenplay",
  "Creator",
  "Executive Producer",
]);

interface PersonData {
  tmdbId: number;
  name: string;
  profilePath: string | null;
  popularity?: number;
}

function batchUpsertPersons(people: PersonData[]): Map<number, string> {
  if (people.length === 0) return new Map();

  // Deduplicate by tmdbId
  const uniqueByTmdbId = new Map<number, PersonData>();
  for (const p of people) {
    if (!uniqueByTmdbId.has(p.tmdbId)) uniqueByTmdbId.set(p.tmdbId, p);
  }
  const uniquePeople = [...uniqueByTmdbId.values()];
  const tmdbIds = uniquePeople.map((p) => p.tmdbId);

  // Batch prefetch existing persons (1 query)
  const existing = db
    .select({
      id: persons.id,
      tmdbId: persons.tmdbId,
      name: persons.name,
      profilePath: persons.profilePath,
      profileThumbHash: persons.profileThumbHash,
      popularity: persons.popularity,
    })
    .from(persons)
    .where(inArray(persons.tmdbId, tmdbIds))
    .all();
  const existingMap = new Map(existing.map((p) => [p.tmdbId, p]));
  const idMap = new Map<number, string>(existing.map((p) => [p.tmdbId, p.id]));

  db.transaction((tx) => {
    for (const p of uniquePeople) {
      const existingPerson = existingMap.get(p.tmdbId);
      if (existingPerson) {
        const nextPopularity = p.popularity ?? null;
        const pathChanged = existingPerson.profilePath !== p.profilePath;
        const needsUpdate =
          existingPerson.name !== p.name ||
          pathChanged ||
          existingPerson.popularity !== nextPopularity;
        if (!needsUpdate) continue;

        tx.update(persons)
          .set({
            name: p.name,
            profilePath: p.profilePath,
            popularity: nextPopularity,
            profileThumbHash: pathChanged ? null : existingPerson.profileThumbHash,
          })
          .where(eq(persons.id, existingPerson.id))
          .run();
        continue;
      }

      const row = tx
        .insert(persons)
        .values({
          tmdbId: p.tmdbId,
          name: p.name,
          profilePath: p.profilePath,
          popularity: p.popularity ?? null,
        })
        .onConflictDoNothing()
        .returning()
        .get();
      if (row) idMap.set(p.tmdbId, row.id);
    }
  });

  // One fallback query for any concurrent inserts that conflicted
  const stillMissing = uniquePeople.filter((p) => !idMap.has(p.tmdbId)).map((p) => p.tmdbId);
  if (stillMissing.length > 0) {
    const fallbacks = db
      .select({ id: persons.id, tmdbId: persons.tmdbId })
      .from(persons)
      .where(inArray(persons.tmdbId, stillMissing))
      .all();
    for (const f of fallbacks) idMap.set(f.tmdbId, f.id);
  }

  return idMap;
}

export async function syncCastProfileThumbHashes(
  titleId: string,
  personIds?: string[],
  options?: { warmCache?: boolean },
) {
  if (options?.warmCache !== false && imageCacheEnabled()) {
    await cacheProfilePhotos(titleId);
  }

  const personRows = db
    .select({
      id: persons.id,
      profilePath: persons.profilePath,
      profileThumbHash: persons.profileThumbHash,
    })
    .from(titleCast)
    .innerJoin(persons, eq(titleCast.personId, persons.id))
    .where(eq(titleCast.titleId, titleId))
    .all();

  const allowedIds = personIds ? new Set(personIds) : null;
  const uniqueRows = new Map(personRows.map((p) => [p.id, p]));
  await Promise.all(
    [...uniqueRows.values()]
      .filter((p) => (!allowedIds || allowedIds.has(p.id)) && p.profilePath)
      .filter((p) => !p.profileThumbHash)
      .map((p) => generatePersonThumbHash(p.id, p.profilePath)),
  );
}

export async function refreshCredits(titleId: string) {
  const title = db.select().from(titles).where(eq(titles.id, titleId)).get();
  if (!title) return;

  log.debug(`Refreshing credits for "${title.title}" (${title.type})`);

  try {
    let personIds: Map<number, string>;

    if (title.type === "movie") {
      const credits = await getMovieCredits(title.tmdbId);
      const castSlice = (credits.cast ?? []).slice(0, 20);

      // Collect notable crew
      const seenCrew = new Set<string>();
      const notableCrew: typeof credits.crew = [];
      for (const c of credits.crew ?? []) {
        if (!NOTABLE_DEPARTMENTS.has(c.job ?? "")) continue;
        const key = `${c.id}-${c.job}`;
        if (seenCrew.has(key)) continue;
        seenCrew.add(key);
        notableCrew.push(c);
      }

      // Batch upsert all people at once
      const allPeople: PersonData[] = [
        ...castSlice.map((c) => ({
          tmdbId: c.id,
          name: c.name ?? "",
          profilePath: c.profile_path ?? null,
          popularity: c.popularity,
        })),
        ...notableCrew.map((c) => ({
          tmdbId: c.id,
          name: c.name ?? "",
          profilePath: c.profile_path ?? null,
          popularity: c.popularity,
        })),
      ];
      personIds = batchUpsertPersons(allPeople);

      // Collect all titleCast rows (cast + crew) and batch insert
      const now = new Date();
      const allCastRows: (typeof titleCast.$inferInsert)[] = [];
      for (let i = 0; i < castSlice.length; i++) {
        const c = castSlice[i];
        const personId = personIds.get(c.id);
        if (!personId) continue;
        allCastRows.push({
          titleId,
          personId,
          character: c.character,
          department: "Acting",
          job: null,
          displayOrder: i,
          episodeCount: null,
          lastFetchedAt: now,
        });
      }
      let crewOrder = 100;
      for (const c of notableCrew) {
        const personId = personIds.get(c.id);
        if (!personId) continue;
        allCastRows.push({
          titleId,
          personId,
          character: null,
          department: c.department,
          job: c.job,
          displayOrder: crewOrder,
          episodeCount: null,
          lastFetchedAt: now,
        });
        crewOrder++;
      }
      if (allCastRows.length > 0) {
        db.insert(titleCast)
          .values(allCastRows)
          .onConflictDoUpdate({
            target: [
              titleCast.titleId,
              titleCast.personId,
              titleCast.department,
              titleCast.character,
            ],
            set: {
              job: sql`excluded.job`,
              displayOrder: sql`excluded.displayOrder`,
              episodeCount: sql`excluded.episodeCount`,
              lastFetchedAt: sql`excluded.lastFetchedAt`,
            },
          })
          .run();
      }
    } else {
      const credits = await getTvAggregateCredits(title.tmdbId);
      const tvCast = credits.cast ?? [];
      const tvCrew = credits.crew ?? [];
      const castSlice = tvCast.slice(0, 20);

      // Collect notable crew
      const seenCrew = new Set<string>();
      const notableCrew: Array<{
        person: (typeof tvCrew)[number];
        job: string;
        episodeCount: number;
      }> = [];
      for (const c of tvCrew) {
        for (const j of c.jobs ?? []) {
          if (!NOTABLE_DEPARTMENTS.has(j.job ?? "")) continue;
          const key = `${c.id}-${j.job}`;
          if (seenCrew.has(key)) continue;
          seenCrew.add(key);
          notableCrew.push({
            person: c,
            job: j.job ?? "",
            episodeCount: j.episode_count,
          });
        }
      }

      // Batch upsert all people at once
      const allPeople: PersonData[] = [
        ...castSlice.map((c) => ({
          tmdbId: c.id,
          name: c.name ?? "",
          profilePath: c.profile_path ?? null,
          popularity: c.popularity,
        })),
        ...notableCrew.map((c) => ({
          tmdbId: c.person.id,
          name: c.person.name ?? "",
          profilePath: c.person.profile_path ?? null,
          popularity: c.person.popularity,
        })),
      ];
      personIds = batchUpsertPersons(allPeople);

      // Collect all titleCast rows (cast + crew) and batch insert
      const now = new Date();
      const allCastRows: (typeof titleCast.$inferInsert)[] = [];
      for (let i = 0; i < castSlice.length; i++) {
        const c = castSlice[i];
        const personId = personIds.get(c.id);
        if (!personId) continue;
        const character = c.roles?.[0]?.character ?? null;
        allCastRows.push({
          titleId,
          personId,
          character,
          department: "Acting",
          job: null,
          displayOrder: i,
          episodeCount: c.total_episode_count,
          lastFetchedAt: now,
        });
      }
      let crewOrder = 100;
      for (const c of notableCrew) {
        const personId = personIds.get(c.person.id);
        if (!personId) continue;
        allCastRows.push({
          titleId,
          personId,
          character: null,
          department: c.person.department ?? "",
          job: c.job,
          displayOrder: crewOrder,
          episodeCount: c.episodeCount,
          lastFetchedAt: now,
        });
        crewOrder++;
      }
      if (allCastRows.length > 0) {
        db.insert(titleCast)
          .values(allCastRows)
          .onConflictDoUpdate({
            target: [
              titleCast.titleId,
              titleCast.personId,
              titleCast.department,
              titleCast.character,
            ],
            set: {
              job: sql`excluded.job`,
              displayOrder: sql`excluded.displayOrder`,
              episodeCount: sql`excluded.episodeCount`,
              lastFetchedAt: sql`excluded.lastFetchedAt`,
            },
          })
          .run();
      }
    }

    log.debug(`Credits refreshed for "${title.title}"`);

    (async () => {
      await syncCastProfileThumbHashes(titleId, [...personIds.values()]);
    })().catch((err) => log.debug("Profile cache/thumbhash failed:", err));
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
      profileThumbHash: persons.profileThumbHash,
      tmdbId: persons.tmdbId,
    })
    .from(titleCast)
    .innerJoin(persons, eq(titleCast.personId, persons.id))
    .where(eq(titleCast.titleId, titleId))
    .orderBy(titleCast.displayOrder)
    .all();

  return rows.map((r) => ({
    ...r,
    profilePath: tmdbImageUrl(r.profilePath, "profiles"),
  }));
}
