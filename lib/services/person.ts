import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { persons, titleCast, titles } from "@/lib/db/schema";
import { createLogger } from "@/lib/logger";
import { getPersonCombinedCredits, getPersonDetails } from "@/lib/tmdb/client";
import { tmdbImageUrl } from "@/lib/tmdb/image";
import type { PersonCredit, ResolvedPerson } from "@/lib/types/title";

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
          name: details.name,
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
        name: details.name,
        biography: details.biography || null,
        birthday: details.birthday,
        deathday: details.deathday,
        placeOfBirth: details.place_of_birth,
        profilePath: tmdbImageUrl(details.profile_path, "w185"),
        knownForDepartment: details.known_for_department,
        imdbId: details.imdb_id,
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
    profilePath: tmdbImageUrl(person.profilePath, "w185"),
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
        name: details.name,
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
      profilePath: tmdbImageUrl(person.profilePath, "w185"),
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
    posterPath: tmdbImageUrl(r.posterPath, "w500"),
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

  const results: PersonCredit[] = [];

  for (const c of credits.cast) {
    const type = c.media_type;
    if (type !== "movie" && type !== "tv") continue;

    // Create shell title if not in DB
    const existing = db
      .select()
      .from(titles)
      .where(eq(titles.tmdbId, c.id))
      .get();
    let titleId: string;
    if (existing) {
      titleId = existing.id;
    } else {
      const row = db
        .insert(titles)
        .values({
          tmdbId: c.id,
          type,
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
      if (!row) {
        const found = db
          .select()
          .from(titles)
          .where(eq(titles.tmdbId, c.id))
          .get();
        if (!found) continue;
        titleId = found.id;
      } else {
        titleId = row.id;
      }
    }

    results.push({
      titleId,
      tmdbId: c.id,
      type,
      title: c.title ?? c.name ?? "Unknown",
      posterPath: tmdbImageUrl(c.poster_path, "w500"),
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
