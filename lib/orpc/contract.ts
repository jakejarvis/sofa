import { oc } from "@orpc/contract";
import { z } from "zod";
import {
  BackupCreateOutput,
  BackupScheduleOutput,
  BackupsListOutput,
  BatchWatchInput,
  ContinueWatchingOutput,
  CreateIntegrationInput,
  DashboardRecommendationsOutput,
  DashboardStatsOutput,
  DiscoverInput,
  DiscoverOutput,
  FilenameParam,
  GenresOutput,
  IdParam,
  IntegrationOutput,
  IntegrationsListOutput,
  IntegrationTokenOutput,
  LibraryOutput,
  MediaTypeParam,
  PersonDetailOutput,
  PersonResolveOutput,
  PopularOutput,
  ProviderParam,
  QuickAddOutput,
  RegistrationOutput,
  RestoreBackupInput,
  SearchInput,
  SearchOutput,
  StatsInput,
  StatsOutput,
  SystemStatusOutput,
  TitleDetailOutput,
  TitleRecommendationsOutput,
  TitleResolveOutput,
  TmdbIdTypeParam,
  ToggleRegistrationInput,
  ToggleUpdateCheckInput,
  TrendingOutput,
  TrendingTypeParam,
  TriggerJobInput,
  TriggerJobOutput,
  UpdateCheckOutput,
  UpdateNameInput,
  UpdateRatingInput,
  UpdateScheduleInput,
  UpdateStatusInput,
  UploadAvatarInput,
  UploadAvatarOutput,
  UserInfoOutput,
} from "./schemas";

