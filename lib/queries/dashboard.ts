import { useQuery } from "@tanstack/react-query";
import type { ContinueWatchingItemProps } from "@/app/(pages)/dashboard/_components/continue-watching-card";
import { api } from "@/lib/api-client";
import type { DashboardStats } from "@/lib/services/discovery";

// ----- Query key factories -----

export const dashboardKeys = {
  stats: ["dashboard-stats"] as const,
  continueWatching: ["dashboard-continue-watching"] as const,
  library: ["dashboard-library"] as const,
  recommendations: ["dashboard-recommendations"] as const,
};

// ----- Response types -----

interface ContinueWatchingResponse {
  items: ContinueWatchingItemProps[];
}

export interface LibraryItem {
  id: string;
  tmdbId: number;
  type: string;
  title: string;
  posterPath: string | null;
  releaseDate: string | null;
  voteAverage: number;
  userStatus: "watchlist" | "in_progress" | "completed";
}

interface LibraryResponse {
  items: LibraryItem[];
}

export interface RecommendationItem {
  id: string;
  tmdbId: number;
  type: string;
  title: string;
  posterPath: string | null;
  releaseDate: string | null;
  voteAverage: number;
}

interface RecommendationsResponse {
  items: RecommendationItem[];
}

// ----- Queries -----

export function useDashboardStats(initialData?: DashboardStats) {
  return useQuery<DashboardStats>({
    queryKey: dashboardKeys.stats,
    queryFn: () => api<DashboardStats>("/dashboard/stats"),
    initialData,
  });
}

export function useContinueWatching() {
  return useQuery<ContinueWatchingResponse>({
    queryKey: dashboardKeys.continueWatching,
    queryFn: () =>
      api<ContinueWatchingResponse>("/dashboard/continue-watching"),
  });
}

export function useDashboardLibrary() {
  return useQuery<LibraryResponse>({
    queryKey: dashboardKeys.library,
    queryFn: () => api<LibraryResponse>("/dashboard/library"),
  });
}

export function useDashboardRecommendations() {
  return useQuery<RecommendationsResponse>({
    queryKey: dashboardKeys.recommendations,
    queryFn: () => api<RecommendationsResponse>("/dashboard/recommendations"),
  });
}
