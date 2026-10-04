import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const CACHED_WIDGET_IMAGE_RE = /^file:\/\/\/group\/cw_/;
type LibraryResult = { items: Array<Record<string, unknown>> };
type SnapshotProps = Record<string, unknown>;
type TimelineEntry = { date?: Date; props?: Record<string, unknown> };

const platform = { OS: "ios" };
const resolveAssetSource = vi.fn<() => { uri: string }>(() => ({
  uri: "file:///tmp/sofa-icon.png",
}));
const continueWatching = vi.fn<() => Promise<LibraryResult>>();
const upcoming = vi.fn<() => Promise<LibraryResult>>();
const downloadWidgetImage = vi.fn<(url: string, key: string) => Promise<string>>(
  async (_url: string, key: string) => `file:///group/${key}`,
);
const copyBundledAsset = vi.fn<(assetUri: string, key: string) => Promise<string>>(
  async (_assetUri: string, key: string) => `file:///group/${key}`,
);
const pruneWidgetImages = vi.fn<() => Promise<void>>(async () => undefined);
const clearWidgetImages = vi.fn<() => Promise<void>>(async () => undefined);
const getWidgetIconAsset = vi.fn<() => string>(() => "widget-icon-asset");

const continueWatchingWidget = {
  updateSnapshot: vi.fn<(props: SnapshotProps) => void>(),
  updateTimeline: vi.fn<(entries: TimelineEntry[]) => void>(),
};

const upcomingWidget = {
  updateSnapshot: vi.fn<(props: SnapshotProps) => void>(),
  updateTimeline: vi.fn<(entries: TimelineEntry[]) => void>(),
};

vi.mock("react-native", () => ({
  Image: {
    resolveAssetSource,
  },
  Platform: platform,
}));

vi.mock("@sofa/i18n", () => ({
  i18n: {
    locale: "en",
    _: (descriptor: { id?: string; message?: string } | string) =>
      typeof descriptor === "string" ? descriptor : (descriptor.message ?? descriptor.id ?? ""),
  },
}));

vi.mock("@lingui/core/macro", () => ({
  msg: (strings: TemplateStringsArray, ...values: unknown[]) => ({
    id: String.raw(strings, ...values),
    message: String.raw(strings, ...values),
  }),
  plural: (value: number, forms: { one: string; other: string }) =>
    (value === 1 ? forms.one : forms.other).replace("#", String(value)),
}));

vi.mock("@/lib/widget-assets", () => ({
  getWidgetIconAsset,
}));

vi.mock("@/lib/orpc", () => ({
  client: {
    library: {
      continueWatching,
      upcoming,
    },
  },
}));

vi.mock("@/lib/server", () => ({
  resolveUrl: (path: string | null) => (path ? `https://sofa.test${path}` : null),
}));

