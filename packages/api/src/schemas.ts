import { z } from "zod";

// ─── Shared input schemas ─────────────────────────────────────

export const IdParam = z.object({ id: z.string() });
export const ProviderParam = z.object({
  provider: z.enum(["plex", "jellyfin", "emby", "sonarr", "radarr"]),
});
export const FilenameParam = z.object({ filename: z.string() });
export const MediaTypeParam = z.object({
  type: z.enum(["movie", "tv"]),
});
export const TrendingTypeParam = z.object({
  type: z.enum(["all", "movie", "tv"]),
});
export const TmdbIdTypeParam = z.object({
  tmdbId: z.number().int(),
  type: z.enum(["movie", "tv"]),
});

// ─── Title inputs ──────────────────────────────────────────────

export const UpdateStatusInput = z.object({
  id: z.string(),
  status: z.enum(["in_progress", "completed"]).nullable(),
});

export const UpdateRatingInput = z.object({
  id: z.string(),
  stars: z.number().int().min(0).max(5),
});

export const BatchWatchInput = z.object({
  episodeIds: z.array(z.string()).min(1),
});

// ─── Search / Discover inputs ──────────────────────────────────

export const SearchInput = z.object({
  query: z.string().min(1),
  type: z.enum(["movie", "tv", "person"]).optional(),
});

export const DiscoverInput = z.object({
  mediaType: z.enum(["movie", "tv"]),
  genreId: z.number().int(),
});

// ─── Stats input ───────────────────────────────────────────────

export const StatsInput = z.object({
  type: z.enum(["movies", "episodes"]),
  period: z.enum(["today", "this_week", "this_month", "this_year"]),
});

// ─── Integration inputs ────────────────────────────────────────

export const CreateIntegrationInput = z.object({
  provider: z.enum(["plex", "jellyfin", "emby", "sonarr", "radarr"]),
  enabled: z.boolean().optional(),
});

// ─── Admin inputs ──────────────────────────────────────────────

export const ToggleRegistrationInput = z.object({ open: z.boolean() });
export const ToggleUpdateCheckInput = z.object({ enabled: z.boolean() });
export const TriggerJobInput = z.object({ name: z.string() });

export const UpdateScheduleInput = z.object({
  enabled: z.boolean().optional(),
  frequency: z.enum(["6h", "12h", "1d", "7d"]).optional(),
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
    .optional(),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  maxRetention: z
    .number()
    .int()
    .refine((n) => n === 0 || (n >= 1 && n <= 30), {
      message: "Max backups must be between 1 and 30, or 0 for unlimited",
    })
    .optional(),
});

// ─── Account inputs ────────────────────────────────────────────

export const UpdateNameInput = z.object({ name: z.string().min(1) });

export const UploadAvatarInput = z
  .file()
  .mime(["image/jpeg", "image/png", "image/webp", "image/gif"])
  .max(2 * 1024 * 1024, "File too large (max 2MB)");

export const UploadAvatarOutput = z.object({ imageUrl: z.string() });

// ─── Backup inputs ─────────────────────────────────────────────

export const RestoreBackupInput = z
  .file()
  .max(100 * 1024 * 1024, "File too large (max 100 MB)");

// ═══════════════════════════════════════════════════════════════
// Output schemas
// ═══════════════════════════════════════════════════════════════

// ─── Shared primitives ─────────────────────────────────────────

const mediaType = z.enum(["movie", "tv"]);

const ColorPaletteSchema = z.object({
  vibrant: z.string().nullable(),
  darkVibrant: z.string().nullable(),
  lightVibrant: z.string().nullable(),
  muted: z.string().nullable(),
  darkMuted: z.string().nullable(),
  lightMuted: z.string().nullable(),
});

const EpisodeSchema = z.object({
  id: z.string(),
  episodeNumber: z.number(),
  name: z.string().nullable(),
  overview: z.string().nullable(),
  stillPath: z.string().nullable(),
  airDate: z.string().nullable(),
  runtimeMinutes: z.number().nullable(),
});

const SeasonSchema = z.object({
  id: z.string(),
  seasonNumber: z.number(),
  name: z.string().nullable(),
  episodes: z.array(EpisodeSchema),
});

const AvailabilityOfferSchema = z.object({
  providerId: z.number(),
  providerName: z.string(),
  logoPath: z.string().nullable(),
  offerType: z.string(),
  watchUrl: z.string().nullable(),
});

