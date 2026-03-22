import { Platform } from "react-native";

import { client } from "@/lib/orpc";
import { resolveUrl } from "@/lib/server";
import type { ContinueWatchingProps } from "@/widgets/continue-watching";
import type { UpcomingProps } from "@/widgets/upcoming";

import { copyBundledAsset, downloadWidgetImage } from "../../modules/widget-images";

/** Resolve a potentially-relative image path to an absolute URL and download it. */
async function downloadImage(path: string | null, key: string): Promise<string | null> {
  const url = resolveUrl(path);
  if (!url) return null;
  return downloadWidgetImage(url, key);
}

const TIMELINE_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes (iOS minimum)

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

let iconFilePath: string | null = null;

async function ensureIcon(): Promise<string | null> {
  if (!iconFilePath) {
    iconFilePath = await copyBundledAsset("sofa-icon", "sofa_icon");
  }
  return iconFilePath;
}

export async function refreshWidgets(): Promise<void> {
  if (Platform.OS !== "ios") return;

  // Lazy import to avoid loading widget modules on Android
  const [{ default: ContinueWatchingWidget }, { default: UpcomingWidget }] = await Promise.all([
    import("@/widgets/continue-watching"),
    import("@/widgets/upcoming"),
  ]);

  await ensureIcon();
  await Promise.all([
    refreshContinueWatching(ContinueWatchingWidget),
    refreshUpcoming(UpcomingWidget),
  ]);
}

async function refreshContinueWatching(
  widget: Awaited<typeof import("@/widgets/continue-watching")>["default"],
): Promise<void> {
  try {
    const { items } = await client.dashboard.continueWatching();

    if (items.length === 0) {
      widget.updateSnapshot({
        isEmpty: true,
        iconFilePath,
        titleId: "",
        titleName: "",
        imageFilePath: null,
        watchedEpisodes: 0,
        totalEpisodes: 0,
        isMovie: false,
      });
      return;
    }

    const top5 = items.slice(0, 5);

    const entries = await Promise.all(
      top5.map(async (item, index) => {
        const imageKey = `cw_${index}`;
        const imagePath = item.nextEpisode?.stillPath ?? item.title.backdropPath;
        const imageFilePath = await downloadImage(imagePath, imageKey);

        const props: ContinueWatchingProps = {
          titleId: item.title.id,
          titleName: item.title.title,
          imageFilePath,
          iconFilePath: null,
          seasonNumber: item.nextEpisode?.seasonNumber,
          episodeNumber: item.nextEpisode?.episodeNumber,
          watchedEpisodes: item.watchedEpisodes,
          totalEpisodes: item.totalEpisodes,
          isMovie: !item.nextEpisode,
          isEmpty: false,
        };

        return {
          date: new Date(Date.now() + index * TIMELINE_INTERVAL_MS),
          props,
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
): Promise<void> {
  try {
    const { items } = await client.dashboard.upcoming({
      days: 30,
      limit: 5,
    });

    if (items.length === 0) {
      widget.updateSnapshot({
        isEmpty: true,
        iconFilePath,
        titleId: "",
        titleName: "",
        imageFilePath: null,
        titleType: "tv",
        episodeCount: 0,
        dateLabel: "",
        episodeLabel: "",
      });
      return;
    }

    const top5 = items.slice(0, 5);

    const entries = await Promise.all(
      top5.map(async (item, index) => {
        const imageKey = `up_${index}`;
        const imageFilePath = await downloadImage(item.backdropPath, imageKey);

        const props: UpcomingProps = {
          titleId: item.titleId,
          titleName: item.titleName,
          imageFilePath,
          iconFilePath: null,
          titleType: item.titleType,
          seasonNumber: item.seasonNumber,
          episodeNumber: item.episodeNumber,
          episodeCount: item.episodeCount,
          dateLabel: formatShortDate(item.date),
          episodeLabel: formatEpisodeLabel(item),
          isEmpty: false,
        };

        return {
          date: new Date(Date.now() + index * TIMELINE_INTERVAL_MS),
          props,
        };
      }),
    );

    widget.updateTimeline(entries);
  } catch (error) {
    console.warn("[Widgets] Failed to refresh Upcoming:", error);
  }
}