vi.mock("../../modules/sofa-widgets-support", () => ({
  clearWidgetImages,
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
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
  clearWidgetImages.mockResolvedValue(undefined);
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

    upcoming.mockResolvedValue({
      items: [
        {
          titleId: "show-1",
          titleName: "A Show",
          titleType: "tv",
          date: "2026-03-30",
          seasonNumber: 1,
          episodeNumber: 2,
          episodeCount: 1,
          backdropPath: "/bad-backdrop.jpg",
          posterPath: "/poster.jpg",
        },
      ],
    });

    downloadWidgetImage.mockImplementation(async (url: string, key: string) => {
      if (url.includes("/bad")) {
        throw new Error("download failed");
      }
      return `file:///group/${key}`;
    });

    const { refreshWidgets } = await loadWidgetsModule();
    await refreshWidgets();

    // The first item's episode still fails, so it falls back to the show's backdrop.
    const entries = continueWatchingWidget.updateTimeline.mock.calls[0]?.[0];
    expect(continueWatchingWidget.updateTimeline).toHaveBeenCalledTimes(1);
    expect(entries).toHaveLength(25);
    expect(entries[0]?.props?.imageFilePath).toMatch(CACHED_WIDGET_IMAGE_RE);
    expect(entries[1]?.props?.imageFilePath).toMatch(CACHED_WIDGET_IMAGE_RE);
    expect(downloadWidgetImage).toHaveBeenCalledWith(
      "https://sofa.test/bad.jpg",
      expect.any(String),
    );
    expect(downloadWidgetImage).toHaveBeenCalledWith(
      "https://sofa.test/fallback.jpg",
      expect.any(String),
    );

    // Upcoming falls back from a failed backdrop to the poster.
    const upcomingEntries = upcomingWidget.updateTimeline.mock.calls[0]?.[0];
    expect(upcomingEntries[0]?.props?.imageFilePath).toMatch(/^file:\/\/\/group\/up_/);
    expect(downloadWidgetImage).toHaveBeenCalledWith(
      "https://sofa.test/poster.jpg",
      expect.any(String),
    );
  });

  test("leaves the image empty when every artwork candidate fails", async () => {
    continueWatching.mockResolvedValue({
      items: [
        {
          title: { id: "title-1", title: "The Pitt", backdropPath: "/backdrop.jpg" },
          nextEpisode: { seasonNumber: 1, episodeNumber: 5, stillPath: "/still.jpg" },
          watchedEpisodes: 4,
          totalEpisodes: 12,
        },
      ],
    });
    upcoming.mockResolvedValue({
      items: [
        {
          titleId: "show-1",
          titleName: "A Show",
          titleType: "tv",
          date: "2026-03-30",
          seasonNumber: 1,
          episodeNumber: 2,
          episodeCount: 1,
          backdropPath: "/up-backdrop.jpg",
          posterPath: "/up-poster.jpg",
        },
      ],
    });
    downloadWidgetImage.mockRejectedValue(new Error("download failed"));

    const { refreshWidgets } = await loadWidgetsModule();
    await refreshWidgets();

    const entries = continueWatchingWidget.updateTimeline.mock.calls[0]?.[0];
    expect(entries[0]?.props).toMatchObject({ titleName: "The Pitt", imageFilePath: "" });
    const upcomingEntries = upcomingWidget.updateTimeline.mock.calls[0]?.[0];
    expect(upcomingEntries[0]?.props).toMatchObject({ titleName: "A Show", imageFilePath: "" });
    // Every candidate was tried before giving up.
    expect(downloadWidgetImage).toHaveBeenCalledTimes(4);
  });

  test("passes the copied icon path into empty widget states", async () => {
    const { refreshWidgets } = await loadWidgetsModule();
    await refreshWidgets();

    expect(continueWatchingWidget.updateSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        iconFilePath: "file:///group/sofa_icon.png",
        titleName: "",
        emptyLabel: "Nothing to watch",
      }),
    );
    expect(upcomingWidget.updateSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        iconFilePath: "file:///group/sofa_icon.png",
        titleName: "",
        emptyLabel: "Nothing upcoming",
      }),
    );
  });

  test("gives Continue Watching a localized episode code and no raw season/episode props", async () => {
    continueWatching.mockResolvedValue({
      items: [
        {
          title: { id: "title-1", title: "Severance", backdropPath: "/backdrop-1.jpg" },
          nextEpisode: { seasonNumber: 2, episodeNumber: 3, stillPath: "/still-1.jpg" },
          watchedEpisodes: 2,
          totalEpisodes: 10,
        },
      ],
    });

    const { refreshWidgets } = await loadWidgetsModule();
    await refreshWidgets();

    const entries = continueWatchingWidget.updateTimeline.mock.calls[0]?.[0];
    expect(entries).toHaveLength(1);
    expect(entries[0]?.props).toMatchObject({
      titleId: "title-1",
      titleName: "Severance",
      episodeLabel: "S2 E3",
      watchedEpisodes: 2,
      totalEpisodes: 10,
      emptyLabel: "",
    });
    expect(entries[0]?.props).not.toHaveProperty("seasonNumber");
    expect(entries[0]?.props).not.toHaveProperty("episodeNumber");
    expect(entries[0]?.props).not.toHaveProperty("isMovie");
  });

  test("writes an Upcoming timeline that advances with the calendar and ends empty", async () => {
    // Local time, so the Today/Tomorrow boundaries don't depend on the machine's timezone.
    vi.setSystemTime(new Date(2026, 2, 24, 12));
    upcoming.mockResolvedValue({
      items: [
        {
          titleId: "movie-1",
          titleName: "A Movie",
          titleType: "movie",
          date: "2026-03-24",
          episodeCount: 1,
          backdropPath: "/a.jpg",
        },
        {
          titleId: "show-1",
          titleName: "A Show",
          titleType: "tv",
          date: "2026-03-26",
          seasonNumber: 2,
          episodeNumber: 1,
          episodeCount: 8,
          backdropPath: "/b.jpg",
        },
        {
          titleId: "show-2",
          titleName: "Another Show",
          titleType: "tv",
          date: "2026-04-10",
          seasonNumber: 1,
          episodeNumber: 4,
          episodeCount: 1,
          backdropPath: "/c.jpg",
        },
      ],
    });

    const { refreshWidgets } = await loadWidgetsModule();
    await refreshWidgets();

    const entries = upcomingWidget.updateTimeline.mock.calls[0]?.[0];
    expect(entries).toHaveLength(7);
    expect(entries.map((entry) => entry.props?.dateLabel)).toEqual([
      "Today",
      "Tomorrow",
      "Today",
      "Apr 10",
      "Tomorrow",
      "Today",
      "",
    ]);
    expect(entries.map((entry) => entry.props?.titleId)).toEqual([
      "movie-1",
      "show-1",
      "show-1",
      "show-2",
      "show-2",
      "show-2",
      "",
    ]);
    expect(entries.map((entry) => entry.props?.episodeLabel)).toEqual([
      "Movie",
      "S2 · 8 episodes",
      "S2 · 8 episodes",
      "S1 E4",
      "S1 E4",
      "S1 E4",
      "",
    ]);

    const last = entries[6]?.props;
    expect(last?.titleName).toBe("");
    expect(last?.emptyLabel).toBe("Nothing upcoming");
    expect(entries[6]?.date).toEqual(new Date(2026, 3, 11));

    // Each item's artwork is downloaded once, however many entries show it.
    expect(downloadWidgetImage).toHaveBeenCalledTimes(3);
    expect(entries[1]?.props?.imageFilePath).toBe(entries[2]?.props?.imageFilePath);
    expect(upcomingWidget.updateSnapshot).not.toHaveBeenCalled();
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

describe("resetWidgets", () => {
  test("clears cached images and writes empty snapshots", async () => {
    const { resetWidgets } = await loadWidgetsModule();
    await resetWidgets();

    expect(clearWidgetImages).toHaveBeenCalledTimes(1);
    expect(continueWatchingWidget.updateSnapshot).toHaveBeenCalledTimes(1);
    expect(upcomingWidget.updateSnapshot).toHaveBeenCalledTimes(1);
    expect(continueWatchingWidget.updateSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ titleId: "", iconFilePath: "file:///group/sofa_icon.png" }),
    );
    expect(upcomingWidget.updateSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ titleId: "", iconFilePath: "file:///group/sofa_icon.png" }),
    );
    expect(continueWatching).not.toHaveBeenCalled();
    expect(upcoming).not.toHaveBeenCalled();
    // The icon lives in the cleared directory, so it must be copied again afterwards.
    expect(clearWidgetImages.mock.invocationCallOrder[0]).toBeLessThan(
      copyBundledAsset.mock.invocationCallOrder[0]!,
    );
  });

  test("is a no-op outside iOS", async () => {
    platform.OS = "android";

    const { resetWidgets } = await loadWidgetsModule();
    await resetWidgets();

    expect(clearWidgetImages).not.toHaveBeenCalled();
    expect(copyBundledAsset).not.toHaveBeenCalled();
    expect(continueWatchingWidget.updateSnapshot).not.toHaveBeenCalled();
    expect(upcomingWidget.updateSnapshot).not.toHaveBeenCalled();
    expect(continueWatching).not.toHaveBeenCalled();
    expect(upcoming).not.toHaveBeenCalled();
  });
});

