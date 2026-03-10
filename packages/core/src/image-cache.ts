import { mkdir, rename } from "node:fs/promises";
import path from "node:path";
import { db } from "@sofa/db/client";
import { CACHE_DIR, TMDB_IMAGE_BASE_URL } from "@sofa/db/constants";
import { createLogger } from "@sofa/db/logger";
import {
  availabilityOffers,
  episodes,
  persons,
  seasons,
  titleCast,
  titles,
} from "@sofa/db/schema";
import type { ImageCategory } from "@sofa/tmdb/image";
import { eq, inArray } from "drizzle-orm";

const log = createLogger("image-cache");

export type { ImageCategory };

const CATEGORY_SIZES: Record<ImageCategory, string> = {
  posters: "w500",
  backdrops: "w1280",
  stills: "w1280",
  logos: "w92",
  profiles: "w185",
};

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
  const url = `${TMDB_IMAGE_BASE_URL}/${size}${tmdbPath}`;

  const res = await fetch(url);
  if (!res.ok) {
    log.warn(`Download failed: ${url} -> ${res.status}`);
    return null;
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const filename = path.basename(tmdbPath);
  const finalPath = getLocalImagePath(category, filename);
  const tmpPath = `${finalPath}.tmp.${Date.now()}`;

  try {
    await Bun.write(tmpPath, buffer);
    await rename(tmpPath, finalPath);
    log.debug(`Cached ${category}/${filename} (${buffer.length} bytes)`);
  } catch (err) {
    log.warn(`Failed to write cached image ${filename}:`, err);
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
    log.debug(`Cache hit: ${category}/${filename}`);
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
  const url = `${TMDB_IMAGE_BASE_URL}/${size}${tmdbPath}`;
  const res = await fetch(url);
  if (!res.ok) {
    log.warn(`Fetch failed: ${url} -> ${res.status}`);
    return null;
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get("content-type") || "image/jpeg";

  // Fire-and-forget save to disk
  const finalPath = getLocalImagePath(category, filename);
  const tmpPath = `${finalPath}.tmp.${Date.now()}`;
  Bun.write(tmpPath, buffer)
    .then(() => rename(tmpPath, finalPath))
    .catch((err) => log.warn(`Failed to cache ${category}/${filename}:`, err));

  return { buffer, contentType };
}

export async function cacheImagesForTitle(titleId: string) {
  const title = db.select().from(titles).where(eq(titles.id, titleId)).get();
  if (!title) return;

  // Collect all candidate images, then check cache in parallel
  const candidates: { imgPath: string; category: ImageCategory }[] = [];
  if (title.posterPath)
    candidates.push({ imgPath: title.posterPath, category: "posters" });
  if (title.backdropPath)
    candidates.push({ imgPath: title.backdropPath, category: "backdrops" });

  if (title.type === "tv") {
    const allSeasons = db
      .select()
      .from(seasons)
      .where(eq(seasons.titleId, titleId))
      .all();
    for (const s of allSeasons) {
      if (s.posterPath)
        candidates.push({ imgPath: s.posterPath, category: "posters" });
    }
  }

  // Parallel cache checks instead of sequential awaits
  const checks = await Promise.all(
    candidates.map(async (c) => ({
      ...c,
      cached: await isImageCached(c.category, path.basename(c.imgPath)),
    })),
  );
  const tasks = checks
    .filter((c) => !c.cached)
    .map((c) => downloadAndCacheImage(c.imgPath, c.category));

  if (tasks.length > 0) {
    log.debug(`Caching ${tasks.length} images for title ${titleId}`);
  }

  await Promise.allSettled(tasks);
}

export async function cacheEpisodeStills(titleId: string) {
  const allSeasons = db
    .select()
    .from(seasons)
    .where(eq(seasons.titleId, titleId))
    .all();

  const seasonIds = allSeasons.map((s) => s.id);
  if (seasonIds.length === 0) return;

  const allEps = db
    .select()
    .from(episodes)
    .where(inArray(episodes.seasonId, seasonIds))
    .all();

  const epsWithStills = allEps.filter(
    (ep): ep is typeof ep & { stillPath: string } => ep.stillPath != null,
  );
  // Parallel cache checks instead of sequential awaits
  const checks = await Promise.all(
    epsWithStills.map(async (ep) => ({
      stillPath: ep.stillPath,
      cached: await isImageCached("stills", path.basename(ep.stillPath)),
    })),
  );
  const tasks = checks
    .filter((c) => !c.cached)
    .map((c) => downloadAndCacheImage(c.stillPath, "stills"));

  await Promise.allSettled(tasks);
}

export async function cacheProviderLogos(titleId: string) {
  const offers = db
    .select()
    .from(availabilityOffers)
    .where(eq(availabilityOffers.titleId, titleId))
    .all();

  // Deduplicate and parallel cache checks
  const uniqueLogos = new Map<string, string>();
  for (const offer of offers) {
    if (offer.logoPath) {
      const basename = path.basename(offer.logoPath);
      if (!uniqueLogos.has(basename)) uniqueLogos.set(basename, offer.logoPath);
    }
  }
  const checks = await Promise.all(
    [...uniqueLogos.entries()].map(async ([basename, logoPath]) => ({
      logoPath,
      cached: await isImageCached("logos", basename),
    })),
  );
  const tasks = checks
    .filter((c) => !c.cached)
    .map((c) => downloadAndCacheImage(c.logoPath, "logos"));

  await Promise.allSettled(tasks);
}

export async function cacheProfilePhotos(titleId: string) {
  const castRows = db
    .select({ profilePath: persons.profilePath })
    .from(titleCast)
    .innerJoin(persons, eq(titleCast.personId, persons.id))
    .where(eq(titleCast.titleId, titleId))
    .all();

  // Deduplicate and parallel cache checks
  const uniqueProfiles = new Map<string, string>();
  for (const row of castRows) {
    if (row.profilePath) {
      const basename = path.basename(row.profilePath);
      if (!uniqueProfiles.has(basename))
        uniqueProfiles.set(basename, row.profilePath);
    }
  }
  const checks = await Promise.all(
    [...uniqueProfiles.entries()].map(async ([basename, profilePath]) => ({
      profilePath,
      cached: await isImageCached("profiles", basename),
    })),
  );
  const tasks = checks
    .filter((c) => !c.cached)
    .map((c) => downloadAndCacheImage(c.profilePath, "profiles"));

  if (tasks.length > 0) {
    log.debug(`Caching ${tasks.length} profile photos for title ${titleId}`);
  }
  await Promise.allSettled(tasks);
}
