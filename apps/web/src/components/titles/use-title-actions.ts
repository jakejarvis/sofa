import type { Season } from "@sofa/api/schemas";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { toast } from "sonner";
import { orpc } from "@/lib/orpc/client";
import { useTitleContext } from "./title-context";

type UserInfo = {
  status: "watchlist" | "in_progress" | "completed" | null;
  rating: number | null;
  episodeWatches: string[];
};

export function useTitleActions() {
  const { titleId, titleName, seasons, setWatchingEp } = useTitleContext();
  const queryClient = useQueryClient();
  const userInfoKey = orpc.titles.userInfo.queryKey({ input: { id: titleId } });

  const getUserInfo = useCallback(
    () =>
      queryClient.getQueryData<UserInfo>(userInfoKey) ?? {
        status: null,
        rating: null,
        episodeWatches: [],
      },
    [queryClient, userInfoKey],
  );

  const setUserInfo = useCallback(
    (updater: (old: UserInfo) => UserInfo) => {
      queryClient.setQueryData<UserInfo>(userInfoKey, (old) =>
        updater(old ?? { status: null, rating: null, episodeWatches: [] }),
      );
    },
    [queryClient, userInfoKey],
  );

  const batchWatchMutation = useMutation(
    orpc.episodes.batchWatch.mutationOptions(),
  );
  const updateStatusMutation = useMutation(
    orpc.titles.updateStatus.mutationOptions(),
  );
  const updateRatingMutation = useMutation(
    orpc.titles.updateRating.mutationOptions(),
  );
  const watchMovieMutation = useMutation(
    orpc.titles.watchMovie.mutationOptions(),
  );
  const unwatchEpMutation = useMutation(
    orpc.episodes.unwatch.mutationOptions(),
  );
  const watchEpMutation = useMutation(orpc.episodes.watch.mutationOptions());
  const watchSeasonMutation = useMutation(orpc.seasons.watch.mutationOptions());
  const unwatchSeasonMutation = useMutation(
    orpc.seasons.unwatch.mutationOptions(),
  );
  const watchAllMutation = useMutation(orpc.titles.watchAll.mutationOptions());

  const catchUp = useCallback(
    async (episodeIds: string[]) => {
      const prev = getUserInfo();
      const newWatchSet = new Set(prev.episodeWatches);
      for (const id of episodeIds) newWatchSet.add(id);
      const newWatches = [...newWatchSet];

      const allEpIds = seasons.flatMap((s) => s.episodes.map((ep) => ep.id));
      const allWatched = allEpIds.every((id) => newWatchSet.has(id));

      setUserInfo((old) => ({
        ...old,
        episodeWatches: newWatches,
        status: allWatched ? "completed" : old.status,
      }));

      try {
        await batchWatchMutation.mutateAsync({ episodeIds });
        toast.success(
          `Caught up — marked ${episodeIds.length} episode${episodeIds.length > 1 ? "s" : ""} as watched`,
        );
      } catch {
        setUserInfo((old) => ({
          ...old,
          episodeWatches: prev.episodeWatches,
          status: prev.status,
        }));
        toast.error("Failed to catch up");
      }
    },
    [getUserInfo, setUserInfo, seasons, batchWatchMutation],
  );

  const handleStatusChange = useCallback(
    async (status: string | null) => {
      const prevStatus = getUserInfo().status;
      setUserInfo((old) => ({
        ...old,
        status:
          status === "watchlist"
            ? "in_progress"
            : (status as UserInfo["status"]),
      }));
      try {
        await updateStatusMutation.mutateAsync({
          id: titleId,
          status: status ? "in_progress" : null,
        });
        toast.success(status ? "Added to watchlist" : "Removed from library");
      } catch {
        setUserInfo((old) => ({ ...old, status: prevStatus }));
        toast.error("Failed to update status");
      }
    },
    [getUserInfo, setUserInfo, titleId, updateStatusMutation],
  );

  const handleRating = useCallback(
    async (ratingStars: number) => {
      const prevRating = getUserInfo().rating;
      setUserInfo((old) => ({ ...old, rating: ratingStars }));
      try {
        await updateRatingMutation.mutateAsync({
          id: titleId,
          stars: ratingStars,
        });
        toast.success(
          ratingStars > 0
            ? `Rated ${ratingStars} star${ratingStars > 1 ? "s" : ""}`
            : "Rating removed",
        );
      } catch {
        setUserInfo((old) => ({ ...old, rating: prevRating }));
        toast.error("Failed to update rating");
      }
    },
    [getUserInfo, setUserInfo, titleId, updateRatingMutation],
  );

  const handleWatchMovie = useCallback(async () => {
    const prevStatus = getUserInfo().status;
    setUserInfo((old) => ({ ...old, status: "completed" }));
    try {
      await watchMovieMutation.mutateAsync({ id: titleId });
      toast.success(`Marked "${titleName}" as watched`);
    } catch {
      setUserInfo((old) => ({ ...old, status: prevStatus }));
      toast.error("Failed to mark as watched");
    }
  }, [getUserInfo, setUserInfo, titleId, titleName, watchMovieMutation]);

  const handleWatchEpisode = useCallback(
    async (
      episodeId: string,
      seasonNum: number,
      epNum: number,
      isWatched: boolean,
    ) => {
      setWatchingEp(episodeId);

      if (isWatched) {
        const prevWatches = getUserInfo().episodeWatches;
        const prevStatus = getUserInfo().status;
        setUserInfo((old) => ({
          ...old,
          episodeWatches: old.episodeWatches.filter((id) => id !== episodeId),
          status: old.status === "completed" ? "in_progress" : old.status,
        }));

        try {
          await unwatchEpMutation.mutateAsync({ id: episodeId });
          toast.success(`Unwatched S${seasonNum} E${epNum}`);
        } catch {
          setUserInfo((old) => ({
            ...old,
            episodeWatches: prevWatches,
            status: prevStatus,
          }));
          toast.error("Failed to unmark episode");
        }
      } else {
        const prevWatches = getUserInfo().episodeWatches;
        const prevStatus = getUserInfo().status;
        const currentWatches = prevWatches;
        const newWatches = currentWatches.includes(episodeId)
          ? currentWatches
          : [...currentWatches, episodeId];

        setUserInfo((old) => ({
          ...old,
          episodeWatches: newWatches,
          status:
            old.status === null || old.status === "watchlist"
              ? "in_progress"
              : old.status,
        }));

        try {
          await watchEpMutation.mutateAsync({ id: episodeId });

          const watchedSet = new Set(getUserInfo().episodeWatches);
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
          setUserInfo((old) => ({
            ...old,
            episodeWatches: prevWatches,
            status: prevStatus,
          }));
          toast.error("Failed to mark episode");
        }
      }

      setWatchingEp(null);
    },
    [
      getUserInfo,
      setUserInfo,
      setWatchingEp,
      seasons,
      catchUp,
      unwatchEpMutation,
      watchEpMutation,
    ],
  );

  const handleMarkSeason = useCallback(
    async (season: Season) => {
      const prevWatches = getUserInfo().episodeWatches;
      const prevStatus = getUserInfo().status;
      const watchedSet = new Set(prevWatches);
      const unwatched = season.episodes.filter((ep) => !watchedSet.has(ep.id));
      if (unwatched.length === 0) return;

      const newWatchSet = new Set(watchedSet);
      for (const ep of unwatched) newWatchSet.add(ep.id);
      const newWatches = [...newWatchSet];

      const allEpIds = seasons.flatMap((s) => s.episodes.map((ep) => ep.id));
      const allWatched = allEpIds.every((id) => newWatchSet.has(id));

      setUserInfo((old) => ({
        ...old,
        episodeWatches: newWatches,
        status: allWatched
          ? "completed"
          : old.status === null || old.status === "watchlist"
            ? "in_progress"
            : old.status,
      }));

      try {
        await watchSeasonMutation.mutateAsync({ id: season.id });

        const currentWatchSet = new Set(getUserInfo().episodeWatches);
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
        setUserInfo((old) => ({
          ...old,
          episodeWatches: prevWatches,
          status: prevStatus,
        }));
        toast.error("Failed to mark some episodes");
      }
    },
    [getUserInfo, setUserInfo, seasons, catchUp, watchSeasonMutation],
  );

  const handleUnmarkSeason = useCallback(
    async (season: Season) => {
      const prevWatches = getUserInfo().episodeWatches;
      const prevStatus = getUserInfo().status;
      const seasonEpIds = new Set(season.episodes.map((ep) => ep.id));
      setUserInfo((old) => ({
        ...old,
        episodeWatches: old.episodeWatches.filter((id) => !seasonEpIds.has(id)),
        status: old.status === "completed" ? "in_progress" : old.status,
      }));

      try {
        await unwatchSeasonMutation.mutateAsync({ id: season.id });
        toast.success(
          `Unwatched all of ${season.name ?? `Season ${season.seasonNumber}`}`,
        );
      } catch {
        setUserInfo((old) => ({
          ...old,
          episodeWatches: prevWatches,
          status: prevStatus,
        }));
        toast.error("Failed to unmark some episodes");
      }
    },
    [getUserInfo, setUserInfo, unwatchSeasonMutation],
  );

  const handleMarkAllWatched = useCallback(async () => {
    const prevWatches = getUserInfo().episodeWatches;
    const prevStatus = getUserInfo().status;
    const allEpIds = seasons.flatMap((s) => s.episodes.map((ep) => ep.id));
    setUserInfo((old) => ({
      ...old,
      episodeWatches: allEpIds,
      status: "completed",
    }));
    try {
      await watchAllMutation.mutateAsync({ id: titleId });
      toast.success("Marked all episodes as watched");
    } catch {
      setUserInfo((old) => ({
        ...old,
        episodeWatches: prevWatches,
        status: prevStatus,
      }));
      toast.error("Failed to mark all episodes as watched");
    }
  }, [getUserInfo, setUserInfo, seasons, titleId, watchAllMutation]);

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
