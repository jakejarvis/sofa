import type { PersonCredit, ResolvedPerson } from "@sofa/api/schemas";
import { db } from "@sofa/db/client";
import { eq, inArray } from "@sofa/db/helpers";
import { personFilmography, persons, titles } from "@sofa/db/schema";
import { createLogger } from "@sofa/logger";
import { getPersonCombinedCredits, getPersonDetails } from "@sofa/tmdb/client";
import { tmdbImageUrl } from "@sofa/tmdb/image";
import { generatePersonThumbHash } from "./thumbhash";

const log = createLogger("person");
const FILMOGRAPHY_STALE_MS = 30 * 24 * 60 * 60 * 1000;

async function ensureProfileThumbHash(
  person: Pick<
    typeof persons.$inferSelect,
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

export async function getOrFetchPerson(
  personId: string,
): Promise<ResolvedPerson | null> {
  const person = db
    .select()
    .from(persons)
    .where(eq(persons.id, personId))
    .get();
  if (!person) return null;

  // Shell record — lazily hydrate from TMDB
  if (!person.lastFetchedAt) {
    try {
      const details = await getPersonDetails(person.tmdbId);
      db.update(persons)
        .set({
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
        })
        .where(eq(persons.id, personId))
        .run();

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

export async function getOrFetchPersonByTmdbId(
  tmdbId: number,
): Promise<ResolvedPerson | null> {
  const existing = db
    .select()
    .from(persons)
    .where(eq(persons.tmdbId, tmdbId))
    .get();

  if (existing) {
    return getOrFetchPerson(existing.id);
  }

  // Create from TMDB
  try {
    const details = await getPersonDetails(tmdbId);
    const row = db
      .insert(persons)
      .values({
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
      })
      .onConflictDoNothing()
      .returning()
      .get();

    const person =
      row ?? db.select().from(persons).where(eq(persons.tmdbId, tmdbId)).get();
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
  const rows = db
    .select({
      titleId: titles.id,
      tmdbId: titles.tmdbId,
      type: titles.type,
      title: titles.title,
      posterPath: titles.posterPath,
      posterThumbHash: titles.posterThumbHash,
      releaseDate: titles.releaseDate,
      firstAirDate: titles.firstAirDate,
      voteAverage: titles.voteAverage,
      character: personFilmography.character,
      department: personFilmography.department,
      job: personFilmography.job,
    })
    .from(personFilmography)
    .innerJoin(titles, eq(personFilmography.titleId, titles.id))
    .where(eq(personFilmography.personId, personId))
    .orderBy(personFilmography.displayOrder)
    .all();

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
  person: Pick<typeof persons.$inferSelect, "id" | "tmdbId">,
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

  const existingTitles =
    tmdbIds.length > 0
      ? db
          .select({ id: titles.id, tmdbId: titles.tmdbId })
          .from(titles)
          .where(inArray(titles.tmdbId, tmdbIds))
          .all()
      : [];
  const titleIdMap = new Map<number, string>(
    existingTitles.map((title) => [title.tmdbId, title.id]),
  );

  const newEntries = allEntries.filter((entry) => !titleIdMap.has(entry.id));
  if (newEntries.length > 0) {
    const insertedTmdbIds = new Set<number>();
    db.transaction((tx) => {
      for (const entry of newEntries) {
        if (insertedTmdbIds.has(entry.id)) continue;
        insertedTmdbIds.add(entry.id);
        const row = tx
          .insert(titles)
          .values({
            tmdbId: entry.id,
            type: entry.media_type as "movie" | "tv",
            title: entry.title ?? entry.name ?? "Unknown",
            overview: entry.overview,
            releaseDate: entry.release_date,
            firstAirDate: entry.first_air_date,
            posterPath: entry.poster_path,
            backdropPath: entry.backdrop_path,
            popularity: entry.popularity,
            voteAverage: entry.vote_average,
            voteCount: entry.vote_count,
            lastFetchedAt: null,
          })
          .onConflictDoNothing()
          .returning()
          .get();
        if (row) titleIdMap.set(entry.id, row.id);
      }
    });

    const stillMissing = [...insertedTmdbIds].filter(
      (tmdbId) => !titleIdMap.has(tmdbId),
    );
    if (stillMissing.length > 0) {
      const fallbacks = db
        .select({ id: titles.id, tmdbId: titles.tmdbId })
        .from(titles)
        .where(inArray(titles.tmdbId, stillMissing))
        .all();
      for (const fallback of fallbacks) {
        titleIdMap.set(fallback.tmdbId, fallback.id);
      }
    }
  }

  const nextRows: (typeof personFilmography.$inferInsert)[] = [];
  let displayOrder = 0;

  for (const credit of validCast) {
    const titleId = titleIdMap.get(credit.id);
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
    const titleId = titleIdMap.get(credit.id);
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
  db.transaction((tx) => {
    tx.delete(personFilmography)
      .where(eq(personFilmography.personId, person.id))
      .run();

    for (const row of nextRows) {
      tx.insert(personFilmography).values(row).run();
    }

    tx.update(persons)
      .set({ filmographyLastFetchedAt: now })
      .where(eq(persons.id, person.id))
      .run();
  });
}

export async function fetchFullFilmography(
  personId: string,
): Promise<PersonCredit[]> {
  const person = db
    .select()
    .from(persons)
    .where(eq(persons.id, personId))
    .get();
  if (!person) return [];

  const localFilmography = getLocalFilmography(personId);
  const isFresh =
    person.filmographyLastFetchedAt &&
    person.filmographyLastFetchedAt.getTime() >
      Date.now() - FILMOGRAPHY_STALE_MS;

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
export function ensureBrowsePersonsExist(
  items: BrowsePersonInput[],
): Map<number, string> {
  if (items.length === 0) return new Map();

  const unique = new Map<number, BrowsePersonInput>();
  for (const item of items) {
    if (!unique.has(item.tmdbId)) unique.set(item.tmdbId, item);
  }

  const tmdbIds = [...unique.keys()];

  const existing = db
    .select({ id: persons.id, tmdbId: persons.tmdbId })
    .from(persons)
    .where(inArray(persons.tmdbId, tmdbIds))
    .all();

  const result = new Map<number, string>();
  for (const row of existing) {
    result.set(row.tmdbId, row.id);
  }

  const missing = tmdbIds.filter((id) => !result.has(id));
  if (missing.length === 0) return result;

  db.transaction((tx) => {
    for (const tmdbId of missing) {
      const item = unique.get(tmdbId);
      if (!item) continue;
      const row = tx
        .insert(persons)
        .values({
          tmdbId: item.tmdbId,
          name: item.name,
          profilePath: item.profilePath,
          knownForDepartment: item.knownForDepartment ?? null,
          popularity: item.popularity ?? null,
          lastFetchedAt: null,
        })
        .onConflictDoNothing()
        .returning({ id: persons.id })
        .get();
      if (row) {
        result.set(tmdbId, row.id);
      }
    }

    const stillMissing = missing.filter((id) => !result.has(id));
    if (stillMissing.length > 0) {
      const fallbacks = tx
        .select({ id: persons.id, tmdbId: persons.tmdbId })
        .from(persons)
        .where(inArray(persons.tmdbId, stillMissing))
        .all();
      for (const f of fallbacks) {
        result.set(f.tmdbId, f.id);
      }
    }
  });

  return result;
}
