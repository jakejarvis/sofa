import { eventIterator, oc } from "@orpc/contract";
import { z } from "zod";

import { AppErrorCode, appErrorData } from "./errors";
import {
  AdminSettingsOutput,
  AdminSettingsUpdateInput,
  BackupCreateOutput,
  BackupScheduleOutput,
  BackupsListOutput,
  ContinueWatchingOutput,
  CreateImportJobInput,
  CreateIntegrationInput,
  DiscoverInput,
  DiscoverOutput,
  DiscoverRecommendationsOutput,
  FilenameParam,
  GenresOutput,
  IdParam,
  ImportJobEvent,
  ImportJobSchema,
  ImportPreviewSchema,
  IntegrationOutput,
  IntegrationsListOutput,
  LibraryGenresOutput,
  LibraryListInput,
  LibraryListOutput,
  LibraryStatsOutput,
  MediaTypeParam,
  PageParam,
  PaginatedInput,
  ParseFileInput,
  ParsePayloadInput,
  PersonDetailOutput,
  PlatformsListOutput,
  PopularOutput,
  ProviderParam,
  PublicInfoOutput,
  PurgeImageCacheOutput,
  PurgeMetadataCacheOutput,
  RestoreBackupInput,
  SearchInput,
  SearchOutput,
  SystemHealthOutput,
  SystemStatusOutput,
  TitleDetailOutput,
  TitleRecommendationsOutput,
  TrendingOutput,
  TrendingTypeParam,
  TriggerJobInput,
  TriggerJobOutput,
  UnwatchInput,
  UpdateNameInput,
  UpdateRatingInput,
  UpdateScheduleInput,
  UpdateStatusInput,
  UpdateUserPlatformsInput,
  UpcomingInput,
  UpcomingOutput,
  UploadAvatarInput,
  UploadAvatarOutput,
  UserInfoOutput,
  UserPlatformsOutput,
  WatchHistoryInput,
  WatchHistoryOutput,
  WatchInput,
} from "./schemas";

const tmdbNotConfiguredError = {
  PRECONDITION_FAILED: {
    message: "TMDB API key is not configured",
    data: appErrorData(AppErrorCode.TMDB_NOT_CONFIGURED),
  },
} as const;

