import { client, orpc } from "@/lib/orpc";
import { queryClient } from "@/lib/query-client";
import { toast } from "@/lib/toast";

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
        titleName ? `Added "${titleName}" to watchlist` : "Added to watchlist",
      );
      invalidateTitleQueries();
    } catch {
      toast.error("Failed to add to watchlist");
      // Refetch so any optimistic local status reverts on failure
      queryClient.invalidateQueries({ queryKey: orpc.titles.key() });
    }
  },

  async markWatching(id: string) {
    try {
      await client.titles.updateStatus({ id, status: "in_progress" });
      toast.success("Marked as watching");
      invalidateTitleQueries();
    } catch {
      toast.error("Failed to update status");
    }
  },

  async markCompleted(id: string, titleName?: string) {
    try {
      await client.titles.updateStatus({ id, status: "completed" });
      toast.success(
        titleName
          ? `Marked "${titleName}" as completed`
          : "Marked as completed",
      );
      invalidateTitleQueries();
    } catch {
      toast.error("Failed to update status");
    }
  },

  async markMovieWatched(id: string, titleName?: string) {
    try {
      await client.titles.watchMovie({ id });
      toast.success(
        titleName ? `Marked "${titleName}" as watched` : "Marked as watched",
      );
      invalidateTitleQueries();
    } catch {
      toast.error("Failed to mark as watched");
    }
  },

  async removeFromLibrary(id: string) {
    try {
      await client.titles.updateStatus({ id, status: null });
      toast.success("Removed from library");
      invalidateTitleQueries();
    } catch {
      toast.error("Failed to remove from library");
    }
  },

  async rate(id: string, stars: number) {
    try {
      await client.titles.updateRating({ id, stars });
      toast.success(
        stars > 0
          ? `Rated ${stars} star${stars > 1 ? "s" : ""}`
          : "Rating removed",
      );
      queryClient.invalidateQueries({ queryKey: orpc.titles.key() });
    } catch {
      toast.error("Failed to update rating");
    }
  },

  async watchEpisode(id: string) {
    try {
      await client.episodes.watch({ id });
      toast.success("Episode watched");
      invalidateTitleQueries();
    } catch {
      toast.error("Failed to mark episode");
    }
  },

  async unwatchEpisode(id: string) {
    try {
      await client.episodes.unwatch({ id });
      toast.success("Episode unwatched");
      invalidateTitleQueries();
    } catch {
      toast.error("Failed to unmark episode");
    }
  },

  async watchSeason(id: string, seasonName?: string) {
    try {
      await client.seasons.watch({ id });
      toast.success(
        seasonName ? `Watched all of ${seasonName}` : "Season watched",
      );
      invalidateTitleQueries();
    } catch {
      toast.error("Failed to mark some episodes");
    }
  },
};
