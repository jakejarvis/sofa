import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { getOrFetchPersonByTmdbId } from "@/lib/services/person";

const schema = z.object({
  tmdbId: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const person = await getOrFetchPersonByTmdbId(parsed.data.tmdbId);
  if (!person)
    return NextResponse.json({ error: "Person not found" }, { status: 404 });

  return NextResponse.json({ id: person.id });
}
