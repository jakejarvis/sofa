import { msg, plural } from "@lingui/core/macro";

import { client, orpc } from "@/lib/orpc";
import { queryClient } from "@/lib/query-client";
import { toast } from "@/lib/toast";
import { i18n } from "@sofa/i18n";

/** Invalidate title + dashboard queries. Used by most title mutations. */
export function invalidateTitleQueries() {
  queryClient.invalidateQueries({ queryKey: orpc.titles.key() });
  queryClient.invalidateQueries({ queryKey: orpc.dashboard.key() });
}

/**
 * Fire-and-forget title actions for context menus and simple onPress handlers.
 * Each method calls the RPC, shows a toast, and invalidates the relevant queries.
 */
export const titleActions = {
  async quickAdd(id: string, titleName?: string) {
    try {
      await client.titles.quickAdd({ id });
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

  async markWatching(id: string) {
    try {
      await client.titles.updateStatus({ id, status: "in_progress" });
      toast.success(i18n._(msg`Marked as watching`));
      invalidateTitleQueries();
    } catch {
      toast.error(i18n._(msg`Failed to update status`));
    }
  },

  async markCompleted(id: string, titleName?: string) {
    try {
      await client.titles.updateStatus({ id, status: "completed" });
      toast.success(
        titleName
          ? i18n._(msg`Marked "${titleName}" as completed`)
          : i18n._(msg`Marked as completed`),
      );
      invalidateTitleQueries();
    } catch {
      toast.error(i18n._(msg`Failed to update status`));
    }
  },

  async markMovieWatched(id: string, titleName?: string) {
    try {
      await client.titles.watchMovie({ id });
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
      await client.titles.updateStatus({ id, status: null });
      toast.success(i18n._(msg`Removed from library`));
      invalidateTitleQueries();
    } catch {
      toast.error(i18n._(msg`Failed to remove from library`));
    }
  },

  async rate(id: string, stars: number) {
    try {
      await client.titles.updateRating({ id, stars });
      toast.success(
        stars > 0
          ? i18n._(msg`Rated ${plural(stars, { one: "# star", other: "# stars" })}`)
          : i18n._(msg`Rating removed`),
      );
      queryClient.invalidateQueries({ queryKey: orpc.titles.key() });
    } catch {
      toast.error(i18n._(msg`Failed to update rating`));
    }
  },

  async watchEpisode(id: string) {
    try {
      await client.episodes.watch({ id });
      toast.success(i18n._(msg`Episode watched`));
      invalidateTitleQueries();
    } catch {
      toast.error(i18n._(msg`Failed to mark episode`));
    }
  },

  async unwatchEpisode(id: string) {
    try {
      await client.episodes.unwatch({ id });
      toast.success(i18n._(msg`Episode unwatched`));
      invalidateTitleQueries();
    } catch {
      toast.error(i18n._(msg`Failed to unmark episode`));
    }
  },

  async watchSeason(id: string, seasonName?: string) {
    try {
      await client.seasons.watch({ id });
      toast.success(
        seasonName ? i18n._(msg`Watched all of ${seasonName}`) : i18n._(msg`Season watched`),
      );
      invalidateTitleQueries();
    } catch {
      toast.error(i18n._(msg`Failed to mark some episodes`));
    }
  },
};