describe("widget refresh ordering", () => {
  const watchingItem = {
    title: { id: "title-1", title: "Severance", backdropPath: "/backdrop-1.jpg" },
    nextEpisode: { seasonNumber: 2, episodeNumber: 3, stillPath: "/still-1.jpg" },
    watchedEpisodes: 2,
    totalEpisodes: 10,
  };

  test("a reset waits for an in-flight refresh instead of being overwritten by it", async () => {
    const pending = deferred<LibraryResult>();
    continueWatching.mockReturnValueOnce(pending.promise);

    const { refreshWidgets, resetWidgets } = await loadWidgetsModule();
    const refresh = refreshWidgets();
    const reset = resetWidgets();

    pending.resolve({ items: [watchingItem] });
    await Promise.all([refresh, reset]);

    expect(continueWatchingWidget.updateTimeline).toHaveBeenCalledTimes(1);
    expect(clearWidgetImages.mock.invocationCallOrder[0]).toBeGreaterThan(
      continueWatchingWidget.updateTimeline.mock.invocationCallOrder[0]!,
    );
    expect(continueWatchingWidget.updateSnapshot).toHaveBeenLastCalledWith(
      expect.objectContaining({ titleName: "" }),
    );
  });

  test("refresh requests made while one is waiting share it", async () => {
    const { refreshWidgets } = await loadWidgetsModule();

    const first = refreshWidgets();
    const second = refreshWidgets();
    const third = refreshWidgets();

    expect(second).toBe(first);
    expect(third).toBe(first);
    await first;
    expect(continueWatching).toHaveBeenCalledTimes(1);
  });

  test("a request during a running refresh queues exactly one more", async () => {
    const pending = deferred<LibraryResult>();
    continueWatching.mockReturnValueOnce(pending.promise);

    const { refreshWidgets } = await loadWidgetsModule();
    const running = refreshWidgets();
    await vi.waitFor(() => expect(continueWatching).toHaveBeenCalledTimes(1));

    const queued = refreshWidgets();
    const alsoQueued = refreshWidgets();
    expect(queued).not.toBe(running);
    expect(alsoQueued).toBe(queued);

    pending.resolve({ items: [] });
    await Promise.all([running, queued, alsoQueued]);

    expect(continueWatching).toHaveBeenCalledTimes(2);
  });

  test("does not prune cached images after a widget fails to refresh", async () => {
    upcoming.mockRejectedValue(new Error("offline"));

    const { refreshWidgets } = await loadWidgetsModule();
    await refreshWidgets();

    expect(pruneWidgetImages).not.toHaveBeenCalled();
  });
});

