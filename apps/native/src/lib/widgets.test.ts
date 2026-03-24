import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const CACHED_WIDGET_IMAGE_RE = /^file:\/\/\/group\/cw_/;
const platform = { OS: "ios" };
const resolveAssetSource = vi.fn(() => ({ uri: "file:///tmp/sofa-icon.png" }));
const continueWatching = vi.fn();
const upcoming = vi.fn();
const downloadWidgetImage = vi.fn(async (_url: string, key: string) => `file:///group/${key}`);
const copyBundledAsset = vi.fn(async (_assetUri: string, key: string) => `file:///group/${key}`);
const pruneWidgetImages = vi.fn(async () => undefined);
const getWidgetIconAsset = vi.fn(() => "widget-icon-asset");

const continueWatchingWidget = {
  updateSnapshot: vi.fn(),
  updateTimeline: vi.fn(),
};

const upcomingWidget = {
  updateSnapshot: vi.fn(),
  updateTimeline: vi.fn(),
};

vi.mock("react-native", () => ({
  Image: {
    resolveAssetSource,
  },
  Platform: platform,
}));

vi.mock("@/lib/widget-assets", () => ({
  getWidgetIconAsset,
}));

vi.mock("@/lib/orpc", () => ({
  client: {
    dashboard: {
      continueWatching,
      upcoming,
    },
  },
}));

vi.mock("@/lib/server", () => ({
  resolveUrl: (path: string | null) => (path ? `https://sofa.test${path}` : null),
}));

vi.mock("../../modules/sofa-widgets-support", () => ({
  copyBundledAsset,
  downloadWidgetImage,
  pruneWidgetImages,
}));

vi.mock("@/widgets/continue-watching", () => ({
  default: continueWatchingWidget,
}));

vi.mock("@/widgets/upcoming", () => ({
  default: upcomingWidget,
}));

async function loadWidgetsModule() {
  vi.resetModules();
  return import("./widgets");
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-03-24T12:00:00Z"));
  platform.OS = "ios";
  continueWatching.mockResolvedValue({ items: [] });
  upcoming.mockResolvedValue({ items: [] });
  downloadWidgetImage.mockImplementation(
    async (_url: string, key: string) => `file:///group/${key}`,
  );
  copyBundledAsset.mockImplementation(
    async (_assetUri: string, key: string) => `file:///group/${key}`,
  );
  pruneWidgetImages.mockResolvedValue(undefined);
  resolveAssetSource.mockReturnValue({ uri: "file:///tmp/sofa-icon.png" });
  getWidgetIconAsset.mockReturnValue("widget-icon-asset");
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("refreshWidgets", () => {
  test("uses a fresh widget image path on each refresh cycle", async () => {
    continueWatching.mockResolvedValue({
      items: [
        {
          title: {
            id: "title-1",
            title: "Severance",
            backdropPath: "/backdrop-1.jpg",
          },
          nextEpisode: {
            seasonNumber: 2,
            episodeNumber: 3,
            stillPath: "/still-1.jpg",
          },
          watchedEpisodes: 2,
          totalEpisodes: 10,
        },
      ],
    });

    const { refreshWidgets } = await loadWidgetsModule();

    await refreshWidgets();
    const firstPath =
      continueWatchingWidget.updateTimeline.mock.calls[0]?.[0]?.[0]?.props?.imageFilePath;

    continueWatchingWidget.updateTimeline.mockClear();
    vi.advanceTimersByTime(1000);

    await refreshWidgets();
    const secondPath =
      continueWatchingWidget.updateTimeline.mock.calls[0]?.[0]?.[0]?.props?.imageFilePath;

    expect(firstPath).toMatch(CACHED_WIDGET_IMAGE_RE);
    expect(secondPath).toMatch(CACHED_WIDGET_IMAGE_RE);
    expect(firstPath).not.toBe(secondPath);
    expect(copyBundledAsset).toHaveBeenCalledWith("file:///tmp/sofa-icon.png", "sofa_icon.png");
    expect(pruneWidgetImages).toHaveBeenCalledWith(21600);
  });

  test("publishes a timeline even when one widget image download fails", async () => {
    continueWatching.mockResolvedValue({
      items: [
        {
          title: {
            id: "title-1",
            title: "The Pitt",
            backdropPath: "/fallback.jpg",
          },
          nextEpisode: {
            seasonNumber: 1,
            episodeNumber: 5,
            stillPath: "/bad.jpg",
          },
          watchedEpisodes: 4,
          totalEpisodes: 12,
        },
        {
          title: {
            id: "title-2",
            title: "Andor",
            backdropPath: "/backdrop-2.jpg",
          },
          nextEpisode: {
            seasonNumber: 2,
            episodeNumber: 1,
            stillPath: "/good.jpg",
          },
          watchedEpisodes: 8,
          totalEpisodes: 12,
        },
      ],
    });

    downloadWidgetImage.mockImplementation(async (url: string, key: string) => {
      if (url.includes("/bad.jpg")) {
        throw new Error("download failed");
      }
      return `file:///group/${key}`;
    });

    const { refreshWidgets } = await loadWidgetsModule();
    await refreshWidgets();

    const entries = continueWatchingWidget.updateTimeline.mock.calls[0]?.[0];
    expect(continueWatchingWidget.updateTimeline).toHaveBeenCalledTimes(1);
    expect(entries).toHaveLength(2);
    expect(entries[0]?.props?.imageFilePath).toBe("");
    expect(entries[1]?.props?.imageFilePath).toMatch(CACHED_WIDGET_IMAGE_RE);
  });

  test("passes the copied icon path into empty widget states", async () => {
    const { refreshWidgets } = await loadWidgetsModule();
    await refreshWidgets();

    expect(continueWatchingWidget.updateSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        iconFilePath: "file:///group/sofa_icon.png",
        titleName: "",
      }),
    );
    expect(upcomingWidget.updateSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        iconFilePath: "file:///group/sofa_icon.png",
        titleName: "",
      }),
    );
  });

  test("is a no-op outside iOS", async () => {
    platform.OS = "android";

    const { refreshWidgets } = await loadWidgetsModule();
    await refreshWidgets();

    expect(continueWatching).not.toHaveBeenCalled();
    expect(upcoming).not.toHaveBeenCalled();
    expect(downloadWidgetImage).not.toHaveBeenCalled();
    expect(copyBundledAsset).not.toHaveBeenCalled();
    expect(pruneWidgetImages).not.toHaveBeenCalled();
  });
});
