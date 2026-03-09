import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

type TitleStatus = "watchlist" | "in_progress" | "completed";

interface TitleRowItem {
  tmdbId: number;
  type: "movie" | "tv";
  title: string;
  posterPath: string | null;
  releaseDate: string | null;
  voteAverage: number;
}

interface DiscoverResponse {
  items: TitleRowItem[];
  userStatuses: Record<string, TitleStatus>;
  episodeProgress: Record<string, { watched: number; total: number }>;
}

export function useDiscover(mediaType: "movie" | "tv", genreId: number | null) {
  const { data, isLoading } = useQuery<DiscoverResponse>({
    queryKey: ["discover", mediaType, genreId],
    queryFn: () =>
      api<DiscoverResponse>(
        `/discover?mediaType=${mediaType}&genreId=${genreId}`,
      ),
    enabled: genreId != null,
  });

  return { data, isLoading };
}
