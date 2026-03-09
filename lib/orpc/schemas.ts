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
export const TmdbIdTypeParam = z.object({
  tmdbId: z.number().int(),
  type: z.enum(["movie", "tv"]),
});

// ─── Title inputs ──────────────────────────────────────────────

export const UpdateStatusInput = z.object({
  id: z.string(),
  status: z.enum(["in_progress"]).nullable(),
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
