import { Image, Platform } from "react-native";

import { client } from "@/lib/orpc";
import { resolveUrl } from "@/lib/server";
import { getWidgetIconAsset } from "@/lib/widget-assets";
import type { ContinueWatchingProps } from "@/widgets/continue-watching";
import type { UpcomingProps } from "@/widgets/upcoming";

import {
  copyBundledAsset,
  downloadWidgetImage,
  pruneWidgetImages,
} from "../../modules/sofa-widgets-support";

/**
 * Strip null/undefined values from widget props before passing to the native module.
 * iOS UserDefaults (used by expo-widgets to store timeline entries) does not support
 * NSNull — any null or undefined value in the props dictionary will throw an ObjC
 * NSInvalidArgumentException that surfaces as "Exception in HostFunction: <unknown>".
 */
function sanitizeProps<T extends object>(props: { [K in keyof T]: T[K] | null }): T {
  const clean = {} as Record<string, unknown>;
  for (const [key, value] of Object.entries(props)) {
    if (value != null) {
      clean[key] = value;
    }
  }
  return clean as T;
}

/** Resolve a potentially-relative image path to an absolute URL and download it. */
async function downloadImage(path: string | null, key: string): Promise<string> {
  const url = resolveUrl(path);
  if (!url) return "";
  try {
    return (await downloadWidgetImage(url, key)) ?? "";
  } catch (error) {
    console.warn(`[Widgets] Failed to cache image (${key}):`, error);
    return "";
  }
}

const TIMELINE_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes (iOS minimum)
const IMAGE_PRUNE_MAX_AGE_SECONDS = 6 * 60 * 60;
const WIDGET_ICON_KEY = "sofa_icon.png";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatShortDate(dateStr: string): string {
  const parts = dateStr.split("-");
  const monthIdx = parseInt(parts[1]!, 10) - 1;
  const day = parseInt(parts[2]!, 10);
  return `${MONTHS[monthIdx]} ${day}`;
}

function formatEpisodeLabel(item: {
  titleType: "movie" | "tv";
  episodeCount: number;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
}): string {
  if (item.titleType !== "tv") return "Movie";
  if (item.episodeCount > 1 && item.seasonNumber != null)
    return `S${item.seasonNumber} · ${item.episodeCount} eps`;
  if (item.seasonNumber != null) return `S${item.seasonNumber} · E${item.episodeNumber}`;
  return "TV";
}

let refreshSequence = 0;

