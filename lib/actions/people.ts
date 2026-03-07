"use server";

import { requireSession } from "@/lib/auth/session";
import { getOrFetchPersonByTmdbId } from "@/lib/services/person";

export async function resolvePerson(tmdbId: number): Promise<string | null> {
  await requireSession();
  const person = await getOrFetchPersonByTmdbId(tmdbId);
  return person?.id ?? null;
}
