import { z } from "zod";

// ─── Shared input schemas ─────────────────────────────────────

export const IdParam = z.object({
  id: z.string().min(1).describe("Internal UUIDv7 identifier"),
});
export const ProviderParam = z.object({
  provider: z
    .enum(["plex", "jellyfin", "emby", "sonarr", "radarr"])
    .describe("Media server provider type"),
});
export const TmdbIdParam = z.object({
  tmdbId: z.number().int().describe("The Movie Database (TMDB) numeric ID"),
});
export const FilenameParam = z.object({
  filename: z.string().min(1).describe("Backup filename"),
});
export const MediaTypeParam = z.object({
  type: z.enum(["movie", "tv"]).describe("Media type filter"),
});
export const TrendingTypeParam = z.object({
  type: z
    .enum(["all", "movie", "tv"])
    .describe("Trending category: all, movie, or tv"),
});
export const TmdbIdTypeParam = z
  .object({
    tmdbId: z.number().int().describe("TMDB numeric ID"),
    type: z.enum(["movie", "tv"]).describe("Media type"),
  })
  .meta({ description: "TMDB ID and media type pair for resolving titles" });

// ─── Pagination ──────────────────────────────────────────────

/** Page param for TMDB-backed endpoints (fixed ~20 items/page from TMDB) */
export const PageParam = z.object({
  page: z
    .number()
    .int()
    .min(1)
    .max(500)
    .default(1)
    .describe("Page number (1-indexed)"),
});

/** Page + limit for locally-paginated endpoints */
export const PaginatedInput = z.object({
  page: z
    .number()
    .int()
    .min(1)
    .max(500)
    .default(1)
    .describe("Page number (1-indexed)"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe("Results per page (1-100, default 20)"),
});

export const PaginationMeta = z.object({
  page: z.number().describe("Current page number"),
  totalPages: z.number().describe("Total number of pages available"),
  totalResults: z.number().describe("Total number of results across all pages"),
});

// ─── Title inputs ──────────────────────────────────────────────

export const UpdateStatusInput = z
  .object({
    id: z.string().min(1).describe("Title ID"),
    status: z
      .enum(["in_progress", "completed"])
      .nullable()
      .describe(
        "Tracking status: in_progress (currently watching), completed (finished), or null to remove from library",
      ),
  })
  .meta({ description: "Update the user's tracking status for a title" });

export const UpdateRatingInput = z
  .object({
    id: z.string().min(1).describe("Title ID"),
    stars: z
      .number()
      .int()
      .min(0)
      .max(5)
      .describe("Star rating from 0 (clear) to 5"),
  })
  .meta({ description: "Set or clear a star rating for a title" });

export const BatchWatchInput = z
  .object({
    episodeIds: z
      .array(z.string())
      .min(1)
      .describe("List of episode IDs to mark as watched"),
  })
  .meta({ description: "Batch of episode IDs to mark as watched" });

export const HydrateSeasonsInput = z
  .object({
    id: z.string().min(1).describe("Internal title ID"),
    tmdbId: z.number().int().describe("TMDB ID for fetching season data"),
  })
  .meta({ description: "Title identifiers for fetching season/episode data" });

// ─── Search / Discover inputs ──────────────────────────────────

export const SearchInput = z
  .object({
    query: z.string().min(1).max(200).describe("Search query text"),
    type: z
      .enum(["movie", "tv", "person"])
      .optional()
      .describe("Optional type filter to narrow results"),
  })
  .merge(PageParam)
  .meta({ description: "Search query with optional type filter" });

export const DiscoverInput = z
  .object({
    type: z.enum(["movie", "tv"]).describe("Media type to discover"),
    genreId: z.number().int().describe("TMDB genre ID to filter by"),
  })
  .merge(PageParam)
  .meta({ description: "Genre-based discovery filters" });

// ─── Watch history input ──────────────────────────────────────

export const WatchHistoryInput = z
  .object({
    type: z
      .enum(["movie", "episode"])
      .describe("What to count: movie watches or episode watches"),
    period: z
      .enum(["today", "this_week", "this_month", "this_year"])
      .describe("Time range for the histogram"),
  })
  .meta({ description: "Filters for watch history chart data" });

// ─── Integration inputs ────────────────────────────────────────

export const CreateIntegrationInput = z
  .object({
    provider: z
      .enum(["plex", "jellyfin", "emby", "sonarr", "radarr"])
      .describe("Media server provider to integrate"),
    enabled: z
      .boolean()
      .optional()
      .describe("Whether the integration starts enabled (default: true)"),
  })
  .meta({ description: "Create a new media server integration" });

// ─── Admin inputs ──────────────────────────────────────────────

export const ToggleRegistrationInput = z.object({
  open: z.boolean().describe("Whether new user registration is allowed"),
});
export const ToggleUpdateCheckInput = z.object({
  enabled: z.boolean().describe("Whether automatic update checks are enabled"),
});
export const ToggleTelemetryInput = z.object({
  enabled: z
    .boolean()
    .describe("Whether anonymous telemetry reporting is enabled"),
});
export const TelemetryOutput = z
  .object({
    enabled: z.boolean().describe("Whether telemetry is currently enabled"),
    lastReportedAt: z
      .string()
      .nullable()
      .describe(
        "ISO 8601 timestamp of the last telemetry report, or null if never sent",
      ),
  })
  .meta({ description: "Telemetry configuration and last report time" });

const cronJobName = z.enum([
  "scheduledBackup",
  "nightlyRefreshLibrary",
  "refreshAvailability",
  "refreshRecommendations",
  "refreshTvChildren",
  "cacheImages",
  "refreshCredits",
  "updateCheck",
  "telemetryReport",
]);

export const TriggerJobInput = z
  .object({
    name: cronJobName.describe("Cron job to trigger"),
  })
  .meta({ description: "Specify which background job to trigger manually" });

const backupFrequency = z
  .enum(["6h", "12h", "1d", "7d"])
  .describe("Backup interval");

export const UpdateScheduleInput = z
  .object({
    enabled: z
      .boolean()
      .optional()
      .describe("Enable or disable scheduled backups"),
    frequency: backupFrequency.optional(),
    time: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "Invalid time format")
      .refine(
        (t) => {
          const [h, m] = t.split(":").map(Number);
          return h >= 0 && h <= 23 && m >= 0 && m <= 59;
        },
        { message: "Invalid time value" },
      )
      .optional()
      .describe("Time of day to run backups (HH:MM, 24-hour format)"),
    dayOfWeek: z
      .number()
      .int()
      .min(0)
      .max(6)
      .optional()
      .describe("Day of week for weekly backups (0 = Sunday, 6 = Saturday)"),
    maxRetention: z
      .number()
      .int()
      .refine((n) => n === 0 || (n >= 1 && n <= 30), {
        message: "Max backups must be between 1 and 30, or 0 for unlimited",
      })
      .optional()
      .describe(
        "Maximum number of backups to keep (0 = unlimited, 1-30 otherwise)",
      ),
  })
  .meta({
    description: "Partial update to the automated backup schedule",
  });

