import { mkdir, rename } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { availabilityOffers, episodes, seasons, titles } from "@/lib/db/schema";

export type ImageCategory = "posters" | "backdrops" | "stills" | "logos";

const CATEGORY_SIZES: Record<ImageCategory, string> = {
  posters: "w500",
  backdrops: "w1280",
  stills: "w1280",
  logos: "w92",
};

const IMAGE_BASE_URL =
  process.env.TMDB_IMAGE_BASE_URL || "https://image.tmdb.org/t/p";

const DATA_DIR = process.env.DATA_DIR || "./data";
const CACHE_DIR = process.env.CACHE_DIR
  ? path.join(process.env.CACHE_DIR, "images")
  : path.join(DATA_DIR, "images");

export function imageCacheEnabled(): boolean {
  return process.env.IMAGE_CACHE_ENABLED !== "false";
}

export async function ensureImageDirs() {
  for (const category of Object.keys(CATEGORY_SIZES)) {
    await mkdir(path.join(CACHE_DIR, category), { recursive: true });
  }
}

export async function isImageCached(
  category: ImageCategory,
  filename: string,
): Promise<boolean> {
  return Bun.file(getLocalImagePath(category, filename)).exists();
}

export function getLocalImagePath(
  category: ImageCategory,
  filename: string,
): string {
  return path.join(CACHE_DIR, category, path.basename(filename));
}

export async function readCachedImage(
  category: ImageCategory,
  filename: string,
): Promise<Buffer | null> {
  const filePath = getLocalImagePath(category, filename);
  const file = Bun.file(filePath);
  if (!(await file.exists())) return null;
  return Buffer.from(await file.arrayBuffer());
}

export async function downloadAndCacheImage(
  tmdbPath: string,
  category: ImageCategory,
): Promise<Buffer | null> {
  const size = CATEGORY_SIZES[category];
  const url = `${IMAGE_BASE_URL}/${size}${tmdbPath}`;

  const res = await fetch(url);
  if (!res.ok) return null;

  const buffer = Buffer.from(await res.arrayBuffer());
  const filename = path.basename(tmdbPath);
  const finalPath = getLocalImagePath(category, filename);
  const tmpPath = `${finalPath}.tmp.${Date.now()}`;

  try {
    await Bun.write(tmpPath, buffer);
    await rename(tmpPath, finalPath);
  } catch {
    // Best-effort cleanup
  }

  return buffer;
}

export async function fetchAndMaybeCache(
  tmdbPath: string,
  category: ImageCategory,
): Promise<{ buffer: Buffer; contentType: string } | null> {
  // Try local first
  const filename = path.basename(tmdbPath);
  const cached = await readCachedImage(category, filename);
  if (cached) {
    const ext = path.extname(filename).toLowerCase();
    const contentType =
      ext === ".png"
        ? "image/png"
        : ext === ".webp"
          ? "image/webp"
          : "image/jpeg";
    return { buffer: cached, contentType };
  }

  // Fetch from TMDB
  const size = CATEGORY_SIZES[category];
  const url = `${IMAGE_BASE_URL}/${size}${tmdbPath}`;
  const res = await fetch(url);
  if (!res.ok) return null;

  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get("content-type") || "image/jpeg";

  // Fire-and-forget save to disk
  const finalPath = getLocalImagePath(category, filename);
  const tmpPath = `${finalPath}.tmp.${Date.now()}`;
  Bun.write(tmpPath, buffer)
    .then(() => rename(tmpPath, finalPath))
    .catch(() => {});

  return { buffer, contentType };
}

export async function cacheImagesForTitle(titleId: string) {
  const title = db.select().from(titles).where(eq(titles.id, titleId)).get();
  if (!title) return;

  const tasks: Promise<unknown>[] = [];

  if (
    title.posterPath &&
    !(await isImageCached("posters", path.basename(title.posterPath)))
  ) {
    tasks.push(downloadAndCacheImage(title.posterPath, "posters"));
  }
  if (
    title.backdropPath &&
    !(await isImageCached("backdrops", path.basename(title.backdropPath)))
  ) {
    tasks.push(downloadAndCacheImage(title.backdropPath, "backdrops"));
  }

  // Season posters
  if (title.type === "tv") {
    const allSeasons = db
      .select()
      .from(seasons)
      .where(eq(seasons.titleId, titleId))
      .all();
    for (const s of allSeasons) {
      if (
        s.posterPath &&
        !(await isImageCached("posters", path.basename(s.posterPath)))
      ) {
        tasks.push(downloadAndCacheImage(s.posterPath, "posters"));
      }
    }
  }

  await Promise.allSettled(tasks);
}

export async function cacheEpisodeStills(titleId: string) {
  const allSeasons = db
    .select()
    .from(seasons)
    .where(eq(seasons.titleId, titleId))
    .all();

  for (const s of allSeasons) {
    const eps = db
      .select()
      .from(episodes)
      .where(eq(episodes.seasonId, s.id))
      .all();

    const tasks: Promise<unknown>[] = [];
    for (const ep of eps) {
      if (
        ep.stillPath &&
        !(await isImageCached("stills", path.basename(ep.stillPath)))
      ) {
        tasks.push(downloadAndCacheImage(ep.stillPath, "stills"));
      }
    }
    await Promise.allSettled(tasks);
  }
}

export async function cacheProviderLogos(titleId: string) {
  const offers = db
    .select()
    .from(availabilityOffers)
    .where(eq(availabilityOffers.titleId, titleId))
    .all();

  const tasks: Promise<unknown>[] = [];
  const seen = new Set<string>();
  for (const offer of offers) {
    if (offer.logoPath) {
      const basename = path.basename(offer.logoPath);
      if (!seen.has(basename) && !(await isImageCached("logos", basename))) {
        seen.add(basename);
        tasks.push(downloadAndCacheImage(offer.logoPath, "logos"));
      }
    }
  }
  await Promise.allSettled(tasks);
}
