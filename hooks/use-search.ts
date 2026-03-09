import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { api } from "@/lib/api-client";

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
  const { data, isLoading } = useQuery<SearchResponse>({
    queryKey: ["search", trimmed],
    queryFn: () =>
      api<SearchResponse>(`/search?query=${encodeURIComponent(trimmed)}`),
    enabled: !!trimmed,
  });

  const results = useMemo(
    () => data?.results?.slice(0, 8) ?? [],
    [data?.results],
  );

  return {
    results,
    isLoading,
  };
}