// ─── Account inputs ────────────────────────────────────────────

export const UpdateNameInput = z.object({
  name: z.string().min(1).describe("New display name"),
});

export const UploadAvatarInput = z
  .file()
  .mime(["image/jpeg", "image/png", "image/webp", "image/gif"])
  .max(2 * 1024 * 1024, "File too large (max 2MB)");

export const UploadAvatarOutput = z.object({
  imageUrl: z.string().describe("URL of the uploaded avatar image"),
});

// ─── Backup inputs ─────────────────────────────────────────────

export const RestoreBackupInput = z
  .file()
  .max(100 * 1024 * 1024, "File too large (max 100 MB)");

// ═══════════════════════════════════════════════════════════════
// Output schemas
// ═══════════════════════════════════════════════════════════════

// ─── Shared primitives ─────────────────────────────────────────

const mediaType = z.enum(["movie", "tv"]).describe("Media type");

export const ColorPaletteSchema = z
  .object({
    vibrant: z.string().nullable(),
    darkVibrant: z.string().nullable(),
    lightVibrant: z.string().nullable(),
    muted: z.string().nullable(),
    darkMuted: z.string().nullable(),
    lightMuted: z.string().nullable(),
  })
  .meta({
    description:
      "Extracted color palette from the title poster image (CSS hex values)",
  });

export const EpisodeSchema = z
  .object({
    id: z.string().describe("Episode ID"),
    episodeNumber: z.number().describe("Episode number within the season"),
    name: z.string().nullable().describe("Episode title"),
    overview: z.string().nullable().describe("Episode plot summary"),
    stillPath: z.string().nullable().describe("Episode still image path"),
    stillThumbHash: z
      .string()
      .nullable()
      .describe("ThumbHash blur placeholder for the still image"),
    airDate: z.string().nullable().describe("Original air date (ISO 8601)"),
    runtimeMinutes: z
      .number()
      .nullable()
      .describe("Episode runtime in minutes"),
  })
  .meta({ description: "A single TV episode" });

