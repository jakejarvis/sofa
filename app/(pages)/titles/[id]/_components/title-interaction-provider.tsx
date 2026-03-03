"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import type { Season } from "@/lib/types/title";
import {
  batchWatchEpisodes,
  markAllWatchedAction,
  unwatchEpisodeAction,
  unwatchSeasonAction,
  updateTitleRating,
  updateTitleStatus,
  watchEpisode,
  watchMovie,
  watchSeason,
} from "./actions";

interface TitleInteractionState {
  titleId: string;
  titleType: "movie" | "tv";
  titleName: string;
  userStatus: string | null;
  userRating: number;
  episodeWatches: string[];
  seasons: Season[];
  handleStatusChange: (status: string | null) => void;
  handleRating: (ratingStars: number) => void;
  handleWatchMovie: () => void;
  handleWatchEpisode: (
    episodeId: string,
    seasonNum: number,
    epNum: number,
    isWatched: boolean,
  ) => void;
  handleMarkSeason: (season: Season) => void;
  handleUnmarkSeason: (season: Season) => void;
  handleMarkAllWatched: () => void;
  watchingEp: string | null;
}

const TitleInteractionContext = createContext<TitleInteractionState | null>(
  null,
);

export function useTitleInteraction() {
  const ctx = useContext(TitleInteractionContext);
  if (!ctx)
    throw new Error(
      "useTitleInteraction must be used within TitleInteractionProvider",
    );
  return ctx;
}

