import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

// ----- Query key factories -----

export const exploreKeys = {
  trending: (type: string, window: string) =>
    ["explore-trending", type, window] as const,
  popular: (type: string) => ["explore-popular", type] as const,
  genres: (type: string) => ["explore-genres", type] as const,
};

// ----- Response types -----

export interface ExploreItem {
  tmdbId: number;
  type: "movie" | "tv";
  title: string;
  posterPath: string | null;
  releaseDate: string | null;
  voteAverage: number;
}

export interface ExploreHero {
  tmdbId: number;
  type: "movie" | "tv";
  title: string;
  overview: string;
  backdropPath: string | null;
  voteAverage: number;
}

export interface TrendingResponse {
  items: ExploreItem[];
  hero: ExploreHero | null;
  userStatuses: Record<string, "watchlist" | "in_progress" | "completed">;
  episodeProgress: Record<string, { watched: number; total: number }>;
}

export interface PopularResponse {
  items: ExploreItem[];
  userStatuses: Record<string, "watchlist" | "in_progress" | "completed">;
  episodeProgress: Record<string, { watched: number; total: number }>;
}

export interface Genre {
  id: number;
  name: string;
}

interface GenresResponse {
  genres: Genre[];
}

// ----- Queries -----

export function useTrending(
  type: "all" | "movie" | "tv" = "all",
  window: "day" | "week" = "day",
) {
  return useQuery<TrendingResponse>({
    queryKey: exploreKeys.trending(type, window),
    queryFn: () =>
      api<TrendingResponse>(`/explore/trending?type=${type}&window=${window}`),
  });
}

export function usePopular(type: "movie" | "tv") {
  return useQuery<PopularResponse>({
    queryKey: exploreKeys.popular(type),
    queryFn: () => api<PopularResponse>(`/explore/popular?type=${type}`),
  });
}

export function useGenres(type: "movie" | "tv") {
  return useQuery<GenresResponse>({
    queryKey: exploreKeys.genres(type),
    queryFn: () => api<GenresResponse>(`/explore/genres?type=${type}`),
  });
}
