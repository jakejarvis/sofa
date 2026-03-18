import { Trans } from "@lingui/react/macro";
import type { Season } from "@sofa/api/schemas";
import {
  IconCheck,
  IconChecks,
  IconChevronDown,
  IconChevronUp,
  IconDeviceTvOld,
} from "@tabler/icons-react";
import { format, parseISO } from "date-fns";
import { AnimatePresence, motion } from "motion/react";

import { useEffect, useMemo, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useTitleContext, useTitleUserInfo } from "./title-context";
import { useTitleActions } from "./use-title-actions";

export function SeasonsSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Skeleton className="size-5 rounded" />
        <Skeleton className="h-7 w-28" />
      </div>
      <div className="space-y-2">
        {["s1", "s2", "s3"].map((id) => (
          <div
            key={id}
            className="overflow-hidden rounded-xl border border-border/50 bg-card/50"
          >
            <div className="flex items-center justify-between p-4">
              <Skeleton className="h-4 w-24" />
              <div className="flex items-center gap-3">
                <Skeleton className="hidden h-2 w-24 rounded-full sm:block" />
                <Skeleton className="h-3 w-10" />
                <Skeleton className="size-4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TitleSeasons({
  seasons: streamedSeasons,
}: {
  seasons?: Season[];
} = {}) {
  const { seasons, setSeasons, watchingEp } = useTitleContext();
  const { episodeWatches, userStatus } = useTitleUserInfo();

  // When seasons are streamed via Suspense, sync them into context
  useEffect(() => {
    if (streamedSeasons && streamedSeasons.length > 0) {
      setSeasons(streamedSeasons);
    }
  }, [streamedSeasons, setSeasons]);

  const watchedSet = useMemo(() => new Set(episodeWatches), [episodeWatches]);
  const {
    handleWatchEpisode,
    handleMarkSeason,
    handleUnmarkSeason,
    handleMarkAllWatched,
  } = useTitleActions();
  const seasonProgress = useMemo(() => {
    const map = new Map<string, number>();
    for (const season of seasons) {
      let count = 0;
      for (const ep of season.episodes) {
        if (watchedSet.has(ep.id)) count++;
      }
      map.set(season.id, count);
    }
    return map;
  }, [seasons, watchedSet]);

  const [openSeason, setOpenSeason] = useState<number | null>(null);
  const [markAllOpen, setMarkAllOpen] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IconDeviceTvOld aria-hidden={true} className="size-5 text-primary" />
          <h2 className="font-display text-2xl tracking-tight">
            <Trans>Episodes</Trans>
          </h2>
        </div>
        {userStatus !== "completed" && (
          <AlertDialog open={markAllOpen} onOpenChange={setMarkAllOpen}>
            <AlertDialogTrigger
              render={
                <Button
                  variant="ghost"
                  size="xs"
                  className="text-muted-foreground uppercase tracking-wider"
                >
                  <IconChecks aria-hidden={true} className="size-3.5" />
                  <Trans>Mark All Watched</Trans>
                </Button>
              }
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  <Trans>Mark all episodes as watched?</Trans>
                </AlertDialogTitle>
                <AlertDialogDescription>
                  <Trans>
                    This will mark every episode of this show as watched. You
                    can undo this later by unmarking individual seasons.
                  </Trans>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>
                  <Trans>Cancel</Trans>
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    handleMarkAllWatched();
                    setMarkAllOpen(false);
                  }}
                >
                  <Trans>Mark All Watched</Trans>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
      <div className="space-y-2">
        {seasons.map((season) => {
          const isOpen = openSeason === season.seasonNumber;
          const watchedCount = seasonProgress.get(season.id) ?? 0;
          const totalCount = season.episodes.length;
          const progressPercent =
            totalCount > 0 ? (watchedCount / totalCount) * 100 : 0;

          return (
            <div
              key={season.id}
              className="overflow-hidden rounded-xl border border-border/50 bg-card/50"
            >
              {/* biome-ignore lint/a11y/useSemanticElements: contains nested buttons */}
              <div
                role="button"
                tabIndex={0}
                onClick={() =>
                  setOpenSeason(isOpen ? null : season.seasonNumber)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setOpenSeason(isOpen ? null : season.seasonNumber);
                  }
                }}
                className="group/season flex w-full cursor-pointer items-center justify-between p-4 text-left transition-colors hover:bg-accent/50"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium">
                    {season.name ?? `Season ${season.seasonNumber}`}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {totalCount > 0 && (
                    <div className="hidden w-24 sm:block sm:group-hover/season:hidden">
                      <Progress value={progressPercent} />
                    </div>
                  )}
                  {totalCount > 0 && watchedCount < totalCount && (
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkSeason(season);
                      }}
                      className="text-primary uppercase tracking-wider hover:bg-primary/10 hover:text-primary sm:hidden sm:w-24 sm:group-hover/season:block"
                    >
                      <IconChecks
                        aria-hidden={true}
                        className="size-3.5 sm:hidden"
                      />
                      <span className="hidden sm:inline">
                        <Trans>Watch all</Trans>
                      </span>
                    </Button>
                  )}
                  {totalCount > 0 && watchedCount === totalCount && (
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnmarkSeason(season);
                      }}
                      className="text-muted-foreground uppercase tracking-wider hover:bg-destructive/10 hover:text-destructive sm:hidden sm:w-24 sm:group-hover/season:block"
                    >
                      <IconChecks
                        aria-hidden={true}
                        className="size-3.5 sm:hidden"
                      />
                      <span className="hidden sm:inline">
                        <Trans>Unwatch all</Trans>
                      </span>
                    </Button>
                  )}
                  {totalCount > 0 && (
                    <span className="font-mono text-muted-foreground text-xs tabular-nums">
                      {watchedCount}/{totalCount}
                    </span>
                  )}
                  {isOpen ? (
                    <IconChevronUp
                      aria-hidden={true}
                      className="size-4 text-muted-foreground"
                    />
                  ) : (
                    <IconChevronDown
                      aria-hidden={true}
                      className="size-4 text-muted-foreground"
                    />
                  )}
                </div>
              </div>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 30,
                    }}
                    className="overflow-hidden border-border/50 border-t"
                  >
                    {season.episodes.map((ep) => {
                      const isWatched = watchedSet.has(ep.id);
                      const { stillPath } = ep;
                      return (
                        <div
                          key={ep.id}
                          className={`border-border/30 border-b transition-colors last:border-b-0 ${isWatched ? "opacity-60" : ""}`}
                        >
                          {/* Mobile: still banner above episode info */}
                          {stillPath && (
                            <div className="relative aspect-video w-full overflow-hidden bg-muted sm:hidden">
                              <img
                                src={stillPath}
                                alt={ep.name ?? ""}
                                width={600}
                                height={338}
                                loading="lazy"
                                decoding="async"
                                className="h-full w-full object-cover"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                              <span className="absolute bottom-2 left-3 font-mono text-[10px] text-white/70">
                                E{String(ep.episodeNumber).padStart(2, "0")}
                              </span>
                            </div>
                          )}
                          <div className="flex gap-3 px-4 py-3">
                            <button
                              type="button"
                              aria-label={`Mark episode ${ep.episodeNumber} as ${isWatched ? "unwatched" : "watched"}`}
                              onClick={() =>
                                handleWatchEpisode(
                                  ep.id,
                                  season.seasonNumber,
                                  ep.episodeNumber,
                                  isWatched,
                                )
                              }
                              disabled={watchingEp === ep.id}
                              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-all ${
                                isWatched
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-muted-foreground/40 bg-muted-foreground/5 hover:border-primary/70 hover:bg-primary/10"
                              }`}
                            >
                              {isWatched && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{
                                    type: "spring",
                                    stiffness: 500,
                                    damping: 15,
                                  }}
                                >
                                  <IconCheck className="size-3.5" />
                                </motion.div>
                              )}
                            </button>
                            {/* Desktop: inline thumbnail */}
                            {stillPath && (
                              <div className="hidden h-14 w-24 shrink-0 overflow-hidden rounded-md bg-muted sm:block">
                                <img
                                  src={stillPath}
                                  alt={ep.name ?? ""}
                                  width={300}
                                  height={169}
                                  loading="lazy"
                                  decoding="async"
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-sm">
                                {/* Episode number shown inline on desktop, or mobile without still */}
                                <span
                                  className={`font-mono text-muted-foreground text-xs ${stillPath ? "hidden sm:inline" : ""}`}
                                >
                                  E{String(ep.episodeNumber).padStart(2, "0")}
                                </span>
                                <span className="hidden sm:inline"> </span>
                                <span className="font-medium">
                                  {ep.name ?? <Trans>Untitled</Trans>}
                                </span>
                              </p>
                              <p className="text-muted-foreground text-xs">
                                {ep.airDate
                                  ? format(parseISO(ep.airDate), "MMM d, yyyy")
                                  : ""}
                                {ep.airDate && ep.runtimeMinutes ? " · " : ""}
                                {ep.runtimeMinutes
                                  ? `${ep.runtimeMinutes}m`
                                  : ""}
                              </p>
                              {ep.overview && (
                                <p className="mt-1 line-clamp-2 text-muted-foreground/70 text-xs leading-relaxed">
                                  {ep.overview}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
