import { type NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getLocalFilmography, getOrFetchPerson } from "@/lib/services/person";
import { getUserStatusesByTitleIds } from "@/lib/services/tracking";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const person = await getOrFetchPerson(id);
  if (!person)
    return NextResponse.json({ error: "Person not found" }, { status: 404 });

  const filmography = getLocalFilmography(person.id);
  const userStatuses = getUserStatusesByTitleIds(
    session.user.id,
    filmography.map((c) => c.titleId),
  );

  return NextResponse.json({ person, filmography, userStatuses });
}
