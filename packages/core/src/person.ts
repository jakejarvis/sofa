import type { PersonCredit, ResolvedPerson } from "@sofa/api/schemas";
import { db } from "@sofa/db/client";
import { createLogger } from "@sofa/db/logger";
import { persons, titleCast, titles } from "@sofa/db/schema";
import { getPersonCombinedCredits, getPersonDetails } from "@sofa/tmdb/client";
import { tmdbImageUrl } from "@sofa/tmdb/image";
import { eq, inArray } from "drizzle-orm";

const log = createLogger("person");

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

      return {
        id: person.id,
        tmdbId: person.tmdbId,
        name: details.name || person.name,
        biography: details.biography || null,
        birthday: details.birthday ?? null,
        deathday: details.deathday ?? null,
        placeOfBirth: details.place_of_birth ?? null,
        profilePath: tmdbImageUrl(details.profile_path ?? null, "profiles"),
        knownForDepartment: details.known_for_department ?? null,
        imdbId: details.imdb_id ?? null,
      };
    } catch (err) {
      log.error(`Failed to hydrate person ${personId}:`, err);
    }
  }

  return {
    id: person.id,
    tmdbId: person.tmdbId,
    name: person.name,
    biography: person.biography,
    birthday: person.birthday,
    deathday: person.deathday,
    placeOfBirth: person.placeOfBirth,
    profilePath: tmdbImageUrl(person.profilePath, "profiles"),
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

    return {
      id: person.id,
      tmdbId: person.tmdbId,
      name: person.name,
      biography: person.biography,
      birthday: person.birthday,
      deathday: person.deathday,
      placeOfBirth: person.placeOfBirth,
      profilePath: tmdbImageUrl(person.profilePath, "profiles"),
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
      releaseDate: titles.releaseDate,
      firstAirDate: titles.firstAirDate,
      voteAverage: titles.voteAverage,
      character: titleCast.character,
      department: titleCast.department,
      job: titleCast.job,
    })
    .from(titleCast)
    .innerJoin(titles, eq(titleCast.titleId, titles.id))
    .where(eq(titleCast.personId, personId))
    .all();

  return rows.map((r) => ({
    titleId: r.titleId,
    tmdbId: r.tmdbId,
    type: r.type as "movie" | "tv",
    title: r.title,
    posterPath: tmdbImageUrl(r.posterPath, "posters"),
    releaseDate: r.releaseDate,
    firstAirDate: r.firstAirDate,
    voteAverage: r.voteAverage,
    character: r.character,
    department: r.department,
    job: r.job,
  }));
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

  const credits = await getPersonCombinedCredits(person.tmdbId);

  // Filter to valid cast entries
  // Schema types combined credits cast as movie-only; TV entries also carry
  // `name` and `first_air_date` at runtime, so widen the type minimally.
  type CastEntry = (typeof credits)["cast"] extends (infer E)[] | undefined
    ? E & { name?: string; first_air_date?: string }
    : never;
  const validCast = ((credits.cast ?? []) as CastEntry[]).filter(
    (c) => c.media_type === "movie" || c.media_type === "tv",
  );
  if (validCast.length === 0) return [];

  // Batch prefetch existing titles (1 query)
  const tmdbIds = [...new Set(validCast.map((c) => c.id))];
  const existingTitles = db
    .select({ id: titles.id, tmdbId: titles.tmdbId })
    .from(titles)
    .where(inArray(titles.tmdbId, tmdbIds))
    .all();
  const titleIdMap = new Map<number, string>(
    existingTitles.map((t) => [t.tmdbId, t.id]),
  );

  // Batch insert missing titles in a transaction
  const newCast = validCast.filter((c) => !titleIdMap.has(c.id));
  if (newCast.length > 0) {
    const insertedTmdbIds = new Set<number>();
    db.transaction((tx) => {
      for (const c of newCast) {
        if (insertedTmdbIds.has(c.id)) continue;
        insertedTmdbIds.add(c.id);
        const row = tx
          .insert(titles)
          .values({
            tmdbId: c.id,
            type: c.media_type as "movie" | "tv",
            title: c.title ?? c.name ?? "Unknown",
            overview: c.overview,
            releaseDate: c.release_date,
            firstAirDate: c.first_air_date,
            posterPath: c.poster_path,
            backdropPath: c.backdrop_path,
            popularity: c.popularity,
            voteAverage: c.vote_average,
            voteCount: c.vote_count,
            lastFetchedAt: null,
          })
          .onConflictDoNothing()
          .returning()
          .get();
        if (row) titleIdMap.set(c.id, row.id);
      }
    });

    // One fallback query for any that conflicted
    const stillMissing = [...insertedTmdbIds].filter(
      (id) => !titleIdMap.has(id),
    );
    if (stillMissing.length > 0) {
      const fallbacks = db
        .select({ id: titles.id, tmdbId: titles.tmdbId })
        .from(titles)
        .where(inArray(titles.tmdbId, stillMissing))
        .all();
      for (const f of fallbacks) titleIdMap.set(f.tmdbId, f.id);
    }
  }

  // Build results from map (0 queries)
  const results: PersonCredit[] = [];
  for (const c of validCast) {
    const tid = titleIdMap.get(c.id);
    if (!tid) continue;
    results.push({
      titleId: tid,
      tmdbId: c.id,
      type: c.media_type as "movie" | "tv",
      title: c.title ?? c.name ?? "Unknown",
      posterPath: tmdbImageUrl(c.poster_path ?? null, "posters"),
      releaseDate: c.release_date ?? null,
      firstAirDate: c.first_air_date ?? null,
      voteAverage: c.vote_average,
      character: c.character ?? null,
      department: "Acting",
      job: null,
    });
  }

  return results;
}
