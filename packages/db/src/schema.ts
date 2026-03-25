import { sql } from "drizzle-orm";
import { index, int, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

// Helper for UUID primary keys
const uuidPk = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => Bun.randomUUIDv7());

// ─── Better Auth tables ──────────────────────────────────────────────

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: int("emailVerified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  role: text("role").default("user"),
  banned: int("banned", { mode: "boolean" }).default(false),
  banReason: text("banReason"),
  banExpires: int("banExpires", { mode: "timestamp" }),
  createdAt: int("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: int("updatedAt", { mode: "timestamp" }).notNull(),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: int("expiresAt", { mode: "timestamp" }).notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  impersonatedBy: text("impersonatedBy"),
  createdAt: int("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: int("updatedAt", { mode: "timestamp" }).notNull(),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: int("accessTokenExpiresAt", { mode: "timestamp" }),
  refreshTokenExpiresAt: int("refreshTokenExpiresAt", { mode: "timestamp" }),
  scope: text("scope"),
  password: text("password"),
  createdAt: int("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: int("updatedAt", { mode: "timestamp" }).notNull(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: int("expiresAt", { mode: "timestamp" }).notNull(),
  createdAt: int("createdAt", { mode: "timestamp" }),
  updatedAt: int("updatedAt", { mode: "timestamp" }),
});

// ─── Genres ─────────────────────────────────────────────────────────

export const genres = sqliteTable("genres", {
  id: int("id").primaryKey(),
  name: text("name").notNull(),
});

export const titleGenres = sqliteTable(
  "titleGenres",
  {
    titleId: text("titleId")
      .notNull()
      .references(() => titles.id, { onDelete: "cascade" }),
    genreId: int("genreId")
      .notNull()
      .references(() => genres.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("titleGenres_titleId_genreId").on(table.titleId, table.genreId),
    index("titleGenres_genreId").on(table.genreId),
  ],
);

// ─── App tables ──────────────────────────────────────────────────────

export const titles = sqliteTable(
  "titles",
  {
    id: uuidPk(),
    tmdbId: int("tmdbId").notNull(),
    tvdbId: int("tvdbId"),
    type: text("type", { enum: ["movie", "tv"] }).notNull(),
    title: text("title").notNull(),
    originalTitle: text("originalTitle"),
    overview: text("overview"),
    releaseDate: text("releaseDate"),
    firstAirDate: text("firstAirDate"),
    posterPath: text("posterPath"),
    posterThumbHash: text("posterThumbHash"),
    backdropPath: text("backdropPath"),
    backdropThumbHash: text("backdropThumbHash"),
    popularity: real("popularity"),
    voteAverage: real("voteAverage"),
    voteCount: int("voteCount"),
    status: text("status"),
    contentRating: text("contentRating"),
    imdbId: text("imdbId"),
    originalLanguage: text("originalLanguage"),
    runtimeMinutes: int("runtimeMinutes"),
    colorPalette: text("colorPalette"),
    trailerVideoKey: text("trailerVideoKey"),
    lastFetchedAt: int("lastFetchedAt", { mode: "timestamp" }),
  },
  (table) => [
    uniqueIndex("titles_tmdbId_type_unique").on(table.tmdbId, table.type),
    index("titles_type_releaseDate").on(table.type, table.releaseDate),
    index("titles_type_firstAirDate").on(table.type, table.firstAirDate),
    index("titles_lastFetchedAt").on(table.lastFetchedAt),
    index("titles_type_status_lastFetchedAt").on(table.type, table.status, table.lastFetchedAt),
  ],
);

export const seasons = sqliteTable(
  "seasons",
  {
    id: uuidPk(),
    titleId: text("titleId")
      .notNull()
      .references(() => titles.id, { onDelete: "cascade" }),
    seasonNumber: int("seasonNumber").notNull(),
    name: text("name"),
    overview: text("overview"),
    posterPath: text("posterPath"),
    posterThumbHash: text("posterThumbHash"),
    airDate: text("airDate"),
    lastFetchedAt: int("lastFetchedAt", { mode: "timestamp" }),
  },
  (table) => [uniqueIndex("seasons_titleId_seasonNumber").on(table.titleId, table.seasonNumber)],
);

export const episodes = sqliteTable(
  "episodes",
  {
    id: uuidPk(),
    seasonId: text("seasonId")
      .notNull()
      .references(() => seasons.id, { onDelete: "cascade" }),
    episodeNumber: int("episodeNumber").notNull(),
    name: text("name"),
    overview: text("overview"),
    stillPath: text("stillPath"),
    stillThumbHash: text("stillThumbHash"),
    airDate: text("airDate"),
    runtimeMinutes: int("runtimeMinutes"),
  },
  (table) => [
    uniqueIndex("episodes_seasonId_episodeNumber").on(table.seasonId, table.episodeNumber),
    index("episodes_airDate").on(table.airDate),
  ],
);

export const userTitleStatus = sqliteTable(
  "userTitleStatus",
  {
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    titleId: text("titleId")
      .notNull()
      .references(() => titles.id, { onDelete: "cascade" }),
    status: text("status", {
      enum: ["watchlist", "in_progress", "completed"],
    }).notNull(),
    addedAt: int("addedAt", { mode: "timestamp" }).notNull(),
    updatedAt: int("updatedAt", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    uniqueIndex("userTitleStatus_userId_titleId").on(table.userId, table.titleId),
    index("userTitleStatus_userId_status").on(table.userId, table.status),
  ],
);

export const userMovieWatches = sqliteTable(
  "userMovieWatches",
  {
    id: uuidPk(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    titleId: text("titleId")
      .notNull()
      .references(() => titles.id, { onDelete: "cascade" }),
    watchedAt: int("watchedAt", { mode: "timestamp" }).notNull(),
    source: text("source", {
      enum: ["manual", "import", "plex", "jellyfin", "emby"],
    })
      .notNull()
      .default("manual"),
  },
  (table) => [
    index("userMovieWatches_userId_watchedAt").on(table.userId, table.watchedAt),
    index("userMovieWatches_titleId").on(table.titleId),
    index("userMovieWatches_userId_titleId").on(table.userId, table.titleId),
  ],
);

export const userEpisodeWatches = sqliteTable(
  "userEpisodeWatches",
  {
    id: uuidPk(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    episodeId: text("episodeId")
      .notNull()
      .references(() => episodes.id, { onDelete: "cascade" }),
    watchedAt: int("watchedAt", { mode: "timestamp" }).notNull(),
    source: text("source", {
      enum: ["manual", "import", "plex", "jellyfin", "emby"],
    })
      .notNull()
      .default("manual"),
  },
  (table) => [
    index("userEpisodeWatches_userId_watchedAt").on(table.userId, table.watchedAt),
    index("userEpisodeWatches_episodeId").on(table.episodeId),
    index("userEpisodeWatches_userId_episodeId").on(table.userId, table.episodeId),
  ],
);

export const userRatings = sqliteTable(
  "userRatings",
  {
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    titleId: text("titleId")
      .notNull()
      .references(() => titles.id, { onDelete: "cascade" }),
    ratingStars: int("ratingStars").notNull(),
    ratedAt: int("ratedAt", { mode: "timestamp" }).notNull(),
  },
  (table) => [uniqueIndex("userRatings_userId_titleId").on(table.userId, table.titleId)],
);

// ─── Platforms & Availability ────────────────────────────────────────

export const platforms = sqliteTable("platforms", {
  id: uuidPk(),
  name: text("name").notNull(),
  logoPath: text("logoPath"),
  urlTemplate: text("urlTemplate"),
  isSubscription: int("isSubscription", { mode: "boolean" }).notNull().default(true),
});

export const platformTmdbIds = sqliteTable(
  "platformTmdbIds",
  {
    platformId: text("platformId")
      .notNull()
      .references(() => platforms.id, { onDelete: "cascade" }),
    tmdbProviderId: int("tmdbProviderId").notNull(),
  },
  (table) => [
    uniqueIndex("platformTmdbIds_tmdbProviderId_unique").on(table.tmdbProviderId),
    index("platformTmdbIds_platformId").on(table.platformId),
  ],
);

export const titleAvailability = sqliteTable(
  "titleAvailability",
  {
    titleId: text("titleId")
      .notNull()
      .references(() => titles.id, { onDelete: "cascade" }),
    platformId: text("platformId")
      .notNull()
      .references(() => platforms.id, { onDelete: "cascade" }),
    offerType: text("offerType", {
      enum: ["flatrate", "rent", "buy", "free", "ads"],
    }).notNull(),
    region: text("region").notNull().default("US"),
    lastFetchedAt: int("lastFetchedAt", { mode: "timestamp" }),
  },
  (table) => [
    uniqueIndex("titleAvailability_unique").on(
      table.titleId,
      table.platformId,
      table.offerType,
      table.region,
    ),
    index("titleAvailability_titleId").on(table.titleId),
    index("titleAvailability_platformId").on(table.platformId),
  ],
);

export const userPlatforms = sqliteTable(
  "userPlatforms",
  {
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    platformId: text("platformId")
      .notNull()
      .references(() => platforms.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("userPlatforms_userId_platformId").on(table.userId, table.platformId),
    index("userPlatforms_userId").on(table.userId),
  ],
);

export const titleRecommendations = sqliteTable(
  "titleRecommendations",
  {
    titleId: text("titleId")
      .notNull()
      .references(() => titles.id, { onDelete: "cascade" }),
    recommendedTitleId: text("recommendedTitleId")
      .notNull()
      .references(() => titles.id, { onDelete: "cascade" }),
    source: text("source", {
      enum: ["tmdb_similar", "tmdb_recommendations"],
    }).notNull(),
    rank: int("rank").notNull(),
    lastFetchedAt: int("lastFetchedAt", { mode: "timestamp" }),
  },
  (table) => [
    uniqueIndex("titleRecommendations_unique").on(
      table.titleId,
      table.recommendedTitleId,
      table.source,
    ),
    index("titleRecommendations_titleId_rank").on(table.titleId, table.rank),
  ],
);

// ─── Persons & Cast ─────────────────────────────────────────────────

export const persons = sqliteTable(
  "persons",
  {
    id: uuidPk(),
    tmdbId: int("tmdbId").notNull(),
    name: text("name").notNull(),
    biography: text("biography"),
    birthday: text("birthday"),
    deathday: text("deathday"),
    placeOfBirth: text("placeOfBirth"),
    profilePath: text("profilePath"),
    profileThumbHash: text("profileThumbHash"),
    knownForDepartment: text("knownForDepartment"),
    popularity: real("popularity"),
    imdbId: text("imdbId"),
    lastFetchedAt: int("lastFetchedAt", { mode: "timestamp" }),
    filmographyLastFetchedAt: int("filmographyLastFetchedAt", {
      mode: "timestamp",
    }),
  },
  (table) => [
    uniqueIndex("persons_tmdbId_unique").on(table.tmdbId),
    index("persons_name").on(table.name),
  ],
);

export const titleCast = sqliteTable(
  "titleCast",
  {
    id: uuidPk(),
    titleId: text("titleId")
      .notNull()
      .references(() => titles.id, { onDelete: "cascade" }),
    personId: text("personId")
      .notNull()
      .references(() => persons.id, { onDelete: "cascade" }),
    character: text("character"),
    department: text("department").notNull().default("Acting"),
    job: text("job"),
    displayOrder: int("displayOrder").notNull().default(0),
    episodeCount: int("episodeCount"),
    lastFetchedAt: int("lastFetchedAt", { mode: "timestamp" }),
  },
  (table) => [
    uniqueIndex("titleCast_unique").on(
      table.titleId,
      table.personId,
      table.department,
      table.character,
    ),
    index("titleCast_titleId_displayOrder").on(table.titleId, table.displayOrder),
    index("titleCast_personId").on(table.personId),
  ],
);

export const personFilmography = sqliteTable(
  "personFilmography",
  {
    id: uuidPk(),
    personId: text("personId")
      .notNull()
      .references(() => persons.id, { onDelete: "cascade" }),
    titleId: text("titleId")
      .notNull()
      .references(() => titles.id, { onDelete: "cascade" }),
    character: text("character"),
    department: text("department").notNull().default("Acting"),
    job: text("job"),
    displayOrder: int("displayOrder").notNull().default(0),
  },
  (table) => [
    index("personFilmography_personId_displayOrder").on(table.personId, table.displayOrder),
    index("personFilmography_titleId").on(table.titleId),
  ],
);

// ─── Integrations ───────────────────────────────────────────────────

export const integrations = sqliteTable(
  "integrations",
  {
    id: uuidPk(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    type: text("type", { enum: ["webhook", "list"] }).notNull(),
    token: text("token").notNull().unique(),
    enabled: int("enabled", { mode: "boolean" }).notNull().default(true),
    createdAt: int("createdAt", { mode: "timestamp" }).notNull(),
    lastEventAt: int("lastEventAt", { mode: "timestamp" }),
  },
  (table) => [
    uniqueIndex("integrations_userId_provider").on(table.userId, table.provider),
    uniqueIndex("integrations_token").on(table.token),
  ],
);

export const integrationEvents = sqliteTable(
  "integrationEvents",
  {
    id: uuidPk(),
    integrationId: text("integrationId")
      .notNull()
      .references(() => integrations.id, { onDelete: "cascade" }),
    eventType: text("eventType"),
    mediaType: text("mediaType"),
    mediaTitle: text("mediaTitle"),
    status: text("status", {
      enum: ["success", "ignored", "error"],
    }).notNull(),
    errorMessage: text("errorMessage"),
    receivedAt: int("receivedAt", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("integrationEvents_integrationId_receivedAt").on(table.integrationId, table.receivedAt),
  ],
);

// ─── Cron Run History ────────────────────────────────────────────────

export const cronRuns = sqliteTable(
  "cronRuns",
  {
    id: uuidPk(),
    jobName: text("jobName").notNull(),
    status: text("status", {
      enum: ["running", "success", "error"],
    }).notNull(),
    startedAt: int("startedAt", { mode: "timestamp" }).notNull(),
    finishedAt: int("finishedAt", { mode: "timestamp" }),
    durationMs: int("durationMs"),
    errorMessage: text("errorMessage"),
  },
  (table) => [index("cronRuns_jobName_startedAt").on(table.jobName, table.startedAt)],
);

// ─── Import Jobs ────────────────────────────────────────────────────

export const importJobs = sqliteTable(
  "importJobs",
  {
    id: uuidPk(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    source: text("source", {
      enum: ["trakt", "simkl", "letterboxd", "sofa"],
    }).notNull(),
    status: text("status", {
      enum: ["pending", "running", "success", "error", "cancelled"],
    }).notNull(),
    payload: text("payload").notNull(),
    importWatches: int("importWatches", { mode: "boolean" }).notNull(),
    importWatchlist: int("importWatchlist", { mode: "boolean" }).notNull(),
    importRatings: int("importRatings", { mode: "boolean" }).notNull(),
    totalItems: int("totalItems").notNull().default(0),
    processedItems: int("processedItems").notNull().default(0),
    importedCount: int("importedCount").notNull().default(0),
    skippedCount: int("skippedCount").notNull().default(0),
    failedCount: int("failedCount").notNull().default(0),
    currentMessage: text("currentMessage"),
    errors: text("errors"),
    warnings: text("warnings"),
    createdAt: int("createdAt", { mode: "timestamp" }).notNull(),
    startedAt: int("startedAt", { mode: "timestamp" }),
    finishedAt: int("finishedAt", { mode: "timestamp" }),
  },
  (table) => [
    index("importJobs_userId_createdAt").on(table.userId, table.createdAt),
    index("importJobs_status").on(table.status),
    uniqueIndex("importJobs_active_user")
      .on(table.userId)
      .where(sql`${table.status} in ('pending', 'running')`),
  ],
);

// ─── App Settings ───────────────────────────────────────────────────

export const appSettings = sqliteTable("appSettings", {
  key: text("key").primaryKey(),
  value: text("value"),
});
