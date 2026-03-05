import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { persons } from "@/lib/db/schema";
import {
  getLocalFilmography,
  getOrFetchPerson,
  getOrFetchPersonByTmdbId,
} from "@/lib/services/person";
import { FilmographyGrid } from "./_components/filmography-grid";
import { PersonHero } from "./_components/person-hero";

const TMDB_PATTERN = /^tmdb-(\d+)$/;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  if (TMDB_PATTERN.test(id)) return { title: "Sofa" };

  const person = db.select().from(persons).where(eq(persons.id, id)).get();
  if (!person) return { title: "Not Found — Sofa" };

  return {
    title: `${person.name} — Sofa`,
    description: person.biography?.slice(0, 160),
  };
}

export default async function PersonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await getSession();

  const tmdbMatch = TMDB_PATTERN.exec(id);
  const person = tmdbMatch
    ? await getOrFetchPersonByTmdbId(Number(tmdbMatch[1]))
    : await getOrFetchPerson(id);

  if (!person) notFound();

  const filmography = getLocalFilmography(person.id);

  return (
    <div className="space-y-10">
      <PersonHero person={person} />
      <FilmographyGrid credits={filmography} />
    </div>
  );
}