export const contract = {
  titles: {
    detail: oc
      .route({ method: "GET", path: "/titles/{id}", tags: ["Titles"] })
      .input(IdParam)
      .output(TitleDetailOutput),
    resolve: oc
      .route({ method: "POST", path: "/titles/resolve", tags: ["Titles"] })
      .input(TmdbIdTypeParam)
      .output(TitleResolveOutput),
    updateStatus: oc
      .route({ method: "PUT", path: "/titles/{id}/status", tags: ["Titles"] })
      .input(UpdateStatusInput)
      .output(z.void()),
    updateRating: oc
      .route({ method: "PUT", path: "/titles/{id}/rating", tags: ["Titles"] })
      .input(UpdateRatingInput)
      .output(z.void()),
    watchMovie: oc
      .route({ method: "POST", path: "/titles/{id}/watch", tags: ["Titles"] })
      .input(IdParam)
      .output(z.void()),
    watchAll: oc
      .route({
        method: "POST",
        path: "/titles/{id}/watch-all",
        tags: ["Titles"],
      })
      .input(IdParam)
      .output(z.void()),
    userInfo: oc
      .route({
        method: "GET",
        path: "/titles/{id}/user-info",
        tags: ["Titles"],
      })
      .input(IdParam)
      .output(UserInfoOutput),
    recommendations: oc
      .route({
        method: "GET",
        path: "/titles/{id}/recommendations",
        tags: ["Titles"],
      })
      .input(IdParam)
      .output(TitleRecommendationsOutput),
  },
  episodes: {
    watch: oc
      .route({
        method: "POST",
        path: "/episodes/{id}/watch",
        tags: ["Episodes"],
      })
      .input(IdParam)
      .output(z.void()),
    unwatch: oc
      .route({
        method: "POST",
        path: "/episodes/{id}/unwatch",
        tags: ["Episodes"],
      })
      .input(IdParam)
      .output(z.void()),
    batchWatch: oc
      .route({
        method: "POST",
        path: "/episodes/batch-watch",
        tags: ["Episodes"],
      })
      .input(BatchWatchInput)
      .output(z.void()),
  },
  seasons: {
    watch: oc
      .route({
        method: "POST",
        path: "/seasons/{id}/watch",
        tags: ["Seasons"],
      })
      .input(IdParam)
      .output(z.void()),
    unwatch: oc
      .route({
        method: "POST",
        path: "/seasons/{id}/unwatch",
        tags: ["Seasons"],
      })
      .input(IdParam)
      .output(z.void()),
  },
  people: {
    detail: oc
      .route({ method: "GET", path: "/people/{id}", tags: ["People"] })
      .input(IdParam)
      .output(PersonDetailOutput),
    resolve: oc
      .route({ method: "POST", path: "/people/resolve", tags: ["People"] })
      .input(z.object({ tmdbId: z.number().int() }))
      .output(PersonResolveOutput),
  },
  dashboard: {
    stats: oc
      .route({ method: "GET", path: "/dashboard/stats", tags: ["Dashboard"] })
      .output(DashboardStatsOutput),
    continueWatching: oc
      .route({
        method: "GET",
        path: "/dashboard/continue-watching",
        tags: ["Dashboard"],
      })
      .output(ContinueWatchingOutput),
    library: oc
      .route({
        method: "GET",
        path: "/dashboard/library",
        tags: ["Dashboard"],
      })
      .output(LibraryOutput),
    recommendations: oc
      .route({
        method: "GET",
        path: "/dashboard/recommendations",
        tags: ["Dashboard"],
      })
      .output(DashboardRecommendationsOutput),
  },
  explore: {
    trending: oc
      .route({ method: "GET", path: "/explore/trending", tags: ["Explore"] })
      .input(TrendingTypeParam)
      .output(TrendingOutput),
    popular: oc
      .route({ method: "GET", path: "/explore/popular", tags: ["Explore"] })
      .input(MediaTypeParam)
      .output(PopularOutput),
    genres: oc
      .route({ method: "GET", path: "/explore/genres", tags: ["Explore"] })
      .input(MediaTypeParam)
      .output(GenresOutput),
  },
  search: oc
    .route({ method: "GET", path: "/search", tags: ["Search"] })
    .input(SearchInput)
    .output(SearchOutput),
  discover: oc
    .route({ method: "GET", path: "/discover", tags: ["Discover"] })
    .input(DiscoverInput)
    .output(DiscoverOutput),
  stats: oc
    .route({ method: "GET", path: "/stats", tags: ["Stats"] })
    .input(StatsInput)
    .output(StatsOutput),
  systemStatus: oc
    .route({ method: "GET", path: "/system-status", tags: ["System"] })
    .output(SystemStatusOutput),
  integrations: {
    list: oc
      .route({ method: "GET", path: "/integrations", tags: ["Integrations"] })
      .output(IntegrationsListOutput),
    create: oc
      .route({ method: "POST", path: "/integrations", tags: ["Integrations"] })
      .input(CreateIntegrationInput)
      .output(IntegrationOutput),
    delete: oc
      .route({
        method: "DELETE",
        path: "/integrations/{provider}",
        tags: ["Integrations"],
      })
      .input(ProviderParam)
      .output(z.void()),
    regenerateToken: oc
      .route({
        method: "POST",
        path: "/integrations/{provider}/regenerate-token",
        tags: ["Integrations"],
      })
      .input(ProviderParam)
      .output(IntegrationTokenOutput),
  },
  admin: {
    backups: {
      list: oc
        .route({ method: "GET", path: "/admin/backups", tags: ["Admin"] })
        .output(BackupsListOutput),
      create: oc
        .route({ method: "POST", path: "/admin/backups", tags: ["Admin"] })
        .input(z.void())
        .output(BackupCreateOutput),
      delete: oc
        .route({
          method: "DELETE",
          path: "/admin/backups/{filename}",
          tags: ["Admin"],
        })
        .input(FilenameParam)
        .output(z.void()),
      restore: oc
        .route({
          method: "POST",
          path: "/admin/backups/restore",
          tags: ["Admin"],
        })
        .input(RestoreBackupInput)
        .output(z.void()),
      schedule: oc
        .route({
          method: "GET",
          path: "/admin/backups/schedule",
          tags: ["Admin"],
        })
        .output(BackupScheduleOutput),
      updateSchedule: oc
        .route({
          method: "PUT",
          path: "/admin/backups/schedule",
          tags: ["Admin"],
        })
        .input(UpdateScheduleInput)
        .output(z.void()),
    },
    registration: oc
      .route({ method: "GET", path: "/admin/registration", tags: ["Admin"] })
      .output(RegistrationOutput),
    toggleRegistration: oc
      .route({ method: "PUT", path: "/admin/registration", tags: ["Admin"] })
      .input(ToggleRegistrationInput)
      .output(z.void()),
    updateCheck: oc
      .route({ method: "GET", path: "/admin/update-check", tags: ["Admin"] })
      .output(UpdateCheckOutput),
    toggleUpdateCheck: oc
      .route({ method: "PUT", path: "/admin/update-check", tags: ["Admin"] })
      .input(ToggleUpdateCheckInput)
      .output(z.void()),
    triggerJob: oc
      .route({
        method: "POST",
        path: "/admin/jobs/trigger",
        tags: ["Admin"],
      })
      .input(TriggerJobInput)
      .output(TriggerJobOutput),
  },
  account: {
    updateName: oc
      .route({ method: "PUT", path: "/account/name", tags: ["Account"] })
      .input(UpdateNameInput)
      .output(z.void()),
    uploadAvatar: oc
      .route({ method: "POST", path: "/account/avatar", tags: ["Account"] })
      .input(UploadAvatarInput)
      .output(UploadAvatarOutput),
    removeAvatar: oc
      .route({ method: "DELETE", path: "/account/avatar", tags: ["Account"] })
      .input(z.void())
      .output(z.void()),
  },
  watchlist: {
    quickAdd: oc
      .route({
        method: "POST",
        path: "/watchlist/quick-add",
        tags: ["Watchlist"],
      })
      .input(TmdbIdTypeParam)
      .output(QuickAddOutput),
  },
};
