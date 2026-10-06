import { msg, plural } from "@lingui/core/macro";

import { client, orpc } from "@/lib/orpc";
import { queryClient } from "@/lib/query-client";
import { toast } from "@/lib/toast";
import { refreshWidgets } from "@/lib/widgets";
import { trackingDerivedQueryKeys, trackingStateQueryKeys } from "@sofa/api/query-keys";
import { i18n } from "@sofa/i18n";

let widgetRefreshTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Mark every query that depends on the user's tracking state as stale — the shared
 * `trackingStateQueryKeys` and `trackingDerivedQueryKeys` lists from `@sofa/api/query-keys`.
 * Title details (`titles.get`) are excluded — they don't depend on tracking (same rule as the
 * web's invalidateTrackingQueries). Derived queries are fire-and-forget; resolves once the
 * tracking-state queries (tracking + library) have refetched, so mutations can stay pending
 * until the UI reflects the change.
 */
export function invalidateTitleQueries(): Promise<unknown> {
  for (const queryKey of trackingDerivedQueryKeys(orpc)) {
    void queryClient.invalidateQueries({ queryKey });
  }

  // Debounce widget refresh to batch rapid mutations (e.g. watching multiple episodes)
  if (widgetRefreshTimer) clearTimeout(widgetRefreshTimer);
  widgetRefreshTimer = setTimeout(() => {
    void refreshWidgets();
    widgetRefreshTimer = null;
  }, 2000);

  return Promise.all(
    trackingStateQueryKeys(orpc).map((queryKey) => queryClient.invalidateQueries({ queryKey })),
  );
}

/**
 * Fire-and-forget title actions for context menus and simple onPress handlers.
 * Each method calls the RPC, shows a toast, and invalidates the relevant queries.
 */
export const titleActions = {
  async addToWatchlist(id: string, titleName?: string) {
    try {
      const result = await client.tracking.updateStatus({ id, status: "watchlist" });
      if (result.alreadyAdded) {
        toast.info(
          titleName
            ? i18n._(msg`"${titleName}" is already in your library`)
            : i18n._(msg`Already in your library`),
        );
      } else {
        toast.success(
          titleName
            ? i18n._(msg`Added "${titleName}" to watchlist`)
            : i18n._(msg`Added to watchlist`),
        );
      }
      invalidateTitleQueries();
    } catch {
      toast.error(i18n._(msg`Failed to add to watchlist`));
      // Refetch so any optimistic local status reverts on failure
      queryClient.invalidateQueries({ queryKey: orpc.tracking.key() });
    }
  },

  async markMovieWatched(id: string, titleName?: string) {
    try {
      await client.tracking.watch({ scope: "movie", ids: [id] });
      toast.success(
        titleName ? i18n._(msg`Marked "${titleName}" as watched`) : i18n._(msg`Marked as watched`),
      );
      invalidateTitleQueries();
    } catch {
      toast.error(i18n._(msg`Failed to mark as watched`));
    }
  },

  async unwatchMovie(id: string, titleName?: string) {
    try {
      await client.tracking.unwatch({ scope: "movie", ids: [id] });
      toast.success(
        titleName
          ? i18n._(msg`Marked "${titleName}" as unwatched`)
          : i18n._(msg`Marked as unwatched`),
      );
      invalidateTitleQueries();
    } catch {
      toast.error(i18n._(msg`Failed to mark as unwatched`));
    }
  },

  async removeFromLibrary(id: string) {
    try {
      await client.tracking.updateStatus({ id, status: null });
      toast.success(i18n._(msg`Removed from library`));
      invalidateTitleQueries();
    } catch {
      toast.error(i18n._(msg`Failed to remove from library`));
    }
  },

  async rate(id: string, stars: number) {
    try {
      await client.tracking.rate({ id, stars });
      toast.success(
        stars > 0
          ? i18n._(msg`Rated ${plural(stars, { one: "# star", other: "# stars" })}`)
          : i18n._(msg`Rating removed`),
      );
      invalidateTitleQueries();
    } catch {
      toast.error(i18n._(msg`Failed to update rating`));
    }
  },

  async watchEpisode(id: string) {
    try {
      await client.tracking.watch({ scope: "episode", ids: [id] });
      toast.success(i18n._(msg`Episode watched`));
      invalidateTitleQueries();
    } catch {
      toast.error(i18n._(msg`Failed to mark episode`));
    }
  },

  async unwatchEpisode(id: string) {
    try {
      await client.tracking.unwatch({ scope: "episode", ids: [id] });
      toast.success(i18n._(msg`Episode unwatched`));
      invalidateTitleQueries();
    } catch {
      toast.error(i18n._(msg`Failed to unmark episode`));
    }
  },

  async markAllWatched(id: string, titleName?: string) {
    try {
      await client.tracking.watch({ scope: "series", ids: [id] });
      toast.success(
        titleName
          ? i18n._(msg`Marked all episodes of "${titleName}" as watched`)
          : i18n._(msg`Marked all episodes as watched`),
      );
      invalidateTitleQueries();
    } catch {
      toast.error(i18n._(msg`Failed to mark all episodes as watched`));
    }
  },

  async watchSeason(id: string, seasonLabel?: string) {
    try {
      await client.tracking.watch({ scope: "season", ids: [id] });
      toast.success(
        seasonLabel ? i18n._(msg`Watched all of ${seasonLabel}`) : i18n._(msg`Season watched`),
      );
      invalidateTitleQueries();
    } catch {
      toast.error(i18n._(msg`Failed to mark some episodes`));
    }
  },
};