export const SeasonSchema = z
  .object({
    id: z.string().describe("Season ID"),
    seasonNumber: z.number().describe("Season number (0 for specials)"),
    name: z.string().nullable().describe("Season name"),
    episodes: z.array(EpisodeSchema).describe("Episodes in this season"),
  })
  .meta({ description: "A TV season with its episodes" });

export const AvailabilityOfferSchema = z
  .object({
    providerId: z.number().describe("JustWatch provider ID"),
    providerName: z.string().describe("Display name (e.g. Netflix, Hulu)"),
    logoPath: z.string().nullable().describe("Provider logo image path"),
    offerType: z
      .string()
      .describe("Offer type: flatrate, rent, buy, free, ads"),
    watchUrl: z
      .string()
      .nullable()
      .describe("Direct link to watch on this provider"),
  })
  .meta({ description: "A streaming availability offer from a provider" });

export const CastMemberSchema = z
  .object({
    id: z.string().describe("Credit ID"),
    personId: z.string().describe("Internal person ID"),
    name: z.string().describe("Person's name"),
    character: z
      .string()
      .nullable()
      .describe("Character name (for acting credits)"),
    department: z.string().describe("Department (e.g. Acting, Directing)"),
    job: z.string().nullable().describe("Job title (for crew credits)"),
    displayOrder: z.number().describe("Sort order in the credits list"),
    episodeCount: z
      .number()
      .nullable()
      .describe("Number of episodes (TV only)"),
    profilePath: z.string().nullable().describe("Profile photo image path"),
    profileThumbHash: z
      .string()
      .nullable()
      .describe("ThumbHash blur placeholder for the profile photo"),
    tmdbId: z.number().describe("TMDB person ID"),
  })
  .meta({ description: "A cast or crew member credit" });

export const ResolvedTitleSchema = z
  .object({
    id: z.string().describe("Internal UUIDv7 identifier"),
    tmdbId: z.number().describe("TMDB numeric ID"),
    type: mediaType,
    title: z.string().describe("Display title (localized)"),
    originalTitle: z.string().nullable().describe("Original language title"),
    overview: z.string().nullable().describe("Plot synopsis"),
    releaseDate: z
      .string()
      .nullable()
      .describe("Theatrical release date (movies, ISO 8601)"),
    firstAirDate: z
      .string()
      .nullable()
      .describe("First air date (TV shows, ISO 8601)"),
    posterPath: z.string().nullable().describe("Poster image path"),
    posterThumbHash: z
      .string()
      .nullable()
      .describe("ThumbHash blur placeholder for the poster"),
    backdropPath: z.string().nullable().describe("Backdrop image path"),
    backdropThumbHash: z
      .string()
      .nullable()
      .describe("ThumbHash blur placeholder for the backdrop"),
    popularity: z.number().nullable().describe("TMDB popularity score"),
    voteAverage: z.number().nullable().describe("Average user rating (0-10)"),
    voteCount: z.number().nullable().describe("Total number of votes"),
    status: z
      .string()
      .nullable()
      .describe("Production status (e.g. Released, Returning Series)"),
    contentRating: z
      .string()
      .nullable()
      .describe("Content rating (e.g. PG-13, TV-MA)"),
    colorPalette: ColorPaletteSchema.nullable(),
    trailerVideoKey: z
      .string()
      .nullable()
      .describe("YouTube video key for the trailer"),
    genres: z.array(z.string()).describe("Genre names"),
  })
  .meta({ description: "A fully resolved movie or TV show from TMDB" });

export const PersonSchema = z
  .object({
    id: z.string().describe("Internal UUIDv7 identifier"),
    tmdbId: z.number().describe("TMDB person ID"),
    name: z.string().describe("Full name"),
    biography: z.string().nullable().describe("Biography text"),
    birthday: z.string().nullable().describe("Date of birth (ISO 8601)"),
    deathday: z.string().nullable().describe("Date of death (ISO 8601)"),
    placeOfBirth: z.string().nullable().describe("Place of birth"),
    profilePath: z.string().nullable().describe("Profile photo image path"),
    profileThumbHash: z
      .string()
      .nullable()
      .describe("ThumbHash blur placeholder for the profile photo"),
    knownForDepartment: z
      .string()
      .nullable()
      .describe("Primary department (e.g. Acting, Directing)"),
    imdbId: z.string().nullable().describe("IMDb person ID (e.g. nm0000123)"),
  })
  .meta({ description: "A person (actor, director, crew member) from TMDB" });

