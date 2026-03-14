import { oc } from "@orpc/contract";
import { z } from "zod";
import {
  AuthConfigOutput,
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
  HydrateSeasonsInput,
  HydrateSeasonsOutput,
  IdParam,
  IntegrationOutput,
  IntegrationsListOutput,
  LibraryOutput,
  MediaTypeParam,
  PersonDetailOutput,
  PersonResolveOutput,
  PopularOutput,
  ProviderParam,
  PublicInfoOutput,
  QuickAddOutput,
  RegistrationOutput,
  RestoreBackupInput,
  SearchInput,
  SearchOutput,
  SystemHealthOutput,
  SystemStatusOutput,
  TelemetryOutput,
  TitleDetailOutput,
  TitleRecommendationsOutput,
  TitleResolveOutput,
  TmdbIdParam,
  TmdbIdTypeParam,
  ToggleRegistrationInput,
  ToggleTelemetryInput,
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
  WatchHistoryInput,
  WatchHistoryOutput,
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
      .route({
        method: "PUT",
        path: "/titles/{id}/status",
        tags: ["Titles"],
      })
      .input(UpdateStatusInput)
      .output(z.void()),
    updateRating: oc
      .route({
        method: "PUT",
        path: "/titles/{id}/rating",
        tags: ["Titles"],
      })
      .input(UpdateRatingInput)
      .output(z.void()),
    watchMovie: oc
      .route({
        method: "POST",
        path: "/titles/{id}/watch",
        tags: ["Titles"],
      })
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
    hydrateSeasons: oc
      .route({
        method: "POST",
        path: "/titles/{id}/hydrate-seasons",
        tags: ["Titles"],
      })
      .input(HydrateSeasonsInput)
      .output(HydrateSeasonsOutput),
    quickAdd: oc
      .route({
        method: "POST",
        path: "/titles/quick-add",
        tags: ["Titles"],
      })
      .input(TmdbIdTypeParam)
      .output(QuickAddOutput),
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
      .input(TmdbIdParam)
      .output(PersonResolveOutput),
  },
  dashboard: {
    stats: oc
      .route({
        method: "GET",
        path: "/dashboard/stats",
        tags: ["Dashboard"],
      })
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
    watchHistory: oc
      .route({
        method: "GET",
        path: "/dashboard/watch-history",
        tags: ["Dashboard"],
      })
      .input(WatchHistoryInput)
      .output(WatchHistoryOutput),
  },
  explore: {
    trending: oc
      .route({
        method: "GET",
        path: "/explore/trending",
        tags: ["Explore"],
      })
      .input(TrendingTypeParam)
      .output(TrendingOutput),
    popular: oc
      .route({
        method: "GET",
        path: "/explore/popular",
        tags: ["Explore"],
      })
      .input(MediaTypeParam)
      .output(PopularOutput),
    genres: oc
      .route({
        method: "GET",
        path: "/explore/genres",
        tags: ["Explore"],
      })
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
  system: {
    publicInfo: oc
      .route({
        method: "GET",
        path: "/system/public-info",
        tags: ["System"],
      })
      .output(PublicInfoOutput),
    authConfig: oc
      .route({
        method: "GET",
        path: "/system/auth-config",
        tags: ["System"],
      })
      .output(AuthConfigOutput),
    status: oc
      .route({ method: "GET", path: "/system/status", tags: ["System"] })
      .output(SystemStatusOutput),
    health: oc
      .route({ method: "GET", path: "/system/health", tags: ["System"] })
      .output(SystemHealthOutput),
  },
  integrations: {
    list: oc
      .route({
        method: "GET",
        path: "/integrations",
        tags: ["Integrations"],
      })
      .output(IntegrationsListOutput),
    create: oc
      .route({
        method: "POST",
        path: "/integrations",
        tags: ["Integrations"],
      })
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
      .output(IntegrationOutput),
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
    telemetry: oc
      .route({ method: "GET", path: "/admin/telemetry", tags: ["Admin"] })
      .output(TelemetryOutput),
    toggleTelemetry: oc
      .route({ method: "PUT", path: "/admin/telemetry", tags: ["Admin"] })
      .input(ToggleTelemetryInput)
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
      .route({
        method: "DELETE",
        path: "/account/avatar",
        tags: ["Account"],
      })
      .input(z.void())
      .output(z.void()),
  },
};
