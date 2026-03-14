import { db } from "@sofa/db/client";
import { and, inArray } from "@sofa/db/helpers";
import { titles } from "@sofa/db/schema";

type BrowseLookup = {
  tmdbId: number;
  type: "movie" | "tv";
};

export function browseLookupKey({ tmdbId, type }: BrowseLookup): string {
  return `${tmdbId}-${type}`;
}

export function getBrowsePosterThumbHashes(lookups: BrowseLookup[]) {
  if (lookups.length === 0) {
    return new Map<string, string | null>();
  }

  const tmdbIds = [...new Set(lookups.map((lookup) => lookup.tmdbId))];
  const mediaTypes = [...new Set(lookups.map((lookup) => lookup.type))];

  const rows = db
    .select({
      tmdbId: titles.tmdbId,
      type: titles.type,
      posterThumbHash: titles.posterThumbHash,
    })
    .from(titles)
    .where(
      and(inArray(titles.tmdbId, tmdbIds), inArray(titles.type, mediaTypes)),
    )
    .all();

  return new Map(
    rows.map((row) => [
      browseLookupKey({
        tmdbId: row.tmdbId,
        type: row.type as "movie" | "tv",
      }),
      row.posterThumbHash,
    ]),
  );
}