export const PersonCreditSchema = z
  .object({
    titleId: z.string().describe("Internal title ID"),
    tmdbId: z.number().describe("TMDB title ID"),
    type: mediaType,
    title: z.string().describe("Title name"),
    posterPath: z.string().nullable().describe("Poster image path"),
    posterThumbHash: z
      .string()
      .nullable()
      .describe("ThumbHash blur placeholder for the poster"),
    releaseDate: z.string().nullable().describe("Release date (ISO 8601)"),
    firstAirDate: z.string().nullable().describe("First air date (ISO 8601)"),
    voteAverage: z.number().nullable().describe("Average rating (0-10)"),
    character: z
      .string()
      .nullable()
      .describe("Character name (for acting credits)"),
    department: z.string().describe("Department (e.g. Acting, Directing)"),
    job: z.string().nullable().describe("Job title (for crew credits)"),
  })
  .meta({ description: "A person's credit in a movie or TV show" });

/** Reusable TMDB browse result (trending / popular / discover items) */
export const TmdbBrowseItem = z
  .object({
    id: z
      .string()
      .optional()
      .describe("Internal title ID when the title already exists locally"),
    tmdbId: z.number().describe("TMDB numeric ID"),
    type: mediaType,
    title: z.string().describe("Display title"),
    posterPath: z.string().nullable().describe("Poster image path"),
    posterThumbHash: z
      .string()
      .nullable()
      .describe("ThumbHash blur placeholder for the poster"),
    releaseDate: z.string().nullable().describe("Release date (ISO 8601)"),
    firstAirDate: z.string().nullable().describe("First air date (ISO 8601)"),
    voteAverage: z.number().nullable().describe("Average rating (0-10)"),
  })
  .meta({
    description: "A TMDB title card used in browse/trending/popular lists",
  });

/** Recommendation item (shared by title and dashboard recommendations) */
export const RecommendationItemSchema = z
  .object({
    id: z.string().describe("Internal title ID"),
    tmdbId: z.number().describe("TMDB numeric ID"),
    type: mediaType,
    title: z.string().describe("Display title"),
    posterPath: z.string().nullable().describe("Poster image path"),
    posterThumbHash: z
      .string()
      .nullable()
      .describe("ThumbHash blur placeholder for the poster"),
    releaseDate: z.string().nullable().describe("Release date (ISO 8601)"),
    firstAirDate: z.string().nullable().describe("First air date (ISO 8601)"),
    voteAverage: z.number().nullable().describe("Average rating (0-10)"),
  })
  .meta({ description: "A recommended title" });

const userStatusMap = z
  .record(z.string(), z.enum(["watchlist", "in_progress", "completed"]))
  .describe("Map of title ID to the user's tracking status");
const episodeProgressMap = z
  .record(z.string(), z.object({ watched: z.number(), total: z.number() }))
  .describe("Map of title ID to episode watch progress");

/** Standard browse response shape (popular, discover) */
const BrowseOutput = z
  .object({
    items: z.array(TmdbBrowseItem),
    userStatuses: userStatusMap,
    episodeProgress: episodeProgressMap,
  })
  .merge(PaginationMeta)
  .meta({
    description:
      "Browse results with user tracking statuses and episode progress",
  });

// ─── Title outputs ─────────────────────────────────────────────

export const TitleDetailOutput = z
  .object({
    title: ResolvedTitleSchema,
    seasons: z
      .array(SeasonSchema)
      .describe("TV seasons (empty for movies or unhydrated shows)"),
    needsHydration: z
      .boolean()
      .describe(
        "Whether season/episode data needs to be fetched from TMDB before tracking",
      ),
    availability: z
      .array(AvailabilityOfferSchema)
      .describe("Streaming availability offers"),
    cast: z.array(CastMemberSchema).describe("Cast and crew credits"),
  })
  .meta({
    description:
      "Full title details with seasons, cast, and streaming availability",
  });

export const TitleResolveOutput = z
  .object({
    id: z.string().describe("Internal title ID"),
  })
  .meta({ description: "Resolved internal title ID" });

export const UserInfoOutput = z
  .object({
    status: z
      .enum(["watchlist", "in_progress", "completed"])
      .nullable()
      .describe("User's tracking status, or null if not in library"),
    rating: z
      .number()
      .nullable()
      .describe("User's star rating (0-5), or null if unrated"),
    episodeWatches: z
      .array(z.string())
      .describe("IDs of episodes the user has watched"),
  })
  .meta({
    description: "The current user's tracking info for a title",
  });

export const TitleRecommendationsOutput = z
  .object({
    recommendations: z.array(RecommendationItemSchema),
    userStatuses: userStatusMap,
  })
  .meta({
    description: "Recommended titles with the user's statuses",
  });

// ─── People outputs ────────────────────────────────────────────

