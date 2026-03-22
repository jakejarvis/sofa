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

  const { mutateAsync: batchWatch } = useMutation(orpc.episodes.batchWatch.mutationOptions());
  const { mutateAsync: updateStatus } = useMutation(orpc.titles.updateStatus.mutationOptions());
  const { mutateAsync: updateRating } = useMutation(orpc.titles.updateRating.mutationOptions());
  const { mutateAsync: watchMovie } = useMutation(orpc.titles.watchMovie.mutationOptions());
  const { mutateAsync: unwatchEp } = useMutation(orpc.episodes.unwatch.mutationOptions());
  const { mutateAsync: watchEp } = useMutation(orpc.episodes.watch.mutationOptions());
  const { mutateAsync: watchSeason } = useMutation(orpc.seasons.watch.mutationOptions());
  const { mutateAsync: unwatchSeason } = useMutation(orpc.seasons.unwatch.mutationOptions());
  const { mutateAsync: watchAll } = useMutation(orpc.titles.watchAll.mutationOptions());

  const catchUp = useCallback(
    async (episodeIds: string[]) => {
      await queryClient.cancelQueries({ queryKey: userInfoKey });
      const prev = getUserInfo();
      const newWatchSet = new Set(prev.episodeWatches);
      for (const id of episodeIds) newWatchSet.add(id);
      const newWatches = [...newWatchSet];

      setUserInfo((old) => ({
        ...old,
        episodeWatches: newWatches,
      }));

      try {
        await batchWatch({ episodeIds });
        await queryClient.invalidateQueries({ queryKey: userInfoKey });
        const count = episodeIds.length;
        toast.success(
          t`Caught up — marked ${plural(count, { one: "# episode", other: "# episodes" })} as watched`,
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
    [getUserInfo, setUserInfo, batchWatch, queryClient, userInfoKey, t],
  );

  const handleStatusChange = useCallback(
    async (status: string | null) => {
      await queryClient.cancelQueries({ queryKey: userInfoKey });
      const prevStatus = getUserInfo().status;
      setUserInfo((old) => ({
        ...old,
        status: status ? "in_watchlist" : null,
      }));
      try {
        await updateStatus({
          id: titleId,
          status: status ? "watchlist" : null,
        });
        toast.success(status ? t`Added to watchlist` : t`Removed from library`);
      } catch {
        setUserInfo((old) => ({ ...old, status: prevStatus }));
        toast.error(t`Failed to update status`);
      }
    },
    [getUserInfo, setUserInfo, queryClient, userInfoKey, titleId, updateStatus, t],
  );

  const handleRating = useCallback(
    async (ratingStars: number) => {
      await queryClient.cancelQueries({ queryKey: userInfoKey });
      const prevRating = getUserInfo().rating;
      setUserInfo((old) => ({ ...old, rating: ratingStars }));
      try {
        await updateRating({
          id: titleId,
          stars: ratingStars,
        });
        toast.success(
          ratingStars > 0
            ? t`Rated ${plural(ratingStars, { one: "# star", other: "# stars" })}`
            : t`Rating removed`,
        );
      } catch {
        setUserInfo((old) => ({ ...old, rating: prevRating }));
        toast.error(t`Failed to update rating`);
      }
    },
    [getUserInfo, setUserInfo, queryClient, userInfoKey, titleId, updateRating, t],
  );

  const handleWatchMovie = useCallback(async () => {
    await queryClient.cancelQueries({ queryKey: userInfoKey });
    const prevStatus = getUserInfo().status;
    setUserInfo((old) => ({ ...old, status: "completed" }));
    try {
      await watchMovie({ id: titleId });
      toast.success(t`Marked "${titleName}" as watched`);
    } catch {
      setUserInfo((old) => ({ ...old, status: prevStatus }));
      toast.error(t`Failed to mark as watched`);
    }
  }, [getUserInfo, setUserInfo, queryClient, userInfoKey, titleId, titleName, watchMovie, t]);

  const handleWatchEpisode = useCallback(
    async (episodeId: string, seasonNum: number, epNum: number, isWatched: boolean) => {
      await queryClient.cancelQueries({ queryKey: userInfoKey });
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
          await unwatchEp({ id: episodeId });
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
          await watchEp({ id: episodeId });

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
              description: t`${plural(count, { one: "# earlier episode", other: "# earlier episodes" })} unwatched`,
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
      queryClient,
      userInfoKey,
      setWatchingEp,
      seasons,
      catchUp,
      unwatchEp,
      watchEp,
      t,
    ],
  );

  const handleMarkSeason = useCallback(
    async (season: Season) => {
      await queryClient.cancelQueries({ queryKey: userInfoKey });
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
        await watchSeason({ id: season.id });
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

        const seasonNumber = season.seasonNumber;
        const seasonLabel = season.name ?? t`Season ${seasonNumber}`;
        if (previousUnwatched.length > 0) {
          const count = previousUnwatched.length;
          toast.success(t`Watched all of ${seasonLabel}`, {
            description: t`${plural(count, { one: "# earlier episode", other: "# earlier episodes" })} unwatched`,
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
    [getUserInfo, setUserInfo, seasons, catchUp, watchSeason, queryClient, userInfoKey, t],
  );

  const handleUnmarkSeason = useCallback(
    async (season: Season) => {
      await queryClient.cancelQueries({ queryKey: userInfoKey });
      const prevWatches = getUserInfo().episodeWatches;
      const prevStatus = getUserInfo().status;
      const seasonEpIds = new Set(season.episodes.map((ep) => ep.id));
      setUserInfo((old) => ({
        ...old,
        episodeWatches: old.episodeWatches.filter((id) => !seasonEpIds.has(id)),
        status: old.status === "completed" || old.status === "caught_up" ? "watching" : old.status,
      }));

      try {
        await unwatchSeason({ id: season.id });
        const seasonNumber = season.seasonNumber;
        const seasonLabel = season.name ?? t`Season ${seasonNumber}`;
        toast.success(t`Unwatched all of ${seasonLabel}`);
      } catch {
        setUserInfo((old) => ({
          ...old,
          episodeWatches: prevWatches,
          status: prevStatus,
        }));
        toast.error(t`Failed to unmark some episodes`);
      }
    },
    [getUserInfo, setUserInfo, queryClient, userInfoKey, unwatchSeason, t],
  );

  const handleMarkAllWatched = useCallback(async () => {
    await queryClient.cancelQueries({ queryKey: userInfoKey });
    const prevWatches = getUserInfo().episodeWatches;
    const prevStatus = getUserInfo().status;
    const allEpIds = seasons.flatMap((s) => s.episodes.map((ep) => ep.id));
    setUserInfo((old) => ({
      ...old,
      episodeWatches: allEpIds,
      status: old.status ?? "watching",
    }));
    try {
      await watchAll({ id: titleId });
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
  }, [getUserInfo, setUserInfo, seasons, titleId, watchAll, queryClient, userInfoKey, t]);

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
