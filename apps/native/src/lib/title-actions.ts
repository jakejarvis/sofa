import { msg, plural } from "@lingui/core/macro";

import { client, orpc } from "@/lib/orpc";
import { queryClient } from "@/lib/query-client";
import { toast } from "@/lib/toast";
import { refreshWidgets } from "@/lib/widgets";
import { i18n } from "@sofa/i18n";

let widgetRefreshTimer: ReturnType<typeof setTimeout> | null = null;

/** Invalidate title + tracking + library queries. Used by most title mutations. */
export function invalidateTitleQueries() {
  queryClient.invalidateQueries({ queryKey: orpc.titles.key() });
  queryClient.invalidateQueries({ queryKey: orpc.tracking.key() });
  queryClient.invalidateQueries({ queryKey: orpc.library.key() });

  // Debounce widget refresh to batch rapid mutations (e.g. watching multiple episodes)
  if (widgetRefreshTimer) clearTimeout(widgetRefreshTimer);
  widgetRefreshTimer = setTimeout(() => {
    void refreshWidgets();
    widgetRefreshTimer = null;
  }, 2000);
}

/**
 * Fire-and-forget title actions for context menus and simple onPress handlers.
 * Each method calls the RPC, shows a toast, and invalidates the relevant queries.
 */
export const titleActions = {
  async addToWatchlist(id: string, titleName?: string) {
    try {
      await client.tracking.updateStatus({ id, status: "watchlist" });
      toast.success(
        titleName
          ? i18n._(msg`Added "${titleName}" to watchlist`)
          : i18n._(msg`Added to watchlist`),
      );
      invalidateTitleQueries();
    } catch {
      toast.error(i18n._(msg`Failed to add to watchlist`));
      // Refetch so any optimistic local status reverts on failure
      queryClient.invalidateQueries({ queryKey: orpc.titles.key() });
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
