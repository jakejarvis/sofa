import useSWR from "swr";
import { fetcher } from "@/lib/swr/fetcher";

interface SearchResponse {
  results: {
    tmdbId: number;
    type: "movie" | "tv";
    title: string;
    posterPath: string | null;
    releaseDate: string | null;
    voteAverage: number;
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

  return {
    results: data?.results?.slice(0, 8) ?? [],
    isLoading,
  };
}
