import path from "node:path";

// ─── Paths ───────────────────────────────────────────────────

export const DATA_DIR = process.env.DATA_DIR || "./data";

export const DATABASE_URL =
  process.env.DATABASE_URL || path.join(DATA_DIR, "sqlite.db");

export const CACHE_DIR = process.env.CACHE_DIR
  ? path.join(process.env.CACHE_DIR, "images")
  : path.join(DATA_DIR, "images");

export const BACKUP_DIR = path.join(DATA_DIR, "backups");

export const AVATAR_DIR = path.join(DATA_DIR, "avatars");

// ─── TMDB ────────────────────────────────────────────────────

export const TMDB_API_BASE_URL =
  process.env.TMDB_API_BASE_URL || "https://api.themoviedb.org/3";

export const TMDB_IMAGE_BASE_URL =
  process.env.TMDB_IMAGE_BASE_URL || "https://image.tmdb.org/t/p";
