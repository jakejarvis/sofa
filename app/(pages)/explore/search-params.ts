import { createLoader, createSerializer, parseAsInteger } from "nuqs/server";

export const exploreSearchParams = {
  movieGenre: parseAsInteger,
  tvGenre: parseAsInteger,
};

export const loadExploreSearchParams = createLoader(exploreSearchParams);
export const serializeExploreParams = createSerializer(exploreSearchParams);
