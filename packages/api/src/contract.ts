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
  IdParam,
  IntegrationOutput,
  IntegrationsListOutput,
  LibraryOutput,
  MediaTypeParam,
  PageParam,
  PaginatedInput,
  PersonDetailOutput,
  PopularOutput,
  ProviderParam,
  PublicInfoOutput,
  PurgeImageCacheOutput,
  PurgeMetadataCacheOutput,
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
      .route({
        method: "GET",
        path: "/titles/{id}",
        tags: ["Titles"],
        summary: "Get title details",
        description:
          "Fetch full title metadata including seasons, cast, and streaming availability. Imports from TMDB on first access if not yet cached locally.",
        successDescription:
          "Full title with seasons, cast, and availability offers",
      })
      .input(IdParam)
      .output(TitleDetailOutput)
      .errors({
        NOT_FOUND: { message: "Title not found" },
      }),
    updateStatus: oc
      .route({
        method: "PUT",
        path: "/titles/{id}/status",
        tags: ["Titles"],
        summary: "Update tracking status",
        description:
          "Set the user's tracking status for a title. Use null to remove the title from the library entirely.",
      })
      .input(UpdateStatusInput)
      .output(z.void()),
    updateRating: oc
      .route({
        method: "PUT",
        path: "/titles/{id}/rating",
        tags: ["Titles"],
        summary: "Rate a title",
        description:
          "Set a 0-5 star rating for a title. Use 0 to clear the rating.",
      })
      .input(UpdateRatingInput)
      .output(z.void()),
    watchMovie: oc
      .route({
        method: "POST",
        path: "/titles/{id}/watch",
        tags: ["Titles"],
        summary: "Mark movie as watched",
        description:
          "Log a watch event for a movie. Automatically sets status to completed.",
      })
      .input(IdParam)
      .output(z.void()),
    watchAll: oc
      .route({
        method: "POST",
        path: "/titles/{id}/watch-all",
        tags: ["Titles"],
        summary: "Mark all episodes watched",
        description:
          "Mark every episode of a TV show as watched. Requires seasons to be hydrated first.",
      })
      .input(IdParam)
      .output(z.void()),
    userInfo: oc
      .route({
        method: "GET",
        path: "/titles/{id}/user-info",
        tags: ["Titles"],
        summary: "Get user's title info",
        description:
          "Fetch the current user's tracking status, rating, and watched episode IDs for a title.",
        successDescription:
          "User's status, rating, and list of watched episode IDs",
      })
      .input(IdParam)
      .output(UserInfoOutput),
    recommendations: oc
      .route({
        method: "GET",
        path: "/titles/{id}/recommendations",
        tags: ["Titles"],
        summary: "Get title recommendations",
        description:
          "Fetch similar titles based on locally cached recommendation data, along with the user's statuses for each.",
        successDescription: "Recommended titles with user statuses",
      })
      .input(IdParam)
      .output(TitleRecommendationsOutput),
    quickAdd: oc
      .route({
        method: "POST",
        path: "/titles/{id}/quick-add",
        tags: ["Titles"],
        summary: "Quick add title to library",
        description:
          "Add a title to the user's watchlist and trigger a full TMDB import if needed. If the title already exists in the user's library, returns alreadyAdded: true.",
        successDescription:
          "Title ID and whether it was already in the library",
      })
      .input(IdParam)
      .output(QuickAddOutput)
      .errors({
        NOT_FOUND: { message: "Title not found" },
      }),
  },
  episodes: {
    watch: oc
      .route({
        method: "POST",
        path: "/episodes/{id}/watch",
        tags: ["Episodes"],
        summary: "Mark episode watched",
        description: "Record a watch event for a single TV episode.",
      })
      .input(IdParam)
      .output(z.void()),
    unwatch: oc
      .route({
        method: "POST",
        path: "/episodes/{id}/unwatch",
        tags: ["Episodes"],
        summary: "Mark episode unwatched",
        description: "Remove the watch record for a single TV episode.",
      })
      .input(IdParam)
      .output(z.void()),
    batchWatch: oc
      .route({
        method: "POST",
        path: "/episodes/batch-watch",
        tags: ["Episodes"],
        summary: "Batch mark episodes watched",
        description:
          "Record watch events for multiple episodes at once. Useful for marking a range of episodes as watched.",
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
        summary: "Mark season watched",
        description:
          "Mark all episodes in a season as watched in a single operation.",
      })
      .input(IdParam)
      .output(z.void()),
    unwatch: oc
      .route({
        method: "POST",
        path: "/seasons/{id}/unwatch",
        tags: ["Seasons"],
        summary: "Mark season unwatched",
        description:
          "Remove all watch records for episodes in a season in a single operation.",
      })
      .input(IdParam)
      .output(z.void()),
  },
  people: {
    detail: oc
      .route({
        method: "GET",
        path: "/people/{id}",
        tags: ["People"],
        summary: "Get person details",
        description:
          "Fetch a person's profile and paginated filmography. Imports from TMDB on first access if not yet cached locally.",
        successDescription:
          "Person profile, paginated filmography credits, and user statuses for their titles",
      })
      .input(IdParam.merge(PaginatedInput))
      .output(PersonDetailOutput)
      .errors({
        NOT_FOUND: { message: "Person not found" },
      }),
  },
  dashboard: {
    stats: oc
      .route({
        method: "GET",
        path: "/dashboard/stats",
        tags: ["Dashboard"],
        summary: "Get dashboard statistics",
        description:
          "Fetch summary counts for the current user: movies watched this month, episodes this week, library size, and completed titles.",
        successDescription: "Aggregate watch statistics",
      })
      .output(DashboardStatsOutput),
    continueWatching: oc
      .route({
        method: "GET",
        path: "/dashboard/continue-watching",
        tags: ["Dashboard"],
        summary: "Get continue watching list",
        description:
          "Fetch TV shows the user is currently watching, with the next unwatched episode and progress for each.",
        successDescription:
          "In-progress shows with next episode and watch progress",
      })
      .output(ContinueWatchingOutput),
    library: oc
      .route({
        method: "GET",
        path: "/dashboard/library",
        tags: ["Dashboard"],
        summary: "Get user library",
        description:
          "Fetch paginated titles in the user's library with their tracking statuses.",
        successDescription: "Paginated library items with user statuses",
      })
      .input(PaginatedInput)
      .output(LibraryOutput),
    recommendations: oc
      .route({
        method: "GET",
        path: "/dashboard/recommendations",
        tags: ["Dashboard"],
        summary: "Get personalized recommendations",
        description:
          "Fetch personalized title recommendations based on the user's library and watch history.",
        successDescription: "Recommended titles",
      })
      .output(DashboardRecommendationsOutput),
    watchHistory: oc
      .route({
        method: "GET",
        path: "/dashboard/watch-history",
        tags: ["Dashboard"],
        summary: "Get watch history",
        description:
          "Fetch the user's watch counts grouped by time period. Useful for rendering activity charts.",
        successDescription: "Watch counts bucketed by time period",
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
        summary: "Get trending titles",
        description:
          "Fetch today's trending movies and/or TV shows from TMDB, including a featured hero title and the user's statuses.",
        successDescription: "Trending items, hero spotlight, and user statuses",
      })
      .input(TrendingTypeParam.merge(PageParam))
      .output(TrendingOutput)
      .errors({
        PRECONDITION_FAILED: { message: "TMDB API key is not configured" },
      }),
    popular: oc
      .route({
        method: "GET",
        path: "/explore/popular",
        tags: ["Explore"],
        summary: "Get popular titles",
        description:
          "Fetch currently popular movies or TV shows from TMDB with the user's tracking statuses.",
        successDescription: "Popular items with user statuses",
      })
      .input(MediaTypeParam.merge(PageParam))
      .output(PopularOutput)
      .errors({
        PRECONDITION_FAILED: { message: "TMDB API key is not configured" },
      }),
    genres: oc
      .route({
        method: "GET",
        path: "/explore/genres",
        tags: ["Explore"],
        summary: "List genres",
        description:
          "Fetch the list of TMDB genres for movies or TV shows. Used to populate genre filters for discovery.",
        successDescription: "Genre ID/name pairs",
      })
      .input(MediaTypeParam)
      .output(GenresOutput)
      .errors({
        PRECONDITION_FAILED: { message: "TMDB API key is not configured" },
      }),
  },
  search: oc
    .route({
      method: "GET",
      path: "/search",
      tags: ["Search"],
      summary: "Search movies, TV shows, and people",
      description:
        "Full-text search across movies, TV shows, and people via TMDB. Optionally filter by media type.",
      successDescription: "Search results with metadata",
    })
    .input(SearchInput)
    .output(SearchOutput)
    .errors({
      PRECONDITION_FAILED: { message: "TMDB API key is not configured" },
    }),
  discover: oc
    .route({
      method: "GET",
      path: "/discover",
      tags: ["Discover"],
      summary: "Discover titles by genre",
      description:
        "Browse movies or TV shows filtered by genre, sorted by popularity. Returns user statuses and episode progress.",
      successDescription: "Filtered titles with user statuses",
    })
    .input(DiscoverInput)
    .output(DiscoverOutput)
    .errors({
      PRECONDITION_FAILED: { message: "TMDB API key is not configured" },
    }),
  system: {
    publicInfo: oc
      .route({
        method: "GET",
        path: "/system/public-info",
        tags: ["System"],
        summary: "Get public instance info",
        description:
          "Fetch public information about this Sofa instance. Does not require authentication. Used by the login screen to display instance details.",
        successDescription: "Instance configuration and status",
      })
      .output(PublicInfoOutput),
    authConfig: oc
      .route({
        method: "GET",
        path: "/system/auth-config",
        tags: ["System"],
        summary: "Get authentication config",
        description:
          "Fetch the authentication configuration including OIDC availability, password login status, and registration state. Does not require authentication.",
        successDescription: "Authentication provider configuration",
      })
      .output(AuthConfigOutput),
    status: oc
      .route({
        method: "GET",
        path: "/system/status",
        tags: ["System"],
        summary: "Get system status",
        description:
          "Quick check of whether TMDB is configured. Does not require authentication.",
        successDescription: "TMDB configuration status",
      })
      .output(SystemStatusOutput),
    health: oc
      .route({
        method: "GET",
        path: "/system/health",
        tags: ["System"],
        summary: "Get system health report",
        description:
          "Comprehensive health check covering database, TMDB connectivity, cron jobs, image cache, backups, and environment. Admin only.",
        successDescription: "Full system health report",
      })
      .output(SystemHealthOutput),
  },
  integrations: {
    list: oc
      .route({
        method: "GET",
        path: "/integrations",
        tags: ["Integrations"],
        summary: "List integrations",
        description:
          "Fetch all configured media server integrations for the current user, including recent webhook/sync events for each.",
        successDescription: "Integrations with their recent events",
      })
      .output(IntegrationsListOutput),
    create: oc
      .route({
        method: "POST",
        path: "/integrations",
        tags: ["Integrations"],
        summary: "Create or update integration",
        description:
          "Create a new media server integration or update an existing one. Generates a unique webhook token for the provider.",
        successDescription: "Created or updated integration with token",
      })
      .input(CreateIntegrationInput)
      .output(IntegrationOutput),
    delete: oc
      .route({
        method: "DELETE",
        path: "/integrations/{provider}",
        tags: ["Integrations"],
        summary: "Delete integration",
        description:
          "Remove a media server integration and all its event history.",
      })
      .input(ProviderParam)
      .output(z.void()),
    regenerateToken: oc
      .route({
        method: "POST",
        path: "/integrations/{provider}/regenerate-token",
        tags: ["Integrations"],
        summary: "Regenerate webhook token",
        description:
          "Generate a new webhook token for an integration. The old token is immediately invalidated.",
        successDescription: "Integration with new token",
      })
      .input(ProviderParam)
      .output(IntegrationOutput)
      .errors({
        NOT_FOUND: { message: "Integration not found" },
      }),
  },
  admin: {
    backups: {
      list: oc
        .route({
          method: "GET",
          path: "/admin/backups",
          tags: ["Admin"],
          summary: "List backups",
          description:
            "Fetch all database backups with their sizes and creation times.",
          successDescription: "Available backups",
        })
        .output(BackupsListOutput),
      create: oc
        .route({
          method: "POST",
          path: "/admin/backups",
          tags: ["Admin"],
          summary: "Create backup",
          description:
            "Create a new manual database backup. The backup is tagged as a manual backup.",
          successDescription: "Created backup metadata",
        })
        .input(z.void())
        .output(BackupCreateOutput),
      delete: oc
        .route({
          method: "DELETE",
          path: "/admin/backups/{filename}",
          tags: ["Admin"],
          summary: "Delete backup",
          description: "Permanently delete a database backup file by filename.",
        })
        .input(FilenameParam)
        .output(z.void())
        .errors({
          NOT_FOUND: { message: "Backup not found" },
          BAD_REQUEST: { message: "Failed to delete backup" },
        }),
      restore: oc
        .route({
          method: "POST",
          path: "/admin/backups/restore",
          tags: ["Admin"],
          summary: "Restore from backup",
          description:
            "Upload a database backup file and restore it. A pre-restore backup is automatically created before overwriting the current database.",
        })
        .input(RestoreBackupInput)
        .output(z.void())
        .errors({
          BAD_REQUEST: { message: "Backup restoration failed" },
        }),
      schedule: oc
        .route({
          method: "GET",
          path: "/admin/backups/schedule",
          tags: ["Admin"],
          summary: "Get backup schedule",
          description:
            "Fetch the current automated backup schedule configuration.",
          successDescription: "Backup schedule settings",
        })
        .output(BackupScheduleOutput),
      updateSchedule: oc
        .route({
          method: "PUT",
          path: "/admin/backups/schedule",
          tags: ["Admin"],
          summary: "Update backup schedule",
          description:
            "Update the automated backup schedule. Only provided fields are changed; omitted fields keep their current values.",
        })
        .input(UpdateScheduleInput)
        .output(z.void()),
    },
    registration: oc
      .route({
        method: "GET",
        path: "/admin/registration",
        tags: ["Admin"],
        summary: "Get registration status",
        description:
          "Check whether new user registration is currently open or closed.",
        successDescription: "Registration open/closed state",
      })
      .output(RegistrationOutput),
    toggleRegistration: oc
      .route({
        method: "PUT",
        path: "/admin/registration",
        tags: ["Admin"],
        summary: "Toggle registration",
        description: "Open or close new user registration.",
      })
      .input(ToggleRegistrationInput)
      .output(z.void()),
    updateCheck: oc
      .route({
        method: "GET",
        path: "/admin/update-check",
        tags: ["Admin"],
        summary: "Get update check status",
        description:
          "Fetch whether automatic update checks are enabled, and the latest cached check result if available.",
        successDescription: "Update check configuration and latest result",
      })
      .output(UpdateCheckOutput),
    toggleUpdateCheck: oc
      .route({
        method: "PUT",
        path: "/admin/update-check",
        tags: ["Admin"],
        summary: "Toggle update checks",
        description:
          "Enable or disable automatic update checks against the public API.",
      })
      .input(ToggleUpdateCheckInput)
      .output(z.void()),
    telemetry: oc
      .route({
        method: "GET",
        path: "/admin/telemetry",
        tags: ["Admin"],
        summary: "Get telemetry status",
        description:
          "Fetch whether anonymous telemetry is enabled and when the last report was sent.",
        successDescription: "Telemetry configuration and last report time",
      })
      .output(TelemetryOutput),
    toggleTelemetry: oc
      .route({
        method: "PUT",
        path: "/admin/telemetry",
        tags: ["Admin"],
        summary: "Toggle telemetry",
        description: "Enable or disable anonymous telemetry reporting.",
      })
      .input(ToggleTelemetryInput)
      .output(z.void()),
    triggerJob: oc
      .route({
        method: "POST",
        path: "/admin/jobs/trigger",
        tags: ["Admin"],
        summary: "Trigger cron job",
        description:
          "Manually trigger a background cron job by name. The job runs asynchronously.",
      })
      .input(TriggerJobInput)
      .output(TriggerJobOutput)
      .errors({
        NOT_FOUND: { message: "Job not found" },
      }),
    purgeMetadataCache: oc
      .route({
        method: "POST",
        path: "/admin/cache/purge-metadata",
        tags: ["Admin"],
        summary: "Purge metadata cache",
        description:
          "Delete un-enriched stub titles not in any user's library and clean up orphaned person records.",
        successDescription: "Counts of deleted titles and persons",
      })
      .input(z.void())
      .output(PurgeMetadataCacheOutput),
    purgeImageCache: oc
      .route({
        method: "POST",
        path: "/admin/cache/purge-images",
        tags: ["Admin"],
        summary: "Purge image cache",
        description:
          "Delete all cached TMDB images from disk. Images will be re-downloaded on demand.",
        successDescription: "Count of deleted files and bytes freed",
      })
      .input(z.void())
      .output(PurgeImageCacheOutput),
  },
  account: {
    updateName: oc
      .route({
        method: "PUT",
        path: "/account/name",
        tags: ["Account"],
        summary: "Update display name",
        description: "Change the current user's display name.",
      })
      .input(UpdateNameInput)
      .output(z.void()),
    uploadAvatar: oc
      .route({
        method: "POST",
        path: "/account/avatar",
        tags: ["Account"],
        summary: "Upload avatar",
        description:
          "Upload a new profile avatar image. Accepts JPEG, PNG, WebP, or GIF up to 2 MB.",
        successDescription: "URL of the uploaded avatar image",
      })
      .input(UploadAvatarInput)
      .output(UploadAvatarOutput),
    removeAvatar: oc
      .route({
        method: "DELETE",
        path: "/account/avatar",
        tags: ["Account"],
        summary: "Remove avatar",
        description:
          "Delete the current user's profile avatar, reverting to the default.",
      })
      .input(z.void())
      .output(z.void()),
  },
};