export const PersonDetailOutput = z
  .object({
    person: PersonSchema,
    filmography: z
      .array(PersonCreditSchema)
      .describe("Credits for this person (paginated)"),
    userStatuses: userStatusMap,
  })
  .merge(PaginationMeta)
  .meta({
    description:
      "Person profile with paginated filmography and user's statuses for their titles",
  });

export const PersonResolveOutput = z
  .object({
    id: z.string().describe("Internal person ID"),
  })
  .meta({ description: "Resolved internal person ID" });

// ─── Dashboard outputs ─────────────────────────────────────────

export const DashboardStatsOutput = z
  .object({
    moviesThisMonth: z
      .number()
      .describe("Movies watched in the current calendar month"),
    episodesThisWeek: z
      .number()
      .describe("Episodes watched in the current calendar week"),
    librarySize: z.number().describe("Total titles in the user's library"),
    completed: z.number().describe("Total titles with completed status"),
  })
  .meta({ description: "Aggregate watch statistics for the dashboard" });

export const ContinueWatchingOutput = z
  .object({
    items: z.array(
      z
        .object({
          title: z.object({
            id: z.string().describe("Title ID"),
            title: z.string().describe("Display title"),
            backdropPath: z.string().nullable().describe("Backdrop image path"),
            backdropThumbHash: z
              .string()
              .nullable()
              .describe("ThumbHash blur placeholder for the backdrop"),
          }),
          nextEpisode: z
            .object({
              seasonNumber: z.number().describe("Season number"),
              episodeNumber: z.number().describe("Episode number"),
              name: z.string().nullable().describe("Episode title"),
              stillPath: z
                .string()
                .nullable()
                .describe("Episode still image path"),
              stillThumbHash: z
                .string()
                .nullable()
                .describe("ThumbHash blur placeholder for the still"),
            })
            .nullable()
            .describe("Next unwatched episode, or null if all caught up"),
          totalEpisodes: z
            .number()
            .describe("Total episodes across all seasons"),
          watchedEpisodes: z.number().describe("Episodes the user has watched"),
        })
        .meta({ description: "An in-progress show with watch progress" }),
    ),
  })
  .meta({
    description:
      "TV shows the user is currently watching with next episode info",
  });

export const LibraryOutput = z
  .object({
    items: z.array(
      z
        .object({
          id: z.string().describe("Title ID"),
          tmdbId: z.number().describe("TMDB numeric ID"),
          type: mediaType,
          title: z.string().describe("Display title"),
          posterPath: z.string().nullable().describe("Poster image path"),
          posterThumbHash: z
            .string()
            .nullable()
            .describe("ThumbHash blur placeholder for the poster"),
          releaseDate: z
            .string()
            .nullable()
            .describe("Release date (ISO 8601)"),
          firstAirDate: z
            .string()
            .nullable()
            .describe("First air date (ISO 8601)"),
          voteAverage: z.number().nullable().describe("Average rating (0-10)"),
          userStatus: z
            .enum(["watchlist", "in_progress", "completed"])
            .nullable()
            .describe("User's tracking status"),
        })
        .meta({ description: "A library item with user status" }),
    ),
  })
  .merge(PaginationMeta)
  .meta({ description: "Paginated titles in the user's library" });

export const DashboardRecommendationsOutput = z
  .object({
    items: z.array(RecommendationItemSchema),
  })
  .meta({
    description: "Personalized title recommendations for the dashboard",
  });

// ─── Explore outputs ───────────────────────────────────────────

export const TrendingOutput = z
  .object({
    items: z.array(TmdbBrowseItem).describe("Trending titles"),
    hero: z
      .object({
        id: z
          .string()
          .optional()
          .describe("Internal title ID when the title already exists locally"),
        tmdbId: z.number().describe("TMDB numeric ID"),
        type: mediaType,
        title: z.string().describe("Display title"),
        overview: z.string().describe("Plot synopsis"),
        backdropPath: z.string().nullable().describe("Backdrop image path"),
        voteAverage: z.number().describe("Average rating (0-10)"),
      })
      .nullable()
      .describe("Featured hero title for the spotlight banner"),
    userStatuses: userStatusMap,
    episodeProgress: episodeProgressMap,
  })
  .merge(PaginationMeta)
  .meta({
    description: "Trending titles with hero spotlight and user statuses",
  });

export const PopularOutput = BrowseOutput;

export const GenresOutput = z
  .object({
    genres: z.array(
      z.object({
        id: z.number().describe("TMDB genre ID"),
        name: z.string().describe("Genre display name"),
      }),
    ),
  })
  .meta({ description: "Available genres for filtering" });

