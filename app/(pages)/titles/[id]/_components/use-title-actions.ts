"use client";

import { useStore } from "jotai";
import { useCallback } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import {
  episodeWatchesAtom,
  seasonsAtom,
  titleIdAtom,
  titleNameAtom,
  userRatingAtom,
  userStatusAtom,
  watchingEpAtom,
} from "@/lib/atoms/title";
import type { Season } from "@/lib/types";

export function useTitleActions() {
  const store = useStore();

  const catchUp = useCallback(
    async (episodeIds: string[]) => {
      const currentWatches = store.get(episodeWatchesAtom);
      const prevStatus = store.get(userStatusAtom);
      const newWatchSet = new Set(currentWatches);
      for (const id of episodeIds) newWatchSet.add(id);
      store.set(episodeWatchesAtom, [...newWatchSet]);

      const seasons = store.get(seasonsAtom);
      const allEpIds = seasons.flatMap((s) => s.episodes.map((ep) => ep.id));
      if (allEpIds.every((id) => newWatchSet.has(id))) {
        store.set(userStatusAtom, "completed");
      }

      try {
        await api("/episodes/batch-watch", {
          method: "POST",
          body: JSON.stringify({ episodeIds }),
        });
        toast.success(
          `Caught up — marked ${episodeIds.length} episode${episodeIds.length > 1 ? "s" : ""} as watched`,
        );
      } catch {
        store.set(episodeWatchesAtom, currentWatches);
        store.set(userStatusAtom, prevStatus);
        toast.error("Failed to catch up");
      }
    },
    [store],
  );

  const handleStatusChange = useCallback(
    async (status: string | null) => {
      const prev = store.get(userStatusAtom);
      const titleId = store.get(titleIdAtom);
      store.set(
        userStatusAtom,
        status === "watchlist" ? "in_progress" : status,
      );
      try {
        await api(`/titles/${titleId}/status`, {
          method: "PUT",
          body: JSON.stringify({ status: status ? "in_progress" : null }),
        });
        toast.success(status ? "Added to watchlist" : "Removed from library");
      } catch {
        store.set(userStatusAtom, prev);
        toast.error("Failed to update status");
      }
    },
    [store],
  );

  const handleRating = useCallback(
    async (ratingStars: number) => {
      const prev = store.get(userRatingAtom);
      const titleId = store.get(titleIdAtom);
      store.set(userRatingAtom, ratingStars);
      try {
        await api(`/titles/${titleId}/rating`, {
          method: "PUT",
          body: JSON.stringify({ stars: ratingStars }),
        });
        toast.success(
          ratingStars > 0
            ? `Rated ${ratingStars} star${ratingStars > 1 ? "s" : ""}`
            : "Rating removed",
        );
      } catch {
        store.set(userRatingAtom, prev);
        toast.error("Failed to update rating");
      }
    },
    [store],
  );

  const handleWatchMovie = useCallback(async () => {
    const prev = store.get(userStatusAtom);
    const titleId = store.get(titleIdAtom);
    const titleName = store.get(titleNameAtom);
    store.set(userStatusAtom, "completed");
    try {
      await api(`/titles/${titleId}/watch`, { method: "POST" });
      toast.success(`Marked "${titleName}" as watched`);
    } catch {
      store.set(userStatusAtom, prev);
      toast.error("Failed to mark as watched");
    }
  }, [store]);

  const handleWatchEpisode = useCallback(
    async (
      episodeId: string,
      seasonNum: number,
      epNum: number,
      isWatched: boolean,
    ) => {
      store.set(watchingEpAtom, episodeId);

      if (isWatched) {
        const prevStatus = store.get(userStatusAtom);
        store.set(
          episodeWatchesAtom,
          store.get(episodeWatchesAtom).filter((id) => id !== episodeId),
        );
        if (prevStatus === "completed")
          store.set(userStatusAtom, "in_progress");

        try {
          await api(`/episodes/${episodeId}/watch`, { method: "DELETE" });
          toast.success(`Unwatched S${seasonNum} E${epNum}`);
        } catch {
          const w = store.get(episodeWatchesAtom);
          if (!w.includes(episodeId))
            store.set(episodeWatchesAtom, [...w, episodeId]);
          store.set(userStatusAtom, prevStatus);
          toast.error("Failed to unmark episode");
        }
      } else {
        const currentWatches = store.get(episodeWatchesAtom);
        const prevStatus = store.get(userStatusAtom);
        if (!currentWatches.includes(episodeId)) {
          store.set(episodeWatchesAtom, [...currentWatches, episodeId]);
        }
        if (prevStatus === null || prevStatus === "watchlist") {
          store.set(userStatusAtom, "in_progress");
        }

        try {
          await api(`/episodes/${episodeId}/watch`, { method: "POST" });

          const seasons = store.get(seasonsAtom);
          const watchedSet = new Set(store.get(episodeWatchesAtom));
          const previousUnwatched: string[] = [];
          for (const s of seasons) {
            for (const ep of s.episodes) {
              if (
                s.seasonNumber < seasonNum ||
                (s.seasonNumber === seasonNum && ep.episodeNumber < epNum)
              ) {
                if (!watchedSet.has(ep.id) && ep.id !== episodeId) {
                  previousUnwatched.push(ep.id);
                }
              }
            }
          }

          if (previousUnwatched.length > 0) {
            const count = previousUnwatched.length;
            toast.success(`Watched S${seasonNum} E${epNum}`, {
              description: `${count} earlier episode${count > 1 ? "s" : ""} unwatched`,
              action: {
                label: "Catch up",
                onClick: () => catchUp(previousUnwatched),
              },
              duration: 8000,
            });
          } else {
            toast.success(`Watched S${seasonNum} E${epNum}`);
          }
        } catch {
          store.set(
            episodeWatchesAtom,
            store.get(episodeWatchesAtom).filter((id) => id !== episodeId),
          );
          store.set(userStatusAtom, prevStatus);
          toast.error("Failed to mark episode");
        }
      }

      store.set(watchingEpAtom, null);
    },
    [store, catchUp],
  );

  const handleMarkSeason = useCallback(
    async (season: Season) => {
      const prevWatches = store.get(episodeWatchesAtom);
      const prevStatus = store.get(userStatusAtom);
      const watchedSet = new Set(prevWatches);
      const unwatched = season.episodes.filter((ep) => !watchedSet.has(ep.id));
      if (unwatched.length === 0) return;

      const newWatchSet = new Set(watchedSet);
      for (const ep of unwatched) newWatchSet.add(ep.id);
      store.set(episodeWatchesAtom, [...newWatchSet]);

      const seasons = store.get(seasonsAtom);
      const allEpIds = seasons.flatMap((s) => s.episodes.map((ep) => ep.id));
      if (allEpIds.every((id) => newWatchSet.has(id))) {
        store.set(userStatusAtom, "completed");
      } else {
        const status = store.get(userStatusAtom);
        if (status === null || status === "watchlist") {
          store.set(userStatusAtom, "in_progress");
        }
      }

      try {
        await api(`/seasons/${season.id}/watch`, { method: "POST" });

        const seasons = store.get(seasonsAtom);
        const currentWatchSet = new Set(store.get(episodeWatchesAtom));
        const previousUnwatched: string[] = [];
        for (const s of seasons) {
          if (s.seasonNumber < season.seasonNumber) {
            for (const ep of s.episodes) {
              if (!currentWatchSet.has(ep.id)) {
                previousUnwatched.push(ep.id);
              }
            }
          }
        }

        const seasonLabel = season.name ?? `Season ${season.seasonNumber}`;
        if (previousUnwatched.length > 0) {
          const count = previousUnwatched.length;
          toast.success(`Watched all of ${seasonLabel}`, {
            description: `${count} earlier episode${count > 1 ? "s" : ""} unwatched`,
            action: {
              label: "Catch up",
              onClick: () => catchUp(previousUnwatched),
            },
            duration: 8000,
          });
        } else {
          toast.success(`Watched all of ${seasonLabel}`);
        }
      } catch {
        store.set(episodeWatchesAtom, prevWatches);
        store.set(userStatusAtom, prevStatus);
        toast.error("Failed to mark some episodes");
      }
    },
    [store, catchUp],
  );

  const handleUnmarkSeason = useCallback(
    async (season: Season) => {
      const prevWatches = store.get(episodeWatchesAtom);
      const prevStatus = store.get(userStatusAtom);
      const seasonEpIds = new Set(season.episodes.map((ep) => ep.id));
      store.set(
        episodeWatchesAtom,
        store.get(episodeWatchesAtom).filter((id) => !seasonEpIds.has(id)),
      );
      const status = store.get(userStatusAtom);
      if (status === "completed") store.set(userStatusAtom, "in_progress");

      try {
        await api(`/seasons/${season.id}/watch`, { method: "DELETE" });
        toast.success(
          `Unwatched all of ${season.name ?? `Season ${season.seasonNumber}`}`,
        );
      } catch {
        store.set(episodeWatchesAtom, prevWatches);
        store.set(userStatusAtom, prevStatus);
        toast.error("Failed to unmark some episodes");
      }
    },
    [store],
  );

  const handleMarkAllWatched = useCallback(async () => {
    const titleId = store.get(titleIdAtom);
    const prevStatus = store.get(userStatusAtom);
    const prevWatches = store.get(episodeWatchesAtom);
    const seasons = store.get(seasonsAtom);
    const allEpIds = seasons.flatMap((s) => s.episodes.map((ep) => ep.id));
    store.set(episodeWatchesAtom, allEpIds);
    store.set(userStatusAtom, "completed");
    try {
      await api(`/titles/${titleId}/watch-all`, { method: "POST" });
      toast.success("Marked all episodes as watched");
    } catch {
      store.set(userStatusAtom, prevStatus);
      store.set(episodeWatchesAtom, prevWatches);
      toast.error("Failed to mark all episodes as watched");
    }
  }, [store]);

  return {
    handleStatusChange,
    handleRating,
    handleWatchMovie,
    handleWatchEpisode,
    handleMarkSeason,
    handleUnmarkSeason,
    handleMarkAllWatched,
  };
}