const CastMemberSchema = z.object({
  id: z.string(),
  personId: z.string(),
  name: z.string(),
  character: z.string().nullable(),
  department: z.string(),
  job: z.string().nullable(),
  displayOrder: z.number(),
  episodeCount: z.number().nullable(),
  profilePath: z.string().nullable(),
  tmdbId: z.number(),
});

const ResolvedTitleSchema = z.object({
  id: z.string(),
  tmdbId: z.number(),
  type: mediaType,
  title: z.string(),
  originalTitle: z.string().nullable(),
  overview: z.string().nullable(),
  releaseDate: z.string().nullable(),
  firstAirDate: z.string().nullable(),
  posterPath: z.string().nullable(),
  backdropPath: z.string().nullable(),
  popularity: z.number().nullable(),
  voteAverage: z.number().nullable(),
  voteCount: z.number().nullable(),
  status: z.string().nullable(),
  contentRating: z.string().nullable(),
  colorPalette: ColorPaletteSchema.nullable(),
  trailerVideoKey: z.string().nullable(),
  genres: z.array(z.string()),
});

const PersonSchema = z.object({
  id: z.string(),
  tmdbId: z.number(),
  name: z.string(),
  biography: z.string().nullable(),
  birthday: z.string().nullable(),
  deathday: z.string().nullable(),
  placeOfBirth: z.string().nullable(),
  profilePath: z.string().nullable(),
  knownForDepartment: z.string().nullable(),
  imdbId: z.string().nullable(),
});

const PersonCreditSchema = z.object({
  titleId: z.string(),
  tmdbId: z.number(),
  type: mediaType,
  title: z.string(),
  posterPath: z.string().nullable(),
  releaseDate: z.string().nullable(),
  firstAirDate: z.string().nullable(),
  voteAverage: z.number().nullable(),
  character: z.string().nullable(),
  department: z.string(),
  job: z.string().nullable(),
});

/** Reusable TMDB browse result (trending / popular / discover items) */
const TmdbBrowseItem = z.object({
  tmdbId: z.number(),
  type: mediaType,
  title: z.string(),
  posterPath: z.string().nullable(),
  releaseDate: z.string().nullable(),
  voteAverage: z.number(),
});

const userStatusMap = z.record(
  z.string(),
  z.enum(["watchlist", "in_progress", "completed"]),
);
const episodeProgressMap = z.record(
  z.string(),
  z.object({ watched: z.number(), total: z.number() }),
);

/** Standard browse response shape (popular, discover) */
const BrowseOutput = z.object({
  items: z.array(TmdbBrowseItem),
  userStatuses: userStatusMap,
  episodeProgress: episodeProgressMap,
});

// ─── Title outputs ─────────────────────────────────────────────

export const TitleDetailOutput = z.object({
  title: ResolvedTitleSchema,
  seasons: z.array(SeasonSchema),
  needsHydration: z.boolean(),
  availability: z.array(AvailabilityOfferSchema),
  cast: z.array(CastMemberSchema),
});

export const TitleResolveOutput = z.object({ id: z.string() });

export const UserInfoOutput = z.object({
  status: z.enum(["watchlist", "in_progress", "completed"]).nullable(),
  rating: z.number().nullable(),
  episodeWatches: z.array(z.string()),
});

export const TitleRecommendationsOutput = z.object({
  recommendations: z.array(
    z.object({
      id: z.string(),
      tmdbId: z.number(),
      type: mediaType,
      title: z.string(),
      posterPath: z.string().nullable(),
      releaseDate: z.string().nullable(),
      firstAirDate: z.string().nullable(),
      voteAverage: z.number().nullable(),
    }),
  ),
  userStatuses: userStatusMap,
});

// ─── People outputs ────────────────────────────────────────────

export const PersonDetailOutput = z.object({
  person: PersonSchema,
  filmography: z.array(PersonCreditSchema),
  userStatuses: userStatusMap,
});

export const PersonResolveOutput = z.object({ id: z.string() });

// ─── Dashboard outputs ─────────────────────────────────────────

export const DashboardStatsOutput = z.object({
  moviesThisMonth: z.number(),
  episodesThisWeek: z.number(),
  librarySize: z.number(),
  completed: z.number(),
});

