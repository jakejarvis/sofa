import {
  index,
  int,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

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
  emailVerified: int("emailVerified", { mode: "boolean" })
    .notNull()
    .default(false),
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

// ─── App tables ──────────────────────────────────────────────────────

export const titles = sqliteTable(
  "titles",
  {
    id: uuidPk(),
    tmdbId: int("tmdbId").notNull(),
    type: text("type", { enum: ["movie", "tv"] }).notNull(),
    title: text("title").notNull(),
    originalTitle: text("originalTitle"),
    overview: text("overview"),
    releaseDate: text("releaseDate"),
    firstAirDate: text("firstAirDate"),
    posterPath: text("posterPath"),
    backdropPath: text("backdropPath"),
    popularity: real("popularity"),
    voteAverage: real("voteAverage"),
    voteCount: int("voteCount"),
    status: text("status"),
    colorPalette: text("colorPalette"),
    trailerVideoKey: text("trailerVideoKey"),
    lastFetchedAt: int("lastFetchedAt", { mode: "timestamp" }),
  },
  (table) => [
    uniqueIndex("titles_tmdbId_unique").on(table.tmdbId),
    index("titles_type_releaseDate").on(table.type, table.releaseDate),
    index("titles_type_firstAirDate").on(table.type, table.firstAirDate),
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
    airDate: text("airDate"),
    lastFetchedAt: int("lastFetchedAt", { mode: "timestamp" }),
  },
  (table) => [
    uniqueIndex("seasons_titleId_seasonNumber").on(
      table.titleId,
      table.seasonNumber,
    ),
  ],
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
    airDate: text("airDate"),
    runtimeMinutes: int("runtimeMinutes"),
  },
  (table) => [
    uniqueIndex("episodes_seasonId_episodeNumber").on(
      table.seasonId,
      table.episodeNumber,
    ),
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
    uniqueIndex("userTitleStatus_userId_titleId").on(
      table.userId,
      table.titleId,
    ),
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
    index("userMovieWatches_userId_watchedAt").on(
      table.userId,
      table.watchedAt,
    ),
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
    index("userEpisodeWatches_userId_watchedAt").on(
      table.userId,
      table.watchedAt,
    ),
    index("userEpisodeWatches_episodeId").on(table.episodeId),
    index("userEpisodeWatches_userId_episodeId").on(
      table.userId,
      table.episodeId,
    ),
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
  (table) => [
    uniqueIndex("userRatings_userId_titleId").on(table.userId, table.titleId),
  ],
);

export const availabilityOffers = sqliteTable(
  "availabilityOffers",
  {
    titleId: text("titleId")
      .notNull()
      .references(() => titles.id, { onDelete: "cascade" }),
    region: text("region").notNull().default("US"),
    providerId: int("providerId").notNull(),
    providerName: text("providerName").notNull(),
    logoPath: text("logoPath"),
    offerType: text("offerType", {
      enum: ["flatrate", "rent", "buy", "free", "ads"],
    }).notNull(),
    link: text("link"),
    lastFetchedAt: int("lastFetchedAt", { mode: "timestamp" }),
  },
  (table) => [
    uniqueIndex("availabilityOffers_unique").on(
      table.titleId,
      table.region,
      table.providerId,
      table.offerType,
    ),
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
    knownForDepartment: text("knownForDepartment"),
    popularity: real("popularity"),
    imdbId: text("imdbId"),
    lastFetchedAt: int("lastFetchedAt", { mode: "timestamp" }),
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
    index("titleCast_titleId_displayOrder").on(
      table.titleId,
      table.displayOrder,
    ),
    index("titleCast_personId").on(table.personId),
  ],
);

// ─── Webhook Connections ─────────────────────────────────────────────

export const webhookConnections = sqliteTable(
  "webhookConnections",
  {
    id: uuidPk(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    provider: text("provider", {
      enum: ["plex", "jellyfin", "emby"],
    }).notNull(),
    token: text("token").notNull().unique(),
    enabled: int("enabled", { mode: "boolean" }).notNull().default(true),
    createdAt: int("createdAt", { mode: "timestamp" }).notNull(),
    lastEventAt: int("lastEventAt", { mode: "timestamp" }),
  },
  (table) => [
    uniqueIndex("webhookConnections_userId_provider").on(
      table.userId,
      table.provider,
    ),
    uniqueIndex("webhookConnections_token").on(table.token),
  ],
);

export const webhookEventLog = sqliteTable(
  "webhookEventLog",
  {
    id: uuidPk(),
    connectionId: text("connectionId")
      .notNull()
      .references(() => webhookConnections.id, { onDelete: "cascade" }),
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
    index("webhookEventLog_connectionId_receivedAt").on(
      table.connectionId,
      table.receivedAt,
    ),
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
  (table) => [
    index("cronRuns_jobName_startedAt").on(table.jobName, table.startedAt),
  ],
);

// ─── App Settings ───────────────────────────────────────────────────

export const appSettings = sqliteTable("appSettings", {
  key: text("key").primaryKey(),
  value: text("value"),
});