export const contract = {
  // ─── Titles ─────────────────────────────────────────────────
  titles: {
    get: oc
      .route({
        method: "GET",
        path: "/titles/{id}",
        tags: ["Titles"],
        summary: "Get title details",
        description:
          "Fetch full title metadata including seasons, cast, and streaming availability. Imports from TMDB on first access if not yet cached locally.",
        successDescription: "Full title with seasons, cast, and availability offers",
      })
      .input(IdParam)
      .output(TitleDetailOutput)
      .errors({
        NOT_FOUND: {
          message: "Title not found",
          data: appErrorData(AppErrorCode.TITLE_NOT_FOUND),
        },
      }),
    similar: oc
      .route({
        method: "GET",
        path: "/titles/{id}/similar",
        tags: ["Titles"],
        summary: "Get similar titles",
        description:
          "Fetch similar titles based on locally cached recommendation data, along with the user's statuses for each.",
        successDescription: "Similar titles with user statuses",
      })
      .input(IdParam)
      .output(TitleRecommendationsOutput),
  },

  // ─── Tracking ───────────────────────────────────────────────
  tracking: {
    watch: oc
      .route({
        method: "POST",
        path: "/tracking/watch",
        tags: ["Tracking"],
        summary: "Mark items as watched",
        description:
          "Mark one or more items as watched. Use scope to indicate what the IDs refer to: movie (title IDs), episode (episode IDs), season (season IDs), or series (title IDs to mark all episodes).",
      })
      .input(WatchInput)
      .output(z.void()),
    unwatch: oc
      .route({
        method: "POST",
        path: "/tracking/unwatch",
        tags: ["Tracking"],
        summary: "Remove watch records",
        description:
          "Remove watch records for one or more items. Use scope to indicate what the IDs refer to: movie, episode, season, or series.",
      })
      .input(UnwatchInput)
      .output(z.void()),
    updateStatus: oc
      .route({
        method: "PUT",
        path: "/tracking/titles/{id}/status",
        tags: ["Tracking"],
        summary: "Update tracking status",
        description:
          "Set the user's tracking status for a title. Use null to remove the title from the library entirely.",
      })
      .input(UpdateStatusInput)
      .output(z.void()),
    rate: oc
      .route({
        method: "PUT",
        path: "/tracking/titles/{id}/rating",
        tags: ["Tracking"],
        summary: "Rate a title",
        description: "Set a 0-5 star rating for a title. Use 0 to clear the rating.",
      })
      .input(UpdateRatingInput)
      .output(z.void()),
    userInfo: oc
      .route({
        method: "GET",
        path: "/tracking/titles/{id}",
        tags: ["Tracking"],
        summary: "Get user's tracking info for a title",
        description:
          "Fetch the current user's tracking status, rating, and watched episode IDs for a title.",
        successDescription: "User's status, rating, and list of watched episode IDs",
      })
      .input(IdParam)
      .output(UserInfoOutput),
    stats: oc
      .route({
        method: "GET",
        path: "/tracking/stats",
        tags: ["Tracking"],
        summary: "Get watch statistics",
        description:
          "Fetch the user's watch counts grouped by time period. Useful for rendering activity charts and dashboard counters.",
        successDescription: "Watch counts bucketed by time period",
      })
      .input(WatchHistoryInput)
      .output(WatchHistoryOutput),
  },

  // ─── Library ────────────────────────────────────────────────
  library: {
    list: oc
      .route({
        method: "GET",
        path: "/library",
        tags: ["Library"],
        summary: "List library with filters",
        description:
          "Fetch paginated, filtered, and sorted titles from the user's library. Supports filtering by status, type, genre, rating, year, content rating, and streaming availability.",
        successDescription: "Filtered library items with user statuses and ratings",
      })
      .input(LibraryListInput)
      .output(LibraryListOutput),
    genres: oc
      .route({
        method: "GET",
        path: "/library/genres",
        tags: ["Library"],
        summary: "List genres in user's library",
        description:
          "Get the distinct genres present in the user's library, ordered alphabetically. Used to populate the genre filter dropdown.",
        successDescription: "Genres present in the library",
      })
      .output(LibraryGenresOutput),
    stats: oc
      .route({
        method: "GET",
        path: "/library/stats",
        tags: ["Library"],
        summary: "Get library statistics",
        description: "Fetch aggregate library counts: total titles and completed titles.",
        successDescription: "Library size and completed count",
      })
      .output(LibraryStatsOutput),
    continueWatching: oc
      .route({
        method: "GET",
        path: "/library/continue-watching",
        tags: ["Library"],
        summary: "Get continue watching list",
        description:
          "Fetch TV shows the user is currently watching, with the next unwatched episode and progress for each.",
        successDescription: "In-progress shows with next episode and watch progress",
      })
      .output(ContinueWatchingOutput),
    upcoming: oc
      .route({
        method: "GET",
        path: "/library/upcoming",
        tags: ["Library"],
        summary: "Get upcoming episodes and movies",
        description:
          "Fetch upcoming episodes and movie releases for titles in the user's library, sorted by date. Supports cursor-based pagination.",
        successDescription: "Upcoming items sorted by date with streaming info",
      })
      .input(UpcomingInput)
      .output(UpcomingOutput),
  },

  // ─── Discover ───────────────────────────────────────────────
  discover: {
    trending: oc
      .route({
        method: "GET",
        path: "/discover/trending",
        tags: ["Discover"],
        summary: "Get trending titles",
        description:
          "Fetch today's trending movies and/or TV shows from TMDB, including a featured hero title and the user's statuses.",
        successDescription: "Trending items, hero spotlight, and user statuses",
      })
      .input(TrendingTypeParam.merge(PageParam))
      .output(TrendingOutput)
      .errors(tmdbNotConfiguredError),
    popular: oc
      .route({
        method: "GET",
        path: "/discover/popular",
        tags: ["Discover"],
        summary: "Get popular titles",
        description:
          "Fetch currently popular movies or TV shows from TMDB with the user's tracking statuses.",
        successDescription: "Popular items with user statuses",
      })
      .input(MediaTypeParam.merge(PageParam))
      .output(PopularOutput)
      .errors(tmdbNotConfiguredError),
    search: oc
      .route({
        method: "GET",
        path: "/discover/search",
        tags: ["Discover"],
        summary: "Search movies, TV shows, and people",
        description:
          "Full-text search across movies, TV shows, and people via TMDB. Optionally filter by media type.",
        successDescription: "Search results with metadata",
      })
      .input(SearchInput)
      .output(SearchOutput)
      .errors(tmdbNotConfiguredError),
    browse: oc
      .route({
        method: "GET",
        path: "/discover/browse",
        tags: ["Discover"],
        summary: "Browse titles with filters",
        description:
          "Browse movies or TV shows filtered by genre, sorted by popularity. Returns user statuses and episode progress.",
        successDescription: "Filtered titles with user statuses",
      })
      .input(DiscoverInput)
      .output(DiscoverOutput)
      .errors(tmdbNotConfiguredError),
    genres: oc
      .route({
        method: "GET",
        path: "/discover/genres",
        tags: ["Discover"],
        summary: "List genres",
        description:
          "Fetch the list of TMDB genres for movies or TV shows. Used to populate genre filters for discovery.",
        successDescription: "Genre ID/name pairs",
      })
      .input(MediaTypeParam)
      .output(GenresOutput)
      .errors(tmdbNotConfiguredError),
    platforms: oc
      .route({
        method: "GET",
        path: "/discover/platforms",
        tags: ["Discover"],
        summary: "List available streaming platforms",
        description:
          "Fetch all available streaming platforms, ordered by popularity. Includes subscription status for filtering.",
        successDescription: "Platform list with logos and metadata",
      })
      .output(PlatformsListOutput),
    recommendations: oc
      .route({
        method: "GET",
        path: "/discover/recommendations",
        tags: ["Discover"],
        summary: "Get personalized recommendations",
        description:
          "Fetch personalized title recommendations based on the user's library and watch history.",
        successDescription: "Recommended titles",
      })
      .output(DiscoverRecommendationsOutput),
  },

  // ─── People ─────────────────────────────────────────────────
  people: {
    get: oc
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
        NOT_FOUND: {
          message: "Person not found",
          data: appErrorData(AppErrorCode.PERSON_NOT_FOUND),
        },
      }),
  },

  // ─── Account ────────────────────────────────────────────────
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
        description: "Delete the current user's profile avatar, reverting to the default.",
      })
      .input(z.void())
      .output(z.void()),
    platforms: oc
      .route({
        method: "GET",
        path: "/account/platforms",
        tags: ["Account"],
        summary: "Get user's streaming platforms",
        description: "Fetch the current user's subscribed streaming platform IDs.",
        successDescription: "List of platform IDs",
      })
      .output(UserPlatformsOutput),
    updatePlatforms: oc
      .route({
        method: "PUT",
        path: "/account/platforms",
        tags: ["Account"],
        summary: "Update streaming platforms",
        description: "Set the current user's subscribed streaming platforms.",
      })
      .input(UpdateUserPlatformsInput)
      .output(z.void()),
    integrations: {
      list: oc
        .route({
          method: "GET",
          path: "/account/integrations",
          tags: ["Account"],
          summary: "List integrations",
          description:
            "Fetch all configured media server integrations for the current user, including recent webhook/sync events for each.",
          successDescription: "Integrations with their recent events",
        })
        .output(IntegrationsListOutput),
      create: oc
        .route({
          method: "POST",
          path: "/account/integrations",
          tags: ["Account"],
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
          path: "/account/integrations/{provider}",
          tags: ["Account"],
          summary: "Delete integration",
          description: "Remove a media server integration and all its event history.",
        })
        .input(ProviderParam)
        .output(z.void()),
      regenerateToken: oc
        .route({
          method: "POST",
          path: "/account/integrations/{provider}/regenerate-token",
          tags: ["Account"],
          summary: "Regenerate webhook token",
          description:
            "Generate a new webhook token for an integration. The old token is immediately invalidated.",
          successDescription: "Integration with new token",
        })
        .input(ProviderParam)
        .output(IntegrationOutput)
        .errors({
          NOT_FOUND: {
            message: "Integration not found",
            data: appErrorData(AppErrorCode.INTEGRATION_NOT_FOUND),
          },
        }),
    },
  },

  // ─── System ─────────────────────────────────────────────────
  system: {
    publicInfo: oc
      .route({
        method: "GET",
        path: "/system/public-info",
        tags: ["System"],
        summary: "Get public instance info",
        description:
          "Fetch public information about this Sofa instance including authentication configuration. Does not require authentication.",
        successDescription: "Instance configuration, auth settings, and status",
      })
      .output(PublicInfoOutput),
    status: oc
      .route({
        method: "GET",
        path: "/system/status",
        tags: ["System"],
        summary: "Get internal system config",
        description:
          "Returns internal configuration such as the public API URL. Requires authentication.",
        successDescription: "Internal system configuration",
      })
      .output(SystemStatusOutput),
  },

  // ─── Admin ──────────────────────────────────────────────────
  admin: {
    settings: {
      get: oc
        .route({
          method: "GET",
          path: "/admin/settings",
          tags: ["Admin"],
          summary: "Get admin settings",
          description:
            "Fetch all admin-configurable settings: registration, update checks, and telemetry.",
          successDescription: "Current admin settings",
        })
        .output(AdminSettingsOutput),
      update: oc
        .route({
          method: "PATCH",
          path: "/admin/settings",
          tags: ["Admin"],
          summary: "Update admin settings",
          description:
            "Partially update admin settings. Only provided sections are changed; omitted sections keep their current values.",
        })
        .input(AdminSettingsUpdateInput)
        .output(z.void()),
    },
    backups: {
      list: oc
        .route({
          method: "GET",
          path: "/admin/backups",
          tags: ["Admin"],
          summary: "List backups",
          description: "Fetch all database backups with their sizes and creation times.",
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
          NOT_FOUND: {
            message: "Backup not found",
            data: appErrorData(AppErrorCode.BACKUP_NOT_FOUND),
          },
          BAD_REQUEST: {
            message: "Failed to delete backup",
            data: appErrorData(AppErrorCode.BACKUP_DELETE_FAILED),
          },
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
          BAD_REQUEST: {
            message: "Backup restoration failed",
            data: appErrorData(AppErrorCode.BACKUP_RESTORE_FAILED),
          },
        }),
      schedule: oc
        .route({
          method: "GET",
          path: "/admin/backups/schedule",
          tags: ["Admin"],
          summary: "Get backup schedule",
          description: "Fetch the current automated backup schedule configuration.",
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
    triggerJob: oc
      .route({
        method: "POST",
        path: "/admin/jobs/trigger",
        tags: ["Admin"],
        summary: "Trigger cron job",
        description: "Manually trigger a background cron job by name. The job runs asynchronously.",
      })
      .input(TriggerJobInput)
      .output(TriggerJobOutput)
      .errors({
        NOT_FOUND: {
          message: "Job not found",
          data: appErrorData(AppErrorCode.JOB_NOT_FOUND),
        },
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
    systemHealth: oc
      .route({
        method: "GET",
        path: "/admin/system-health",
        tags: ["Admin"],
        summary: "Get system health report",
        description:
          "Comprehensive health check covering database, TMDB connectivity, cron jobs, image cache, backups, and environment.",
        successDescription: "Full system health report",
      })
      .output(SystemHealthOutput),
  },

  // ─── Imports ────────────────────────────────────────────────
  imports: {
    parseFile: oc
      .route({
        method: "POST",
        path: "/imports/parse-file",
        tags: ["Imports"],
        summary: "Parse import file",
        description:
          "Upload and parse an export file from Trakt, Simkl, Letterboxd, or Sofa. Returns a preview of items found without importing anything.",
        successDescription: "Preview of importable items with counts",
      })
      .input(ParseFileInput)
      .output(ImportPreviewSchema)
      .errors({
        BAD_REQUEST: {
          message: "Invalid import file",
          data: appErrorData(AppErrorCode.IMPORT_INVALID_FILE),
        },
      }),
    parsePayload: oc
      .route({
        method: "POST",
        path: "/imports/parse-payload",
        tags: ["Imports"],
        summary: "Parse raw OAuth import data",
        description:
          "Accept raw API responses from the OAuth proxy, parse them into normalized import format, and return a preview with item counts.",
        successDescription: "Preview of importable items with counts",
      })
      .input(ParsePayloadInput)
      .output(ImportPreviewSchema),
    createJob: oc
      .route({
        method: "POST",
        path: "/imports/jobs",
        tags: ["Imports"],
        summary: "Create import job",
        description: "Create and start a background import job from previously parsed data.",
        successDescription: "Created import job",
      })
      .input(CreateImportJobInput)
      .output(ImportJobSchema)
      .errors({
        BAD_REQUEST: {
          message: "Import payload too large",
          data: appErrorData(AppErrorCode.IMPORT_PAYLOAD_TOO_LARGE),
        },
        CONFLICT: {
          message: "An import is already in progress",
          data: appErrorData(AppErrorCode.IMPORT_ALREADY_RUNNING),
        },
      }),
    getJob: oc
      .route({
        method: "GET",
        path: "/imports/jobs/{id}",
        tags: ["Imports"],
        summary: "Get import job status",
        description: "Get the current status and progress of an import job.",
        successDescription: "Current job state",
      })
      .input(IdParam)
      .output(ImportJobSchema),
    cancelJob: oc
      .route({
        method: "POST",
        path: "/imports/jobs/{id}/cancel",
        tags: ["Imports"],
        summary: "Cancel import job",
        description:
          "Cancel a pending or running import job. Already-imported items are not rolled back.",
        successDescription: "Updated job state",
      })
      .input(IdParam)
      .output(ImportJobSchema)
      .errors({
        BAD_REQUEST: {
          message: "Import cannot be cancelled",
          data: appErrorData(AppErrorCode.IMPORT_CANNOT_CANCEL),
        },
      }),
    jobEvents: oc
      .route({
        method: "GET",
        path: "/imports/jobs/{id}/events",
        tags: ["Imports"],
        summary: "Stream import job events",
        description:
          "SSE stream of import job progress events. Yields progress updates and a final complete event.",
        successDescription: "Stream of job progress events",
      })
      .input(IdParam)
      .output(eventIterator(ImportJobEvent)),
  },
};