// ─── Search output ─────────────────────────────────────────────

export const SearchOutput = z
  .object({
    results: z.array(
      z
        .object({
          tmdbId: z.number().describe("TMDB numeric ID"),
          type: z.enum(["movie", "tv", "person"]).describe("Result type"),
          title: z.string().describe("Title or person name"),
          overview: z
            .string()
            .nullable()
            .describe("Plot summary or null for people"),
          posterPath: z
            .string()
            .nullable()
            .describe("Poster image path (movies/TV)"),
          profilePath: z
            .string()
            .nullable()
            .describe("Profile photo path (people)"),
          releaseDate: z
            .string()
            .nullable()
            .describe("Release date (ISO 8601)"),
          popularity: z.number().nullable().describe("TMDB popularity score"),
          voteAverage: z.number().nullable().describe("Average rating (0-10)"),
          knownForDepartment: z
            .string()
            .nullable()
            .describe("Primary department (people only)"),
          knownFor: z
            .array(z.string())
            .nullable()
            .describe("Notable works (people only, up to 3 titles)"),
        })
        .meta({ description: "A search result (movie, TV show, or person)" }),
    ),
  })
  .merge(PaginationMeta)
  .meta({ description: "Search results from TMDB" });

// ─── Discover output ───────────────────────────────────────────

export const DiscoverOutput = BrowseOutput;

// ─── Watch history output ──────────────────────────────────────

export const HistoryBucketSchema = z
  .object({
    bucket: z.string().describe("Time period label (e.g. date or week)"),
    count: z.number().describe("Number of watches in this bucket"),
  })
  .meta({ description: "A single time-bucketed watch count" });

export const WatchHistoryOutput = z
  .object({
    count: z.number().describe("Total watches in the selected period"),
    history: z
      .array(HistoryBucketSchema)
      .describe("Watch counts bucketed by time period"),
  })
  .meta({ description: "Watch history with time-bucketed counts" });

// ─── System status output ──────────────────────────────────────

export const JobSchema = z
  .object({
    jobName: z.string().describe("Cron job identifier"),
    cronPattern: z
      .string()
      .nullable()
      .describe("Cron expression (e.g. 0 2 * * *)"),
    nextRunAt: z.string().nullable().describe("Next scheduled run (ISO 8601)"),
    lastRunAt: z.string().nullable().describe("Last run start time (ISO 8601)"),
    lastDurationMs: z
      .number()
      .nullable()
      .describe("Duration of last run in milliseconds"),
    lastStatus: z
      .enum(["running", "success", "error"])
      .nullable()
      .describe("Outcome of the last run"),
    lastError: z
      .string()
      .nullable()
      .describe("Error message from the last failed run"),
    isCurrentlyRunning: z
      .boolean()
      .describe("Whether the job is currently executing"),
    disabled: z.boolean().describe("Whether the job is disabled"),
  })
  .meta({ description: "Status of a background cron job" });

export const SystemHealthSchema = z
  .object({
    database: z
      .object({
        dbSizeBytes: z.number().describe("SQLite database file size"),
        walSizeBytes: z.number().describe("WAL file size"),
        titleCount: z.number().describe("Total titles in database"),
        episodeCount: z.number().describe("Total episodes in database"),
        userCount: z.number().describe("Total registered users"),
      })
      .meta({ description: "Database size and record counts" }),
    tmdb: z
      .object({
        connected: z.boolean().describe("Whether TMDB API is reachable"),
        tokenValid: z.boolean().describe("Whether the API token is valid"),
        tokenConfigured: z.boolean().describe("Whether a token is set"),
        responseTimeMs: z
          .number()
          .nullable()
          .describe("TMDB API response time in milliseconds"),
        error: z
          .string()
          .nullable()
          .describe("Error message if connectivity check failed"),
      })
      .meta({ description: "TMDB API connectivity status" }),
    jobs: z.array(JobSchema).describe("Status of all cron jobs"),
    imageCache: z
      .object({
        enabled: z.boolean().describe("Whether image caching is enabled"),
        totalSizeBytes: z.number().describe("Total cache size on disk"),
        imageCount: z.number().describe("Total cached images"),
        categories: z
          .record(
            z.string(),
            z.object({
              count: z.number().describe("Images in this category"),
              sizeBytes: z.number().describe("Category size on disk"),
            }),
          )
          .describe("Breakdown by image category (posters, backdrops, etc.)"),
      })
      .meta({ description: "Image cache statistics" }),
    backups: z
      .object({
        lastBackupAt: z
          .string()
          .nullable()
          .describe("Last backup timestamp (ISO 8601)"),
        lastBackupAgeHours: z
          .number()
          .nullable()
          .describe("Hours since the last backup"),
        backupCount: z.number().describe("Total backup files"),
        totalSizeBytes: z.number().describe("Total size of all backups"),
      })
      .meta({ description: "Backup status and size information" }),
    environment: z
      .object({
        dataDir: z.string().describe("Configured data directory path"),
        dataDirWritable: z
          .boolean()
          .describe("Whether the data directory is writable"),
        envVars: z
          .array(
            z.object({
              name: z.string().describe("Environment variable name"),
              value: z
                .string()
                .nullable()
                .describe("Current value (sensitive values are masked)"),
            }),
          )
          .describe("Relevant environment variable statuses"),
      })
      .meta({ description: "Server environment information" }),
    checkedAt: z
      .string()
      .describe("When this health check was performed (ISO 8601)"),
  })
  .meta({
    description:
      "Comprehensive system health report covering database, TMDB, jobs, cache, backups, and environment",
  });

