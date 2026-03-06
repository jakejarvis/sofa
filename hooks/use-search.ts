import { useMemo } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/swr/fetcher";

interface SearchResponse {
  results: {
    tmdbId: number;
    type: "movie" | "tv" | "person";
    title: string;
    posterPath: string | null;
    profilePath?: string | null;
    releaseDate: string | null;
    voteAverage: number;
    knownFor?: string[];
    knownForDepartment?: string;
  }[];
}

export function useSearch(debouncedQuery: string) {
  const trimmed = debouncedQuery.trim();
  const { data, isLoading } = useSWR<SearchResponse>(
    trimmed ? `/api/search?query=${encodeURIComponent(trimmed)}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 2_000,
    },
  );

  const results = useMemo(
    () => data?.results?.slice(0, 8) ?? [],
    [data?.results],
  );

  return {
    results,
    isLoading,
  };
}
