import type { PersonCredit, ResolvedPerson } from "@sofa/api/schemas";
import {
  batchInsertShellTitlesTransaction,
  ensureBrowsePersonsTransaction,
  getPersonById,
  getPersonByTmdbId,
  getPersonFilmographyJoined,
  insertPersonReturning,
  replaceFilmographyTransaction,
  updatePerson,
} from "@sofa/db/queries/person";
import { getExistingTitlesByTmdbIds } from "@sofa/db/queries/title";
import type { personFilmography } from "@sofa/db/schema";
import { createLogger } from "@sofa/logger";
import { getPersonCombinedCredits, getPersonDetails } from "@sofa/tmdb/client";
import { tmdbImageUrl } from "@sofa/tmdb/image";

import { generatePersonThumbHash } from "./thumbhash";

const log = createLogger("person");
const FILMOGRAPHY_STALE_MS = 30 * 24 * 60 * 60 * 1000;

async function ensureProfileThumbHash(
  person: Pick<
    typeof import("@sofa/db/schema").persons.$inferSelect,
    "id" | "profilePath" | "profileThumbHash"
  >,
) {
  if (!person.profilePath) {
    if (person.profileThumbHash) {
      await generatePersonThumbHash(person.id, null);
    }
    return null;
  }

  if (person.profileThumbHash) {
    return person.profileThumbHash;
  }

  return (await generatePersonThumbHash(person.id, person.profilePath)) ?? null;
}

export async function getOrFetchPerson(personId: string): Promise<ResolvedPerson | null> {
  const person = getPersonById(personId);
  if (!person) return null;

  // Shell record — lazily hydrate from TMDB
  if (!person.lastFetchedAt) {
    try {
      const details = await getPersonDetails(person.tmdbId);
      updatePerson(personId, {
        name: details.name || person.name,
        biography: details.biography || null,
        birthday: details.birthday,
        deathday: details.deathday,
        placeOfBirth: details.place_of_birth,
        profilePath: details.profile_path,
        knownForDepartment: details.known_for_department,
        popularity: details.popularity,
        imdbId: details.imdb_id,
        lastFetchedAt: new Date(),
      });

      const newProfilePath = details.profile_path ?? null;
      const pathChanged = newProfilePath !== person.profilePath;
      const profileThumbHash = pathChanged
        ? await ensureProfileThumbHash({
            id: personId,
            profilePath: newProfilePath,
            profileThumbHash: null,
          })
        : await ensureProfileThumbHash({
            id: personId,
            profilePath: newProfilePath,
            profileThumbHash: person.profileThumbHash,
          });

      return {
        id: person.id,
        tmdbId: person.tmdbId,
        name: details.name || person.name,
        biography: details.biography || null,
        birthday: details.birthday ?? null,
        deathday: details.deathday ?? null,
        placeOfBirth: details.place_of_birth ?? null,
        profilePath: tmdbImageUrl(details.profile_path ?? null, "profiles"),
        profileThumbHash,
        knownForDepartment: details.known_for_department ?? null,
        imdbId: details.imdb_id ?? null,
      };
    } catch (err) {
      log.error(`Failed to hydrate person ${personId}:`, err);
    }
  }

  const profileThumbHash = await ensureProfileThumbHash(person);

  return {
    id: person.id,
    tmdbId: person.tmdbId,
    name: person.name,
    biography: person.biography,
    birthday: person.birthday,
    deathday: person.deathday,
    placeOfBirth: person.placeOfBirth,
    profilePath: tmdbImageUrl(person.profilePath, "profiles"),
    profileThumbHash,
    knownForDepartment: person.knownForDepartment,
    imdbId: person.imdbId,
  };
}

export async function getOrFetchPersonByTmdbId(tmdbId: number): Promise<ResolvedPerson | null> {
  const existing = getPersonByTmdbId(tmdbId);

  if (existing) {
    return getOrFetchPerson(existing.id);
  }

  // Create from TMDB
  try {
    const details = await getPersonDetails(tmdbId);
    const row = insertPersonReturning({
      tmdbId,
      name: details.name ?? "",
      biography: details.biography || null,
      birthday: details.birthday ?? null,
      deathday: details.deathday ?? null,
      placeOfBirth: details.place_of_birth ?? null,
      profilePath: details.profile_path ?? null,
      knownForDepartment: details.known_for_department ?? null,
      popularity: details.popularity,
      imdbId: details.imdb_id ?? null,
      lastFetchedAt: new Date(),
    });

    const person = row ?? getPersonByTmdbId(tmdbId);
    if (!person) return null;

    const profileThumbHash = await ensureProfileThumbHash(person);

    return {
      id: person.id,
      tmdbId: person.tmdbId,
      name: person.name,
      biography: person.biography,
      birthday: person.birthday,
      deathday: person.deathday,
      placeOfBirth: person.placeOfBirth,
      profilePath: tmdbImageUrl(person.profilePath, "profiles"),
      profileThumbHash,
      knownForDepartment: person.knownForDepartment,
      imdbId: person.imdbId,
    };
  } catch (err) {
    log.error(`Failed to fetch person TMDB ${tmdbId}:`, err);
    return null;
  }
}