export const SystemStatusOutput = z
  .object({
    tmdbConfigured: z
      .boolean()
      .describe("Whether a TMDB API token is configured"),
  })
  .meta({ description: "Quick TMDB configuration check" });

export const SystemHealthOutput = SystemHealthSchema;

// ─── Integration outputs ───────────────────────────────────────

export const IntegrationSchema = z
  .object({
    id: z.string().describe("Integration ID"),
    provider: z.string().describe("Provider name (plex, jellyfin, etc.)"),
    type: z
      .enum(["webhook", "list"])
      .describe(
        "Integration type: webhook (Plex/Jellyfin/Emby) or list (Sonarr/Radarr)",
      ),
    token: z.string().describe("Webhook authentication token"),
    enabled: z.boolean().describe("Whether the integration is active"),
    lastEventAt: z
      .string()
      .nullable()
      .describe("Last received event timestamp (ISO 8601)"),
    createdAt: z
      .string()
      .describe("When the integration was created (ISO 8601)"),
  })
  .meta({ description: "A media server integration configuration" });

export const IntegrationEventSchema = z
  .object({
    id: z.string().describe("Event ID"),
    eventType: z.string().nullable().describe("Webhook event type"),
    mediaType: z.string().nullable().describe("Media type from the event"),
    mediaTitle: z.string().nullable().describe("Title from the event"),
    status: z
      .enum(["success", "ignored", "error"])
      .describe("Event processing outcome"),
    receivedAt: z.string().describe("When the event was received (ISO 8601)"),
  })
  .meta({ description: "A webhook or sync event from a media server" });

export const IntegrationsListOutput = z
  .object({
    integrations: z.array(
      IntegrationSchema.extend({
        recentEvents: z
          .array(IntegrationEventSchema)
          .describe("Last 10 events for this integration"),
      }),
    ),
  })
  .meta({
    description: "All integrations with their recent events",
  });

export const IntegrationOutput = IntegrationSchema;

// ─── Admin outputs ─────────────────────────────────────────────

export const BackupSchema = z
  .object({
    filename: z.string().describe("Backup filename on disk"),
    sizeBytes: z.number().describe("Backup file size in bytes"),
    createdAt: z.string().describe("When the backup was created (ISO 8601)"),
    source: z
      .enum(["manual", "scheduled", "pre-restore"])
      .describe(
        "How the backup was created: manual, scheduled, or automatic pre-restore",
      ),
  })
  .meta({ description: "A database backup file" });

export const BackupsListOutput = z
  .object({
    backups: z.array(BackupSchema),
  })
  .meta({ description: "All available database backups" });

export const BackupCreateOutput = BackupSchema;

export const BackupScheduleOutput = z
  .object({
    enabled: z.boolean().describe("Whether scheduled backups are enabled"),
    maxRetention: z
      .number()
      .describe("Maximum backups to keep (0 = unlimited)"),
    frequency: backupFrequency,
    time: z.string().describe("Scheduled time (HH:MM, 24-hour format)"),
    dayOfWeek: z
      .number()
      .describe("Day of week for weekly backups (0 = Sunday)"),
  })
  .meta({ description: "Automated backup schedule configuration" });

export const RegistrationOutput = z
  .object({
    open: z.boolean().describe("Whether new user registration is open"),
  })
  .meta({ description: "User registration status" });

