import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type {
  AvailabilityOffer,
  CastMember,
  RecommendedTitle,
  ResolvedTitle,
  Season,
} from "@/lib/types";

// ----- Query key factories -----

export const titleKeys = {
  detail: (id: string) => ["title", id] as const,
  userInfo: (id: string) => ["title-user-info", id] as const,
  recommendations: (id: string) => ["title-recommendations", id] as const,
};

// ----- Response types -----

export interface TitleDetailResponse {
  title: ResolvedTitle;
  seasons: Season[];
  needsHydration: boolean;
  availability: AvailabilityOffer[];
  cast: CastMember[];
}

export interface TitleUserInfoResponse {
  status: "watchlist" | "in_progress" | "completed" | null;
  rating: number | null;
  episodeWatches: string[];
}

interface RecommendationsResponse {
  recommendations: RecommendedTitle[];
}

interface ResolveResponse {
  id: string;
}

interface QuickAddResponse {
  id: string;
  alreadyAdded: boolean;
}

// ----- Queries -----

export function useTitleDetail(id: string, initialData?: TitleDetailResponse) {
  return useQuery<TitleDetailResponse>({
    queryKey: titleKeys.detail(id),
    queryFn: () => api<TitleDetailResponse>(`/titles/${id}`),
    initialData,
  });
}

export function useTitleUserInfo(
  id: string,
  initialData?: TitleUserInfoResponse,
) {
  return useQuery<TitleUserInfoResponse>({
    queryKey: titleKeys.userInfo(id),
    queryFn: () => api<TitleUserInfoResponse>(`/titles/${id}/user-info`),
    initialData,
  });
}

export function useTitleRecommendations(id: string) {
  return useQuery<RecommendationsResponse>({
    queryKey: titleKeys.recommendations(id),
    queryFn: () =>
      api<RecommendationsResponse>(`/titles/${id}/recommendations`),
  });
}

// ----- Mutations -----

export function useResolveTitle() {
  return useMutation({
    mutationFn: (vars: { tmdbId: number; type: "movie" | "tv" }) =>
      api<ResolveResponse>("/titles/resolve", {
        method: "POST",
        body: JSON.stringify(vars),
      }),
  });
}

export function useQuickAddToWatchlist() {
  return useMutation({
    mutationFn: (vars: { tmdbId: number; type: "movie" | "tv" }) =>
      api<QuickAddResponse>("/watchlist/quick-add", {
        method: "POST",
        body: JSON.stringify(vars),
      }),
  });
}

export function useUpdateStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { titleId: string; status: "in_progress" | null }) =>
      api(`/titles/${vars.titleId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: vars.status }),
      }),
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({
        queryKey: titleKeys.userInfo(vars.titleId),
      });
    },
  });
}

export function useUpdateRating() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { titleId: string; stars: number }) =>
      api(`/titles/${vars.titleId}/rating`, {
        method: "PUT",
        body: JSON.stringify({ stars: vars.stars }),
      }),
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({
        queryKey: titleKeys.userInfo(vars.titleId),
      });
    },
  });
}

export function useWatchMovie() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (titleId: string) =>
      api(`/titles/${titleId}/watch`, { method: "POST" }),
    onSettled: (_data, _err, titleId) => {
      queryClient.invalidateQueries({
        queryKey: titleKeys.userInfo(titleId),
      });
    },
  });
}

export function useMarkAllWatched() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (titleId: string) =>
      api(`/titles/${titleId}/watch-all`, { method: "POST" }),
    onSettled: (_data, _err, titleId) => {
      queryClient.invalidateQueries({
        queryKey: titleKeys.userInfo(titleId),
      });
    },
  });
}

export function useWatchEpisode() {
  return useMutation({
    mutationFn: (episodeId: string) =>
      api(`/episodes/${episodeId}/watch`, { method: "POST" }),
  });
}

export function useUnwatchEpisode() {
  return useMutation({
    mutationFn: (episodeId: string) =>
      api(`/episodes/${episodeId}/watch`, { method: "DELETE" }),
  });
}

export function useBatchWatchEpisodes() {
  return useMutation({
    mutationFn: (episodeIds: string[]) =>
      api("/episodes/batch-watch", {
        method: "POST",
        body: JSON.stringify({ episodeIds }),
      }),
  });
}

export function useWatchSeason() {
  return useMutation({
    mutationFn: (seasonId: string) =>
      api(`/seasons/${seasonId}/watch`, { method: "POST" }),
  });
}

export function useUnwatchSeason() {
  return useMutation({
    mutationFn: (seasonId: string) =>
      api(`/seasons/${seasonId}/watch`, { method: "DELETE" }),
  });
}