export const ContinueWatchingOutput = z.object({
  items: z.array(
    z.object({
      title: z.object({
        id: z.string(),
        title: z.string(),
        backdropPath: z.string().nullable(),
      }),
      nextEpisode: z
        .object({
          seasonNumber: z.number(),
          episodeNumber: z.number(),
          name: z.string().nullable(),
          stillPath: z.string().nullable(),
        })
        .nullable(),
      totalEpisodes: z.number(),
      watchedEpisodes: z.number(),
    }),
  ),
});

export const LibraryOutput = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      tmdbId: z.number(),
      type: mediaType,
      title: z.string(),
      posterPath: z.string().nullable(),
      releaseDate: z.string().nullable(),
      voteAverage: z.number().nullable(),
      userStatus: z.enum(["watchlist", "in_progress", "completed"]).nullable(),
    }),
  ),
});

export const DashboardRecommendationsOutput = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      tmdbId: z.number(),
      type: mediaType,
      title: z.string(),
      posterPath: z.string().nullable(),
      releaseDate: z.string().nullable(),
      voteAverage: z.number().nullable(),
    }),
  ),
});

// ─── Explore outputs ───────────────────────────────────────────

export const TrendingOutput = z.object({
  items: z.array(TmdbBrowseItem),
  hero: z
    .object({
      tmdbId: z.number(),
      type: mediaType,
      title: z.string(),
      overview: z.string(),
      backdropPath: z.string().nullable(),
      voteAverage: z.number(),
    })
    .nullable(),
  userStatuses: userStatusMap,
  episodeProgress: episodeProgressMap,
});

export const PopularOutput = BrowseOutput;

export const GenresOutput = z.object({
  genres: z.array(z.object({ id: z.number(), name: z.string() })),
});

// ─── Search output ─────────────────────────────────────────────

export const SearchOutput = z.object({
  results: z.array(
    z.object({
      tmdbId: z.number(),
      type: z.enum(["movie", "tv", "person"]),
      title: z.string(),
      overview: z.string().optional(),
      posterPath: z.string().nullable().optional(),
      profilePath: z.string().nullable().optional(),
      releaseDate: z.string().nullable().optional(),
      popularity: z.number().optional(),
      voteAverage: z.number().optional(),
      knownForDepartment: z.string().optional(),
      knownFor: z.array(z.string()).optional(),
    }),
  ),
});

// ─── Discover output ───────────────────────────────────────────

export const DiscoverOutput = BrowseOutput;

// ─── Stats output ──────────────────────────────────────────────

export const StatsOutput = z.object({
  count: z.number(),
  history: z.array(z.object({ bucket: z.string(), count: z.number() })),
});

// ─── System status output ──────────────────────────────────────

const JobSchema = z.object({
  jobName: z.string(),
  cronPattern: z.string().nullable(),
  nextRunAt: z.string().nullable(),
  lastRunAt: z.string().nullable(),
  lastDurationMs: z.number().nullable(),
  lastStatus: z.enum(["running", "success", "error"]).nullable(),
  lastError: z.string().nullable(),
  isCurrentlyRunning: z.boolean(),
  disabled: z.boolean(),
});

const SystemHealthSchema = z.object({
  database: z.object({
    dbSizeBytes: z.number(),
    walSizeBytes: z.number(),
    titleCount: z.number(),
    episodeCount: z.number(),
    userCount: z.number(),
  }),
  tmdb: z.object({
    connected: z.boolean(),
    tokenValid: z.boolean(),
    tokenConfigured: z.boolean(),
    responseTimeMs: z.number().nullable(),
    error: z.string().nullable(),
  }),
  jobs: z.array(JobSchema),
  imageCache: z.object({
    enabled: z.boolean(),
    totalSizeBytes: z.number(),
    imageCount: z.number(),
    categories: z.record(
      z.string(),
      z.object({ count: z.number(), sizeBytes: z.number() }),
    ),
  }),
  backups: z.object({
    lastBackupAt: z.string().nullable(),
    lastBackupAgeHours: z.number().nullable(),
    backupCount: z.number(),
    totalSizeBytes: z.number(),
  }),
  environment: z.object({
    dataDir: z.string(),
    dataDirWritable: z.boolean(),
    envVars: z.array(
      z.object({ name: z.string(), value: z.string().nullable() }),
    ),
  }),
  checkedAt: z.string(),
});

export const SystemStatusOutput = z.object({
  tmdbConfigured: z.boolean(),
  health: SystemHealthSchema.optional(),
});

// ─── Integration outputs ───────────────────────────────────────

