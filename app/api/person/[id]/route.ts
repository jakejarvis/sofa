import { type NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  getLocalFilmography,
  getOrFetchPerson,
  getOrFetchPersonByTmdbId,
} from "@/lib/services/person";

const TMDB_PATTERN = /^tmdb-(\d+)$/;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const tmdbMatch = TMDB_PATTERN.exec(id);
  const person = tmdbMatch
    ? await getOrFetchPersonByTmdbId(Number(tmdbMatch[1]))
    : await getOrFetchPerson(id);

  if (!person) {
    return NextResponse.json({ error: "Person not found" }, { status: 404 });
  }

  const filmography = getLocalFilmography(person.id);

  return NextResponse.json({ person, filmography });
}
