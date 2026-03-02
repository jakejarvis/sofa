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
      setUserStatus(status);
      try {
        await updateTitleStatus(titleId, status);
        const label =
          status === "watchlist"
            ? "Added to watchlist"
            : status === "in_progress"
              ? "Marked as watching"
              : status === "completed"
                ? "Marked as completed"
                : "Removed from list";
        toast.success(label);
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
        setUserStatus((s) => s ?? "in_progress");
        try {
          await watchEpisode(episodeId);
          toast.success(`Watched S${seasonNum} E${epNum}`);
        } catch {
          setEpisodeWatches((w) => w.filter((id) => id !== episodeId));
          toast.error("Failed to mark episode");
        }
      }
      setWatchingEp(null);
    },
    [],
  );

  const handleMarkSeason = useCallback(
    async (season: Season) => {
      const unwatched = season.episodes.filter(
        (ep) => !episodeWatches.includes(ep.id),
      );
      if (unwatched.length === 0) return;

      setEpisodeWatches((w) => {
        const set = new Set(w);
        for (const ep of unwatched) set.add(ep.id);
        return [...set];
      });

      try {
        await watchSeason(season.id);
        toast.success(
          `Watched all of ${season.name ?? `Season ${season.seasonNumber}`}`,
        );
      } catch {
        toast.error("Failed to mark some episodes");
      }
    },
    [episodeWatches],
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
      watchingEp,
    ],
  );

  return (
    <TitleInteractionContext.Provider value={value}>
      {children}
    </TitleInteractionContext.Provider>
  );
}
