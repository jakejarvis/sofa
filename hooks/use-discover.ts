import useSWR from "swr";
import { fetcher } from "@/lib/swr/fetcher";

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
  const { data, isLoading } = useSWR<DiscoverResponse>(
    genreId != null
      ? `/api/discover?mediaType=${mediaType}&genreId=${genreId}`
      : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 2_000 },
  );

  return { data, isLoading };
}
