import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { toast } from "sonner";

import { orpc } from "@/lib/orpc/client";
import type { Season } from "@sofa/api/schemas";

import { useTitleContext } from "./title-context";

type UserInfo = {
  status: "in_watchlist" | "watching" | "caught_up" | "completed" | null;
  rating: number | null;
  episodeWatches: string[];
};

export function useTitleActions() {
  const { t } = useLingui();
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

  const batchWatchMutation = useMutation(orpc.episodes.batchWatch.mutationOptions());
  const updateStatusMutation = useMutation(orpc.titles.updateStatus.mutationOptions());
  const updateRatingMutation = useMutation(orpc.titles.updateRating.mutationOptions());
  const watchMovieMutation = useMutation(orpc.titles.watchMovie.mutationOptions());
  const unwatchEpMutation = useMutation(orpc.episodes.unwatch.mutationOptions());
  const watchEpMutation = useMutation(orpc.episodes.watch.mutationOptions());
  const watchSeasonMutation = useMutation(orpc.seasons.watch.mutationOptions());
  const unwatchSeasonMutation = useMutation(orpc.seasons.unwatch.mutationOptions());
  const watchAllMutation = useMutation(orpc.titles.watchAll.mutationOptions());

  const catchUp = useCallback(
    async (episodeIds: string[]) => {
      const prev = getUserInfo();
      const newWatchSet = new Set(prev.episodeWatches);
      for (const id of episodeIds) newWatchSet.add(id);
      const newWatches = [...newWatchSet];

      setUserInfo((old) => ({
        ...old,
        episodeWatches: newWatches,
      }));

      try {
        await batchWatchMutation.mutateAsync({ episodeIds });
        await queryClient.invalidateQueries({ queryKey: userInfoKey });
        toast.success(
          t`Caught up — marked ${episodeIds.length} ${plural(episodeIds.length, { one: "episode", other: "episodes" })} as watched`,
        );
      } catch {
        setUserInfo((old) => ({
          ...old,
          episodeWatches: prev.episodeWatches,
          status: prev.status,
        }));
        toast.error(t`Failed to catch up`);
      }
    },
    [getUserInfo, setUserInfo, batchWatchMutation, queryClient, userInfoKey, t],
  );

  const handleStatusChange = useCallback(
    async (status: string | null) => {
      const prevStatus = getUserInfo().status;
      setUserInfo((old) => ({
        ...old,
        status: status ? "in_watchlist" : null,
      }));
      try {
        await updateStatusMutation.mutateAsync({
          id: titleId,
          status: status ? "watchlist" : null,
        });
        toast.success(status ? t`Added to watchlist` : t`Removed from library`);
      } catch {
        setUserInfo((old) => ({ ...old, status: prevStatus }));
        toast.error(t`Failed to update status`);
      }
    },
    [getUserInfo, setUserInfo, titleId, updateStatusMutation, t],
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
            ? t`Rated ${ratingStars} ${plural(ratingStars, { one: "star", other: "stars" })}`
            : t`Rating removed`,
        );
      } catch {
        setUserInfo((old) => ({ ...old, rating: prevRating }));
        toast.error(t`Failed to update rating`);
      }
    },
    [getUserInfo, setUserInfo, titleId, updateRatingMutation, t],
  );

  const handleWatchMovie = useCallback(async () => {
    const prevStatus = getUserInfo().status;
    setUserInfo((old) => ({ ...old, status: "completed" }));
    try {
      await watchMovieMutation.mutateAsync({ id: titleId });
      toast.success(t`Marked "${titleName}" as watched`);
    } catch {
      setUserInfo((old) => ({ ...old, status: prevStatus }));
      toast.error(t`Failed to mark as watched`);
    }
  }, [getUserInfo, setUserInfo, titleId, titleName, watchMovieMutation, t]);

  const handleWatchEpisode = useCallback(
    async (episodeId: string, seasonNum: number, epNum: number, isWatched: boolean) => {
      setWatchingEp(episodeId);

      if (isWatched) {
        const prevWatches = getUserInfo().episodeWatches;
        const prevStatus = getUserInfo().status;
        setUserInfo((old) => ({
          ...old,
          episodeWatches: old.episodeWatches.filter((id) => id !== episodeId),
          status:
            old.status === "completed" || old.status === "caught_up" ? "watching" : old.status,
        }));

        try {
          await unwatchEpMutation.mutateAsync({ id: episodeId });
          toast.success(t`Unwatched S${seasonNum} E${epNum}`);
        } catch {
          setUserInfo((old) => ({
            ...old,
            episodeWatches: prevWatches,
            status: prevStatus,
          }));
          toast.error(t`Failed to unmark episode`);
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
          status: old.status === null || old.status === "in_watchlist" ? "watching" : old.status,
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
            toast.success(t`Watched S${seasonNum} E${epNum}`, {
              description: t`${count} earlier ${plural(count, { one: "episode", other: "episodes" })} unwatched`,
              action: {
                label: t`Catch up`,
                onClick: () => catchUp(previousUnwatched),
              },
              duration: 8000,
            });
          } else {
            toast.success(t`Watched S${seasonNum} E${epNum}`);
          }
        } catch {
          setUserInfo((old) => ({
            ...old,
            episodeWatches: prevWatches,
            status: prevStatus,
          }));
          toast.error(t`Failed to mark episode`);
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
      t,
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

      setUserInfo((old) => ({
        ...old,
        episodeWatches: newWatches,
        status: old.status === null || old.status === "in_watchlist" ? "watching" : old.status,
      }));

      try {
        await watchSeasonMutation.mutateAsync({ id: season.id });
        await queryClient.invalidateQueries({ queryKey: userInfoKey });

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

        const seasonLabel = season.name ?? t`Season ${season.seasonNumber}`;
        if (previousUnwatched.length > 0) {
          const count = previousUnwatched.length;
          toast.success(t`Watched all of ${seasonLabel}`, {
            description: t`${count} earlier ${plural(count, { one: "episode", other: "episodes" })} unwatched`,
            action: {
              label: t`Catch up`,
              onClick: () => catchUp(previousUnwatched),
            },
            duration: 8000,
          });
        } else {
          toast.success(t`Watched all of ${seasonLabel}`);
        }
      } catch {
        setUserInfo((old) => ({
          ...old,
          episodeWatches: prevWatches,
          status: prevStatus,
        }));
        toast.error(t`Failed to mark some episodes`);
      }
    },
    [getUserInfo, setUserInfo, seasons, catchUp, watchSeasonMutation, queryClient, userInfoKey, t],
  );

  const handleUnmarkSeason = useCallback(
    async (season: Season) => {
      const prevWatches = getUserInfo().episodeWatches;
      const prevStatus = getUserInfo().status;
      const seasonEpIds = new Set(season.episodes.map((ep) => ep.id));
      setUserInfo((old) => ({
        ...old,
        episodeWatches: old.episodeWatches.filter((id) => !seasonEpIds.has(id)),
        status: old.status === "completed" || old.status === "caught_up" ? "watching" : old.status,
      }));

      try {
        await unwatchSeasonMutation.mutateAsync({ id: season.id });
        toast.success(t`Unwatched all of ${season.name ?? t`Season ${season.seasonNumber}`}`);
      } catch {
        setUserInfo((old) => ({
          ...old,
          episodeWatches: prevWatches,
          status: prevStatus,
        }));
        toast.error(t`Failed to unmark some episodes`);
      }
    },
    [getUserInfo, setUserInfo, unwatchSeasonMutation, t],
  );

  const handleMarkAllWatched = useCallback(async () => {
    const prevWatches = getUserInfo().episodeWatches;
    const prevStatus = getUserInfo().status;
    const allEpIds = seasons.flatMap((s) => s.episodes.map((ep) => ep.id));
    setUserInfo((old) => ({
      ...old,
      episodeWatches: allEpIds,
      status: old.status ?? "watching",
    }));
    try {
      await watchAllMutation.mutateAsync({ id: titleId });
      // Refresh to get server-derived display status (caught_up / completed)
      await queryClient.invalidateQueries({ queryKey: userInfoKey });
      toast.success(t`Marked all episodes as watched`);
    } catch {
      setUserInfo((old) => ({
        ...old,
        episodeWatches: prevWatches,
        status: prevStatus,
      }));
      toast.error(t`Failed to mark all episodes as watched`);
    }
  }, [getUserInfo, setUserInfo, seasons, titleId, watchAllMutation, queryClient, userInfoKey, t]);

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