const IntegrationSchema = z.object({
  id: z.string(),
  provider: z.string(),
  type: z.enum(["webhook", "list"]),
  token: z.string(),
  enabled: z.boolean(),
  lastEventAt: z.string().nullable(),
  createdAt: z.string(),
});

const IntegrationEventSchema = z.object({
  id: z.string(),
  eventType: z.string().nullable(),
  mediaType: z.string().nullable(),
  mediaTitle: z.string().nullable(),
  status: z.enum(["success", "ignored", "error"]),
  receivedAt: z.string(),
});

export const IntegrationsListOutput = z.object({
  integrations: z.array(
    IntegrationSchema.extend({
      recentEvents: z.array(IntegrationEventSchema),
    }),
  ),
});

export const IntegrationOutput = IntegrationSchema;

export const IntegrationTokenOutput = IntegrationSchema;

// ─── Admin outputs ─────────────────────────────────────────────

const BackupSchema = z.object({
  filename: z.string(),
  sizeBytes: z.number(),
  createdAt: z.string(),
  source: z.enum(["manual", "scheduled", "pre-restore"]),
});

export const BackupsListOutput = z.object({
  backups: z.array(BackupSchema),
});

export const BackupCreateOutput = BackupSchema;

export const BackupScheduleOutput = z.object({
  enabled: z.boolean(),
  maxRetention: z.number(),
  frequency: z.string(),
  time: z.string(),
  dayOfWeek: z.number(),
});

export const RegistrationOutput = z.object({ open: z.boolean() });

export const UpdateCheckOutput = z.object({
  enabled: z.boolean(),
  updateCheck: z
    .object({
      updateAvailable: z.boolean(),
      currentVersion: z.string(),
      latestVersion: z.string().nullable(),
      releaseUrl: z.string().nullable(),
      lastCheckedAt: z.string().nullable(),
    })
    .nullable(),
});

export const TriggerJobOutput = z.object({ ok: z.literal(true) });

// ─── Watchlist outputs ─────────────────────────────────────────

export const QuickAddOutput = z.object({
  id: z.string(),
  alreadyAdded: z.boolean(),
});

// ─── System outputs (new) ─────────────────────────────────────

export const PublicInfoOutput = z.object({
  tmdbConfigured: z.boolean(),
  userCount: z.number(),
  registrationOpen: z.boolean(),
  posterUrls: z.array(z.string()),
});

export const AuthConfigOutput = z.object({
  oidcEnabled: z.boolean(),
  oidcProviderName: z.string().nullable(),
  passwordLoginDisabled: z.boolean(),
  registrationOpen: z.boolean(),
  userCount: z.number(),
});

// ─── Title hydrate seasons output ─────────────────────────────

export const HydrateSeasonsOutput = z.object({
  seasons: z.array(SeasonSchema),
});

// ─── Types used by web app (moved from services) ─────────────

export type BackupFrequency = "6h" | "12h" | "1d" | "7d";

export type BackupInfo = {
  filename: string;
  sizeBytes: number;
  createdAt: string;
  source: "manual" | "scheduled" | "pre-restore";
};

export type SystemHealthData = z.infer<typeof SystemHealthSchema>;

// ═══════════════════════════════════════════════════════════════
// Inferred types — use these instead of hand-written interfaces
// ═══════════════════════════════════════════════════════════════

export type Episode = z.infer<typeof EpisodeSchema>;
export type Season = z.infer<typeof SeasonSchema>;
export type AvailabilityOffer = z.infer<typeof AvailabilityOfferSchema>;
export type CastMember = z.infer<typeof CastMemberSchema>;
export type ColorPalette = z.infer<typeof ColorPaletteSchema>;
export type ResolvedTitle = z.infer<typeof ResolvedTitleSchema>;
export type ResolvedPerson = z.infer<typeof PersonSchema>;
export type PersonCredit = z.infer<typeof PersonCreditSchema>;

export type UpdateCheckResult = {
  updateAvailable: boolean;
  currentVersion: string;
  latestVersion: string | null;
  releaseUrl: string | null;
  lastCheckedAt: string | null;
};

export type TimePeriod = "today" | "this_week" | "this_month" | "this_year";

export interface HistoryBucket {
  bucket: string;
  count: number;
}

export interface DashboardStats {
  moviesThisMonth: number;
  episodesThisWeek: number;
  librarySize: number;
  completed: number;
}
