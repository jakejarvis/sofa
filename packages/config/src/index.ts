import path from "node:path";

// ─── Paths ───────────────────────────────────────────────────

export const DATA_DIR = path.resolve(process.env.DATA_DIR || "./data");

export const DATABASE_URL = process.env.DATABASE_URL || path.join(DATA_DIR, "sqlite.db");

export const CACHE_DIR = process.env.CACHE_DIR
  ? path.join(process.env.CACHE_DIR, "images")
  : path.join(DATA_DIR, "images");

export const BACKUP_DIR = path.join(DATA_DIR, "backups");

export const AVATAR_DIR = path.join(DATA_DIR, "avatars");

// ─── TMDB ────────────────────────────────────────────────────

export const TMDB_API_BASE_URL = process.env.TMDB_API_BASE_URL || "https://api.themoviedb.org/3";

export const TMDB_IMAGE_BASE_URL = process.env.TMDB_IMAGE_BASE_URL || "https://image.tmdb.org/t/p";

// ─── Watch providers ──────────────────────────────────────────

export const WATCH_REGION = process.env.WATCH_REGION || "US";

// ─── Dates ───────────────────────────────────────────────────

/**
 * Calendar date (YYYY-MM-DD) in the server's local timezone. TMDB air/release
 * dates are date-only, so "has it aired?" must compare against one consistent
 * notion of today — the server's (set via TZ).
 */
export function localDateString(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