describe("buildRotationTimeline", () => {
  const HALF_HOUR_MS = 30 * 60 * 1000;
  const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

  test("returns nothing for no items and a single entry for one item", async () => {
    const { buildRotationTimeline } = await loadWidgetsModule();

    expect(buildRotationTimeline([], 0)).toEqual([]);
    expect(buildRotationTimeline(["a"], 0)).toEqual([{ date: new Date(0), item: "a" }]);
  });

  test("cycles through the items for 12 hours, then rests on the first", async () => {
    const { buildRotationTimeline } = await loadWidgetsModule();
    const entries = buildRotationTimeline(["a", "b", "c"], 0);

    expect(entries).toHaveLength(25);
    expect(entries.slice(0, 6).map((entry) => entry.item)).toEqual(["a", "b", "c", "a", "b", "c"]);
    expect(entries[1]?.date.getTime()).toBe(HALF_HOUR_MS);
    expect(entries.at(-1)?.item).toBe("a");
    expect(entries.at(-1)?.date.getTime()).toBe(TWELVE_HOURS_MS);
    for (let i = 1; i < entries.length; i += 1) {
      expect(entries[i]!.date.getTime()).toBeGreaterThan(entries[i - 1]!.date.getTime());
    }
  });
});

describe("buildUpcomingTimeline", () => {
  test("adds an entry at each local midnight where the item or its label changes", async () => {
    const { buildUpcomingTimeline } = await loadWidgetsModule();
    const now = new Date(2026, 2, 24, 12);
    const [a, b, c] = [
      { id: "a", date: "2026-03-24" },
      { id: "b", date: "2026-03-26" },
      { id: "c", date: "2026-04-10" },
    ];

    const entries = buildUpcomingTimeline([a, b, c], now);

    expect(entries.map((entry) => entry.date)).toEqual([
      now,
      new Date(2026, 2, 25),
      new Date(2026, 2, 26),
      new Date(2026, 2, 27),
      new Date(2026, 3, 9),
      new Date(2026, 3, 10),
      new Date(2026, 3, 11),
    ]);
    expect(entries.map((entry) => entry.item)).toEqual([a, b, b, c, c, c, null]);
  });

  test("is a single empty entry when there is nothing upcoming", async () => {
    const { buildUpcomingTimeline } = await loadWidgetsModule();
    const now = new Date(2026, 2, 24, 12);

    expect(buildUpcomingTimeline([], now)).toEqual([{ date: now, item: null }]);
  });
});
