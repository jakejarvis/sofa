import type { CastMember } from "@sofa/api/schemas";
import {
  batchUpsertPersonsTransaction,
  batchUpsertTitleCast,
  getCastForTitleJoined,
  getExistingPersonsByTmdbIds,
  getFallbackPersonsByTmdbIds,
  getPersonsForTitleCast,
} from "@sofa/db/queries/credits";
import { getTitleById } from "@sofa/db/queries/title";
import type { titleCast } from "@sofa/db/schema";
import { createLogger } from "@sofa/logger";
import { getMovieCredits, getTvAggregateCredits } from "@sofa/tmdb/client";
import { tmdbImageUrl } from "@sofa/tmdb/image";

import { cacheProfilePhotos, deleteOrphanedImage, imageCacheEnabled } from "./image-cache";
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
  const existing = getExistingPersonsByTmdbIds(tmdbIds);
  const existingMap = new Map(existing.map((p) => [p.tmdbId, p]));

  const idMap = batchUpsertPersonsTransaction(uniquePeople, existingMap);

  // Clean up orphaned profile images when paths change
  for (const p of uniquePeople) {
    const prev = existingMap.get(p.tmdbId);
    if (prev && prev.profilePath && prev.profilePath !== p.profilePath) {
      deleteOrphanedImage("profiles", prev.profilePath);
    }
  }

  // One fallback query for any concurrent inserts that conflicted
  const stillMissing = uniquePeople.filter((p) => !idMap.has(p.tmdbId)).map((p) => p.tmdbId);
  if (stillMissing.length > 0) {
    const fallbacks = getFallbackPersonsByTmdbIds(stillMissing);
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

  const personRows = getPersonsForTitleCast(titleId);

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
  const title = getTitleById(titleId);
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
      batchUpsertTitleCast(allCastRows);
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
      batchUpsertTitleCast(allCastRows);
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
  const rows = getCastForTitleJoined(titleId);

  return rows.map((r) =>
    Object.assign(r, { profilePath: tmdbImageUrl(r.profilePath, "profiles") }),
  );
}