export function TitleInteractionProvider({
  titleId,
  titleType,
  titleName,
  initialStatus,
  initialRating,
  initialEpisodeWatches,
  seasons,
  children,
}: {
  titleId: string;
  titleType: "movie" | "tv";
  titleName: string;
  initialStatus: string | null;
  initialRating: number;
  initialEpisodeWatches: string[];
  seasons: Season[];
  children: React.ReactNode;
}) {
  const [userStatus, setUserStatus] = useState(initialStatus);
  const [userRating, setUserRating] = useState(initialRating);
  const [episodeWatches, setEpisodeWatches] = useState(initialEpisodeWatches);
  const [watchingEp, setWatchingEp] = useState<string | null>(null);

  const handleStatusChange = useCallback(
    async (status: string | null) => {
      const prev = userStatus;
      setUserStatus(status === "watchlist" ? "in_progress" : status);
      try {
        await updateTitleStatus(titleId, status ? "in_progress" : null);
        toast.success(status ? "Added to watchlist" : "Removed from library");
      } catch {
        setUserStatus(prev);
        toast.error("Failed to update status");
      }
    },
    [titleId, userStatus],
  );

  const handleRating = useCallback(
    async (ratingStars: number) => {
      const prev = userRating;
      setUserRating(ratingStars);
      try {
        await updateTitleRating(titleId, ratingStars);
        toast.success(
          ratingStars > 0
            ? `Rated ${ratingStars} star${ratingStars > 1 ? "s" : ""}`
            : "Rating removed",
        );
      } catch {
        setUserRating(prev);
        toast.error("Failed to update rating");
      }
    },
    [titleId, userRating],
  );

  const handleWatchMovie = useCallback(async () => {
    const prev = userStatus;
    setUserStatus("completed");
    try {
      await watchMovie(titleId);
      toast.success(`Marked "${titleName}" as watched`);
    } catch {
      setUserStatus(prev);
      toast.error("Failed to mark as watched");
    }
  }, [titleId, titleName, userStatus]);

  const handleCatchUp = useCallback(
    async (episodeIds: string[]) => {
      setEpisodeWatches((w) => {
        const set = new Set(w);
        for (const id of episodeIds) set.add(id);
        return [...set];
      });
      // Check if all episodes are now watched
      setEpisodeWatches((w) => {
        const allEpIds = seasons.flatMap((s) => s.episodes.map((ep) => ep.id));
        if (allEpIds.every((id) => w.includes(id))) {
          setUserStatus("completed");
        }
        return w;
      });
      try {
        await batchWatchEpisodes(episodeIds);
        toast.success(
          `Caught up — marked ${episodeIds.length} episode${episodeIds.length > 1 ? "s" : ""} as watched`,
        );
      } catch {
        toast.error("Failed to catch up");
      }
    },
    [seasons],
  );

  const handleWatchEpisode = useCallback(
    async (
      episodeId: string,
      seasonNum: number,
      epNum: number,
      isWatched: boolean,
    ) => {
      setWatchingEp(episodeId);
      if (isWatched) {
        setEpisodeWatches((w) => w.filter((id) => id !== episodeId));
        setUserStatus((s) => (s === "completed" ? "in_progress" : s));
        try {
          await unwatchEpisodeAction(episodeId);
          toast.success(`Unwatched S${seasonNum} E${epNum}`);
        } catch {
          setEpisodeWatches((w) =>
            w.includes(episodeId) ? w : [...w, episodeId],
          );
          toast.error("Failed to unmark episode");
        }
      } else {
        setEpisodeWatches((w) =>
          w.includes(episodeId) ? w : [...w, episodeId],
        );
        setUserStatus((s) =>
          s === null || s === "watchlist" ? "in_progress" : s,
        );
        try {
          await watchEpisode(episodeId);

          // Find unwatched episodes before this one
          const previousUnwatched: string[] = [];
          for (const s of seasons) {
            for (const ep of s.episodes) {
              if (
                s.seasonNumber < seasonNum ||
                (s.seasonNumber === seasonNum && ep.episodeNumber < epNum)
              ) {
                // Use the latest episodeWatches state
                if (!episodeWatches.includes(ep.id) && ep.id !== episodeId) {
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
                onClick: () => handleCatchUp(previousUnwatched),
              },
              duration: 8000,
            });
          } else {
            toast.success(`Watched S${seasonNum} E${epNum}`);
          }
        } catch {
          setEpisodeWatches((w) => w.filter((id) => id !== episodeId));
          toast.error("Failed to mark episode");
        }
      }
      setWatchingEp(null);
    },
    [seasons, episodeWatches, handleCatchUp],
  );

  const handleMarkSeason = useCallback(
    async (season: Season) => {
      const unwatched = season.episodes.filter(
        (ep) => !episodeWatches.includes(ep.id),
      );
      if (unwatched.length === 0) return;

      const newWatchSet = new Set(episodeWatches);
      for (const ep of unwatched) newWatchSet.add(ep.id);
      const newWatches = [...newWatchSet];
      setEpisodeWatches(newWatches);

      // Optimistically check if all episodes are now watched
      const allEpIds = seasons.flatMap((s) => s.episodes.map((ep) => ep.id));
      if (allEpIds.every((id) => newWatchSet.has(id))) {
        setUserStatus("completed");
      } else {
        setUserStatus((s) =>
          s === null || s === "watchlist" ? "in_progress" : s,
        );
      }

      try {
        await watchSeason(season.id);
        toast.success(
          `Watched all of ${season.name ?? `Season ${season.seasonNumber}`}`,
        );
      } catch {
        toast.error("Failed to mark some episodes");
      }
    },
    [episodeWatches, seasons],
  );

  const handleUnmarkSeason = useCallback(async (season: Season) => {
    const seasonEpIds = new Set(season.episodes.map((ep) => ep.id));

    setEpisodeWatches((w) => w.filter((id) => !seasonEpIds.has(id)));
    setUserStatus((s) => (s === "completed" ? "in_progress" : s));

    try {
      await unwatchSeasonAction(season.id);
      toast.success(
        `Unwatched all of ${season.name ?? `Season ${season.seasonNumber}`}`,
      );
    } catch {
      toast.error("Failed to unmark some episodes");
    }
  }, []);

  const handleMarkAllWatched = useCallback(async () => {
    const prevStatus = userStatus;
    const prevWatches = episodeWatches;
    const allEpIds = seasons.flatMap((s) => s.episodes.map((ep) => ep.id));
    setEpisodeWatches(allEpIds);
    setUserStatus("completed");
    try {
      await markAllWatchedAction(titleId);
      toast.success("Marked all episodes as watched");
    } catch {
      setUserStatus(prevStatus);
      setEpisodeWatches(prevWatches);
      toast.error("Failed to mark all episodes as watched");
    }
  }, [titleId, userStatus, episodeWatches, seasons]);

  const value = useMemo(
    () => ({
      titleId,
      titleType,
      titleName,
      userStatus,
      userRating,
      episodeWatches,
      seasons,
      handleStatusChange,
      handleRating,
      handleWatchMovie,
      handleWatchEpisode,
      handleMarkSeason,
      handleUnmarkSeason,
      handleMarkAllWatched,
      watchingEp,
    }),
    [
      titleId,
      titleType,
      titleName,
      userStatus,
      userRating,
      episodeWatches,
      seasons,
      handleStatusChange,
      handleRating,
      handleWatchMovie,
      handleWatchEpisode,
      handleMarkSeason,
      handleUnmarkSeason,
      handleMarkAllWatched,
      watchingEp,
    ],
  );

  return (
    <TitleInteractionContext.Provider value={value}>
      {children}
    </TitleInteractionContext.Provider>
  );
}
