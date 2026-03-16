import { db } from "@sofa/db/client";
import { inArray } from "@sofa/db/helpers";
import { titles } from "@sofa/db/schema";

interface BrowseTitleLookup {
  tmdbId: number;
  type: "movie" | "tv";
}

export function getBrowseTitleIds(
  lookups: BrowseTitleLookup[],
): Record<string, string> {
  if (lookups.length === 0) return {};

  const rows = db
    .select({
      id: titles.id,
      tmdbId: titles.tmdbId,
      type: titles.type,
    })
    .from(titles)
    .where(
      inArray(
        titles.tmdbId,
        lookups.map((lookup) => lookup.tmdbId),
      ),
    )
    .all();

  const idsByLookup: Record<string, string> = {};
  for (const row of rows) {
    idsByLookup[`${row.tmdbId}-${row.type}`] = row.id;
  }
  return idsByLookup;
}