export function getLocalFilmography(personId: string): PersonCredit[] {
  const rows = getPersonFilmographyJoined(personId);

  return rows.map((r) => ({
    titleId: r.titleId,
    tmdbId: r.tmdbId,
    type: r.type as "movie" | "tv",
    title: r.title,
    posterPath: tmdbImageUrl(r.posterPath, "posters"),
    posterThumbHash: r.posterThumbHash,
    releaseDate: r.releaseDate,
    firstAirDate: r.firstAirDate,
    voteAverage: r.voteAverage,
    character: r.character,
    department: r.department,
    job: r.job,
  }));
}

async function syncPersonFilmography(
  person: Pick<typeof import("@sofa/db/schema").persons.$inferSelect, "id" | "tmdbId">,
) {
  const credits = await getPersonCombinedCredits(person.tmdbId);

  // Schema types combined credits as movie-only; TV entries also carry
  // `name` and `first_air_date` at runtime, so widen the type minimally.
  type CastEntry = (typeof credits)["cast"] extends (infer E)[] | undefined
    ? E & { name?: string; first_air_date?: string }
    : never;
  type CrewEntry = (typeof credits)["crew"] extends (infer E)[] | undefined
    ? E & { name?: string; first_air_date?: string }
    : never;

  const validCast = ((credits.cast ?? []) as CastEntry[]).filter(
    (c) => c.media_type === "movie" || c.media_type === "tv",
  );
  const validCrew = ((credits.crew ?? []) as CrewEntry[]).filter(
    (c) => c.media_type === "movie" || c.media_type === "tv",
  );

  const allEntries = [...validCast, ...validCrew];
  const tmdbIds = [...new Set(allEntries.map((c) => c.id))];

  const existingTitles = getExistingTitlesByTmdbIds(tmdbIds);
  // Key by (tmdbId, type) composite since the same tmdbId can be a movie and TV show
  const titleIdMap = new Map<string, string>(
    existingTitles.map((title) => [`${title.tmdbId}-${title.type}`, title.id]),
  );

  const newEntries = allEntries.filter(
    (entry) => !titleIdMap.has(`${entry.id}-${entry.media_type}`),
  );
  if (newEntries.length > 0) {
    const shellEntries = newEntries
      .filter(
        (entry, index, arr) =>
          arr.findIndex((e) => e.id === entry.id && e.media_type === entry.media_type) === index,
      )
      .map((entry) => ({
        tmdbId: entry.id,
        mediaType: entry.media_type as "movie" | "tv",
        title: entry.title ?? entry.name ?? "Unknown",
        overview: entry.overview,
        releaseDate: entry.release_date,
        firstAirDate: entry.first_air_date,
        posterPath: entry.poster_path,
        backdropPath: entry.backdrop_path,
        popularity: entry.popularity,
        voteAverage: entry.vote_average,
        voteCount: entry.vote_count,
      }));

    const updatedMap = batchInsertShellTitlesTransaction(shellEntries, titleIdMap);
    for (const [key, id] of updatedMap) {
      titleIdMap.set(key, id);
    }
  }

  const nextRows: (typeof personFilmography.$inferInsert)[] = [];
  let displayOrder = 0;

  for (const credit of validCast) {
    const titleId = titleIdMap.get(`${credit.id}-${credit.media_type}`);
    if (!titleId) continue;

    nextRows.push({
      personId: person.id,
      titleId,
      character: credit.character ?? null,
      department: "Acting",
      job: null,
      displayOrder,
    });
    displayOrder++;
  }

  for (const credit of validCrew) {
    const titleId = titleIdMap.get(`${credit.id}-${credit.media_type}`);
    if (!titleId) continue;

    nextRows.push({
      personId: person.id,
      titleId,
      character: null,
      department: credit.department ?? "Crew",
      job: credit.job ?? null,
      displayOrder,
    });
    displayOrder++;
  }

  const now = new Date();
  replaceFilmographyTransaction(person.id, nextRows, now);
}

export async function fetchFullFilmography(personId: string): Promise<PersonCredit[]> {
  const person = getPersonById(personId);
  if (!person) return [];

  const localFilmography = getLocalFilmography(personId);
  const isFresh =
    person.filmographyLastFetchedAt &&
    person.filmographyLastFetchedAt.getTime() > Date.now() - FILMOGRAPHY_STALE_MS;

  if (isFresh) {
    return localFilmography;
  }

  try {
    await syncPersonFilmography(person);
    return getLocalFilmography(personId);
  } catch (err) {
    if (person.filmographyLastFetchedAt) {
      log.warn(
        `Failed to refresh filmography for person ${personId}, falling back to cached DB rows:`,
        err,
      );
      return localFilmography;
    }

    throw err;
  }
}

// ─── Browse batch upsert ─────────────────────────────────────

interface BrowsePersonInput {
  tmdbId: number;
  name: string;
  profilePath: string | null;
  knownForDepartment?: string | null;
  popularity?: number | null;
}

/**
 * Ensure every person search result has a local person row.
 * Inserts shell persons (`lastFetchedAt = null`) for new tmdbIds.
 * Returns a map of tmdbId → internal UUID.
 */
export function ensureBrowsePersonsExist(items: BrowsePersonInput[]): Map<number, string> {
  return ensureBrowsePersonsTransaction(items);
}