const UpdateCheckResultSchema = z
  .object({
    updateAvailable: z
      .boolean()
      .describe("Whether a newer version is available"),
    currentVersion: z.string().describe("Currently running version"),
    latestVersion: z
      .string()
      .nullable()
      .describe("Latest available version, or null if check failed"),
    releaseUrl: z
      .string()
      .nullable()
      .describe("URL to the latest release page"),
    lastCheckedAt: z
      .string()
      .nullable()
      .describe("When the last check was performed (ISO 8601)"),
  })
  .meta({ description: "Result of an update availability check" });

export const UpdateCheckOutput = z
  .object({
    enabled: z
      .boolean()
      .describe("Whether automatic update checks are enabled"),
    updateCheck: UpdateCheckResultSchema.nullable().describe(
      "Latest check result, or null if checks are disabled or never ran",
    ),
  })
  .meta({ description: "Update check configuration and latest result" });

export const TriggerJobOutput = z.object({
  ok: z.literal(true).describe("Always true on success"),
});

export const PurgeMetadataCacheOutput = z
  .object({
    deletedTitles: z
      .number()
      .describe("Number of un-enriched stub titles deleted"),
    deletedPersons: z
      .number()
      .describe("Number of orphaned person records deleted"),
  })
  .meta({
    description: "Result of purging un-enriched metadata from the database",
  });

export const PurgeImageCacheOutput = z
  .object({
    deletedFiles: z
      .number()
      .describe("Number of image files deleted from disk"),
    freedBytes: z.number().describe("Total bytes freed from disk"),
  })
  .meta({ description: "Result of purging the image cache from disk" });

// ─── Quick add output ──────────────────────────────────────────

export const QuickAddOutput = z
  .object({
    id: z.string().describe("Internal title ID"),
    alreadyAdded: z
      .boolean()
      .describe("True if the title was already in the user's library"),
  })
  .meta({
    description: "Result of a quick-add operation",
  });

// ─── System outputs ───────────────────────────────────────────

export const PublicInfoOutput = z
  .object({
    instanceId: z.string().describe("Unique instance identifier"),
    tmdbConfigured: z.boolean().describe("Whether TMDB API is configured"),
    userCount: z.number().describe("Number of registered users"),
    registrationOpen: z
      .boolean()
      .describe("Whether new user registration is open"),
    posterUrls: z
      .array(z.string())
      .describe("Poster image URLs for the login screen collage"),
  })
  .meta({
    description: "Public instance information shown on the login/setup screen",
  });

export const AuthConfigOutput = z
  .object({
    oidcEnabled: z.boolean().describe("Whether OIDC/SSO login is available"),
    oidcProviderName: z
      .string()
      .nullable()
      .describe("Display name of the OIDC provider (e.g. Authelia, Keycloak)"),
    passwordLoginDisabled: z
      .boolean()
      .describe("Whether password-based login is disabled"),
    registrationOpen: z
      .boolean()
      .describe("Whether new user registration is open"),
    userCount: z.number().describe("Number of registered users"),
  })
  .meta({
    description: "Authentication provider configuration",
  });

// ─── Title hydrate seasons output ─────────────────────────────

export const HydrateSeasonsOutput = z
  .object({
    seasons: z.array(SeasonSchema).describe("Hydrated seasons with episodes"),
  })
  .meta({
    description: "Freshly fetched season and episode data from TMDB",
  });

// ═══════════════════════════════════════════════════════════════
// Inferred types — use these instead of hand-written interfaces
// ═══════════════════════════════════════════════════════════════

export type AvailabilityOffer = z.infer<typeof AvailabilityOfferSchema>;
export type BackupFrequency = z.infer<typeof backupFrequency>;
export type BackupInfo = z.infer<typeof BackupSchema>;
export type CastMember = z.infer<typeof CastMemberSchema>;
export type ColorPalette = z.infer<typeof ColorPaletteSchema>;
export type CronJobName = z.infer<typeof cronJobName>;
export type DashboardStats = z.infer<typeof DashboardStatsOutput>;
export type Episode = z.infer<typeof EpisodeSchema>;
export type HistoryBucket = z.infer<typeof HistoryBucketSchema>;
export type PersonCredit = z.infer<typeof PersonCreditSchema>;
export type RecommendationItem = z.infer<typeof RecommendationItemSchema>;
export type ResolvedPerson = z.infer<typeof PersonSchema>;
export type ResolvedTitle = z.infer<typeof ResolvedTitleSchema>;
export type Season = z.infer<typeof SeasonSchema>;
export type SystemHealthData = z.infer<typeof SystemHealthSchema>;
export type PaginationInfo = z.infer<typeof PaginationMeta>;
export type TimePeriod = z.infer<typeof WatchHistoryInput>["period"];
export type UpdateCheckResult = z.infer<typeof UpdateCheckResultSchema>;
