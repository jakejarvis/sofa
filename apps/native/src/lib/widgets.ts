import { msg, plural } from "@lingui/core/macro";
import { Image, Platform } from "react-native";

import { client } from "@/lib/orpc";
import { resolveUrl } from "@/lib/server";
import { getWidgetIconAsset } from "@/lib/widget-assets";
import type { ContinueWatchingProps } from "@/widgets/continue-watching";
import type { UpcomingProps } from "@/widgets/upcoming";
import type { UpcomingItem } from "@sofa/api/schemas";
import { i18n } from "@sofa/i18n";
import { formatLocalDate } from "@sofa/i18n/date-buckets";
import { formatDate } from "@sofa/i18n/format";

import {
  clearWidgetImages,
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

/** Downloads the first of `paths` that succeeds, or returns "" if none do. */
async function downloadFirstImage(
  paths: Array<string | null | undefined>,
  key: string,
): Promise<string> {
  for (const path of new Set(paths.filter((p): p is string => !!p))) {
    const file = await downloadImage(path, key);
    if (file) return file;
  }
  return "";
}

const IMAGE_PRUNE_MAX_AGE_SECONDS = 6 * 60 * 60;
const WIDGET_ICON_KEY = "sofa_icon.png";

const ROTATION_INTERVAL_MS = 30 * 60 * 1000;
const ROTATION_SPAN_MS = 12 * 60 * 60 * 1000;
const UPCOMING_DAYS = 30;

/**
 * expo-widgets always asks WidgetKit to reload when a timeline ends, and the reload gets these
 * same stored entries back, so the widget keeps showing the last entry until the app runs
 * again. Rotate for a while, then come back to the first (most relevant) item.
 */
export function buildRotationTimeline<T>(items: T[], now: number): Array<{ date: Date; item: T }> {
  if (items.length <= 1) return items.map((item) => ({ date: new Date(now), item }));

  const entries: Array<{ date: Date; item: T }> = [];
  for (let step = 0; step * ROTATION_INTERVAL_MS < ROTATION_SPAN_MS; step += 1) {
    entries.push({
      date: new Date(now + step * ROTATION_INTERVAL_MS),
      item: items[step % items.length]!,
    });
  }
  entries.push({ date: new Date(now + ROTATION_SPAN_MS), item: items[0]! });
  return entries;
}

function localDay(date: Date, offsetDays = 0): string {
  return formatLocalDate(
    new Date(date.getFullYear(), date.getMonth(), date.getDate() + offsetDays),
  );
}

function upcomingDayKind(itemDate: string, on: Date): "today" | "tomorrow" | "later" {
  if (itemDate === localDay(on)) return "today";
  if (itemDate === localDay(on, 1)) return "tomorrow";
  return "later";
}

/**
 * One entry per local midnight at which the shown item or its Today/Tomorrow label changes,
 * starting now, ending with an empty entry once every item's date has passed.
 * `items` must be sorted by `date` ascending (the API guarantees this).
 */
export function buildUpcomingTimeline<T extends { date: string }>(
  items: T[],
  now: Date,
): Array<{ date: Date; item: T | null }> {
  const entries: Array<{ date: Date; item: T | null }> = [];
  let previousKey: string | null = null;

  for (let offset = 0; offset <= UPCOMING_DAYS + 1; offset += 1) {
    const date =
      offset === 0 ? now : new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    const today = localDay(date);
    const item = items.find((candidate) => candidate.date >= today) ?? null;
    const key = item ? `${items.indexOf(item)}:${upcomingDayKind(item.date, date)}` : "empty";
    if (key !== previousKey) {
      entries.push({ date, item });
      previousKey = key;
    }
    if (!item) break;
  }
  return entries;
}

function episodeCode(seasonNum: number, epNum: number): string {
  return i18n._(msg`S${seasonNum} E${epNum}`);
}

function upcomingEpisodeLabel(item: UpcomingItem): string {
  if (item.titleType === "movie") return i18n._(msg`Movie`);
  if (item.episodeCount > 1 && item.seasonNumber != null) {
    const seasonNum = item.seasonNumber;
    const epCount = item.episodeCount;
    return i18n._(
      msg`S${seasonNum} · ${plural(epCount, { one: "# episode", other: "# episodes" })}`,
    );
  }
  if (item.seasonNumber != null && item.episodeNumber != null) {
    return episodeCode(item.seasonNumber, item.episodeNumber);
  }
  return i18n._(msg`TV`);
}

function upcomingDateLabel(itemDate: string, on: Date): string {
  const kind = upcomingDayKind(itemDate, on);
  if (kind === "today") return i18n._(msg`Today`);
  if (kind === "tomorrow") return i18n._(msg`Tomorrow`);
  return formatDate(itemDate, { year: undefined, month: "short" });
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

function emptyContinueWatchingProps(iconFilePath: string): ContinueWatchingProps {
  return sanitizeProps<ContinueWatchingProps>({
    iconFilePath,
    titleId: "",
    titleName: "",
    imageFilePath: "",
    episodeLabel: "",
    watchedEpisodes: 0,
    totalEpisodes: 0,
    emptyLabel: i18n._(msg`Nothing to watch`),
  });
}

function emptyUpcomingProps(iconFilePath: string): UpcomingProps {
  return sanitizeProps<UpcomingProps>({
    iconFilePath,
    titleId: "",
    titleName: "",
    imageFilePath: "",
    dateLabel: "",
    episodeLabel: "",
    emptyLabel: i18n._(msg`Nothing upcoming`),
  });
}

async function runReset(): Promise<void> {
  const [{ default: ContinueWatchingWidget }, { default: UpcomingWidget }] = await Promise.all([
    import("@/widgets/continue-watching"),
    import("@/widgets/upcoming"),
  ]);

  try {
    await clearWidgetImages();
  } catch (error) {
    console.warn("[Widgets] Failed to clear cached images:", error);
  }

  // clearWidgetImages() also removes the cached icon, so copy it again.
  const iconFilePath = await ensureIcon();
  ContinueWatchingWidget.updateSnapshot(emptyContinueWatchingProps(iconFilePath));
  UpcomingWidget.updateSnapshot(emptyUpcomingProps(iconFilePath));
}

async function runRefresh(): Promise<void> {
  // Lazy import to avoid loading widget modules on Android
  const [{ default: ContinueWatchingWidget }, { default: UpcomingWidget }] = await Promise.all([
    import("@/widgets/continue-watching"),
    import("@/widgets/upcoming"),
  ]);

  const iconFilePath = await ensureIcon();
  const [continueWatchingOk, upcomingOk] = await Promise.all([
    refreshContinueWatching(ContinueWatchingWidget, iconFilePath),
    refreshUpcoming(UpcomingWidget, iconFilePath),
  ]);

  // A failed refresh leaves that widget's previous timeline in place; keep its images.
  if (continueWatchingOk && upcomingOk) {
    try {
      await pruneWidgetImages(IMAGE_PRUNE_MAX_AGE_SECONDS);
    } catch (error) {
      console.warn("[Widgets] Failed to prune cached images:", error);
    }
  }
}

// Refreshes and resets run one at a time, in call order, so a slow refresh can't overwrite
// a newer one or put the previous account's data back after sign-out.
let widgetQueue: Promise<void> = Promise.resolve();
let pendingRefresh: Promise<void> | null = null;

function enqueue(task: () => Promise<void>): Promise<void> {
  const run = widgetQueue.then(task);
  widgetQueue = run.catch(() => undefined);
  return run;
}

/** Replace widget content with empty states and delete cached artwork (sign-out / server change). */
export function resetWidgets(): Promise<void> {
  if (Platform.OS !== "ios") return Promise.resolve();
  return enqueue(runReset);
}

export function refreshWidgets(): Promise<void> {
  if (Platform.OS !== "ios") return Promise.resolve();
  // Requests made while a refresh is still waiting its turn share it; one made while a
  // refresh is running queues exactly one more.
  pendingRefresh ??= enqueue(async () => {
    pendingRefresh = null;
    await runRefresh();
  });
  return pendingRefresh;
}

async function refreshContinueWatching(
  widget: Awaited<typeof import("@/widgets/continue-watching")>["default"],
  iconFilePath: string,
): Promise<boolean> {
  try {
    const { items } = await client.library.continueWatching();

    if (items.length === 0) {
      widget.updateSnapshot(emptyContinueWatchingProps(iconFilePath));
      return true;
    }

    const top = items.slice(0, 5);
    const refreshToken = nextRefreshToken("cw");

    const propsPerItem = await Promise.all(
      top.map(async (item, index) => {
        const imagePath = item.nextEpisode?.stillPath ?? item.title.backdropPath;
        const imageKey = buildImageKey("cw", refreshToken, [
          item.title.id,
          item.nextEpisode?.seasonNumber,
          item.nextEpisode?.episodeNumber,
          imagePath,
          index,
        ]);
        const imageFilePath = await downloadFirstImage(
          [item.nextEpisode?.stillPath, item.title.backdropPath],
          imageKey,
        );

        return sanitizeProps<ContinueWatchingProps>({
          titleId: item.title.id,
          titleName: item.title.title,
          imageFilePath,
          iconFilePath,
          episodeLabel: item.nextEpisode
            ? episodeCode(item.nextEpisode.seasonNumber, item.nextEpisode.episodeNumber)
            : "",
          watchedEpisodes: item.watchedEpisodes,
          totalEpisodes: item.totalEpisodes,
          emptyLabel: "",
        });
      }),
    );

    widget.updateTimeline(
      buildRotationTimeline(propsPerItem, Date.now()).map(({ date, item }) => ({
        date,
        props: item,
      })),
    );
    return true;
  } catch (error) {
    console.warn("[Widgets] Failed to refresh Continue Watching:", error);
    return false;
  }
}

async function refreshUpcoming(
  widget: Awaited<typeof import("@/widgets/upcoming")>["default"],
  iconFilePath: string,
): Promise<boolean> {
  try {
    const { items } = await client.library.upcoming({
      days: UPCOMING_DAYS,
      limit: 5,
    });

    const timeline = buildUpcomingTimeline(items, new Date());
    if (!timeline.some((entry) => entry.item)) {
      widget.updateSnapshot(emptyUpcomingProps(iconFilePath));
      return true;
    }

    const refreshToken = nextRefreshToken("up");

    // Download each item's art once, however many entries show it.
    const imageFiles = new Map<UpcomingItem, Promise<string>>();
    const imageFor = (item: UpcomingItem, index: number) => {
      let file = imageFiles.get(item);
      if (!file) {
        const imageKey = buildImageKey("up", refreshToken, [
          item.titleId,
          item.date,
          item.seasonNumber,
          item.episodeNumber,
          item.titleType,
          item.backdropPath,
          index,
        ]);
        file = downloadFirstImage([item.backdropPath, item.posterPath], imageKey);
        imageFiles.set(item, file);
      }
      return file;
    };

    const entries = await Promise.all(
      timeline.map(async ({ date, item }) => ({
        date,
        props: item
          ? sanitizeProps<UpcomingProps>({
              titleId: item.titleId,
              titleName: item.titleName,
              imageFilePath: await imageFor(item, items.indexOf(item)),
              iconFilePath,
              dateLabel: upcomingDateLabel(item.date, date),
              episodeLabel: upcomingEpisodeLabel(item),
              emptyLabel: "",
            })
          : emptyUpcomingProps(iconFilePath),
      })),
    );

    widget.updateTimeline(entries);
    return true;
  } catch (error) {
    console.warn("[Widgets] Failed to refresh Upcoming:", error);
    return false;
  }
}
