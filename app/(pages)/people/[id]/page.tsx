import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { persons } from "@/lib/db/schema";
import { getLocalFilmography, getOrFetchPerson } from "@/lib/services/person";
import { getUserStatusesByTitleIds } from "@/lib/services/tracking";
import { FilmographyGrid } from "./_components/filmography-grid";
import { PersonHero } from "./_components/person-hero";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const person = db.select().from(persons).where(eq(persons.id, id)).get();
  if (!person) return { title: "Not Found — Sofa" };

  return {
    title: `${person.name} — Sofa`,
    description: person.biography?.slice(0, 160),
  };
}

async function getCachedPersonData(id: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(`person-${id}`);

  const person = await getOrFetchPerson(id);
  if (!person) return null;
  const filmography = getLocalFilmography(person.id);
  return { person, filmography };
}

export default async function PersonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const data = await getCachedPersonData(id);
  if (!data) notFound();

  const { person, filmography } = data;
  const session = await getSession();
  const userStatuses = session
    ? getUserStatusesByTitleIds(
        session.user.id,
        filmography.map((c) => c.titleId),
      )
    : {};

  return (
    <div className="space-y-10">
      <PersonHero person={person} />
      <FilmographyGrid credits={filmography} userStatuses={userStatuses} />
    </div>
  );
}