function hashString(value: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

function nextRefreshToken(prefix: string): string {
  refreshSequence += 1;
  return `${prefix}_${Date.now().toString(36)}_${refreshSequence.toString(36)}`;
}

function buildImageKey(
  prefix: string,
  refreshToken: string,
  parts: Array<string | number | null | undefined>,
): string {
  const identity = parts
    .filter((part): part is string | number => part != null && part !== "")
    .join("|");
  return `${prefix}_${refreshToken}_${hashString(identity)}.jpg`;
}

function resolveWidgetIconUri(): string | null {
  const source = Image.resolveAssetSource(getWidgetIconAsset());
  return source?.uri ?? null;
}

async function ensureIcon(): Promise<string> {
  const iconUri = resolveWidgetIconUri();
  if (!iconUri) {
    console.warn("[Widgets] Failed to resolve widget icon asset URI");
    return "";
  }

  try {
    return (await copyBundledAsset(iconUri, WIDGET_ICON_KEY)) ?? "";
  } catch (error) {
    console.warn("[Widgets] Failed to cache widget icon:", error);
    return "";
  }
}

export async function refreshWidgets(): Promise<void> {
  if (Platform.OS !== "ios") return;

  // Lazy import to avoid loading widget modules on Android
  const [{ default: ContinueWatchingWidget }, { default: UpcomingWidget }] = await Promise.all([
    import("@/widgets/continue-watching"),
    import("@/widgets/upcoming"),
  ]);

  const iconFilePath = await ensureIcon();
  await Promise.all([
    refreshContinueWatching(ContinueWatchingWidget, iconFilePath),
    refreshUpcoming(UpcomingWidget, iconFilePath),
  ]);

  try {
    await pruneWidgetImages(IMAGE_PRUNE_MAX_AGE_SECONDS);
  } catch (error) {
    console.warn("[Widgets] Failed to prune cached images:", error);
  }
}

async function refreshContinueWatching(
  widget: Awaited<typeof import("@/widgets/continue-watching")>["default"],
  iconFilePath: string,
): Promise<void> {
  try {
    const { items } = await client.library.continueWatching();

    if (items.length === 0) {
      widget.updateSnapshot(
        sanitizeProps<ContinueWatchingProps>({
          iconFilePath,
          titleId: "",
          titleName: "",
          imageFilePath: "",
          watchedEpisodes: 0,
          totalEpisodes: 0,
          isMovie: false,
        }),
      );
      return;
    }

    const top5 = items.slice(0, 5);
    const refreshToken = nextRefreshToken("cw");

    const entries = await Promise.all(
      top5.map(async (item, index) => {
        const imagePath = item.nextEpisode?.stillPath ?? item.title.backdropPath;
        const imageKey = buildImageKey("cw", refreshToken, [
          item.title.id,
          item.nextEpisode?.seasonNumber,
          item.nextEpisode?.episodeNumber,
          imagePath,
          index,
        ]);
        const imageFilePath = await downloadImage(imagePath, imageKey);

        return {
          date: new Date(Date.now() + index * TIMELINE_INTERVAL_MS),
          props: sanitizeProps<ContinueWatchingProps>({
            titleId: item.title.id,
            titleName: item.title.title,
            imageFilePath,
            iconFilePath,
            seasonNumber: item.nextEpisode?.seasonNumber,
            episodeNumber: item.nextEpisode?.episodeNumber,
            watchedEpisodes: item.watchedEpisodes,
            totalEpisodes: item.totalEpisodes,
            isMovie: !item.nextEpisode,
          }),
        };
      }),
    );

    widget.updateTimeline(entries);
  } catch (error) {
    console.warn("[Widgets] Failed to refresh Continue Watching:", error);
  }
}

async function refreshUpcoming(
  widget: Awaited<typeof import("@/widgets/upcoming")>["default"],
  iconFilePath: string,
): Promise<void> {
  try {
    const { items } = await client.library.upcoming({
      days: 30,
      limit: 5,
    });

    if (items.length === 0) {
      widget.updateSnapshot(
        sanitizeProps<UpcomingProps>({
          iconFilePath,
          titleId: "",
          titleName: "",
          imageFilePath: "",
          titleType: "tv",
          episodeCount: 0,
          dateLabel: "",
          episodeLabel: "",
        }),
      );
      return;
    }

    const top5 = items.slice(0, 5);
    const refreshToken = nextRefreshToken("up");

    const entries = await Promise.all(
      top5.map(async (item, index) => {
        const imageKey = buildImageKey("up", refreshToken, [
          item.titleId,
          item.date,
          item.seasonNumber,
          item.episodeNumber,
          item.titleType,
          item.backdropPath,
          index,
        ]);
        const imageFilePath = await downloadImage(item.backdropPath, imageKey);

        return {
          date: new Date(Date.now() + index * TIMELINE_INTERVAL_MS),
          props: sanitizeProps<UpcomingProps>({
            titleId: item.titleId,
            titleName: item.titleName,
            imageFilePath,
            iconFilePath,
            titleType: item.titleType,
            seasonNumber: item.seasonNumber,
            episodeNumber: item.episodeNumber,
            episodeCount: item.episodeCount,
            dateLabel: formatShortDate(item.date),
            episodeLabel: formatEpisodeLabel(item),
          }),
        };
      }),
    );

    widget.updateTimeline(entries);
  } catch (error) {
    console.warn("[Widgets] Failed to refresh Upcoming:", error);
  }
}
