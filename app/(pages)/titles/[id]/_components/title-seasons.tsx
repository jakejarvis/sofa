"use client";

import {
  IconCheck,
  IconChecks,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react";
import { useAtomValue } from "jotai";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useState } from "react";
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
import { Progress } from "@/components/ui/progress";
import {
  episodeWatchesAtom,
  seasonsAtom,
  userStatusAtom,
  watchingEpAtom,
} from "@/lib/atoms/title";
import { useTitleActions } from "./use-title-actions";

export function TitleSeasons() {
  const seasons = useAtomValue(seasonsAtom);
  const episodeWatches = useAtomValue(episodeWatchesAtom);
  const userStatus = useAtomValue(userStatusAtom);
  const watchingEp = useAtomValue(watchingEpAtom);
  const {
    handleWatchEpisode,
    handleMarkSeason,
    handleUnmarkSeason,
    handleMarkAllWatched,
  } = useTitleActions();
  const [openSeason, setOpenSeason] = useState<number | null>(null);
  const [markAllOpen, setMarkAllOpen] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl tracking-tight">Seasons</h2>
        {userStatus && userStatus !== "completed" && (
          <AlertDialog open={markAllOpen} onOpenChange={setMarkAllOpen}>
            <AlertDialogTrigger
              render={
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <IconChecks className="size-3.5" />
                  Mark All Watched
                </button>
              }
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Mark all episodes as watched?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will mark every episode of this show as watched. You can
                  undo this later by unmarking individual seasons.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    handleMarkAllWatched();
                    setMarkAllOpen(false);
                  }}
                >
                  Mark All Watched
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
      <div className="space-y-2">
        {seasons.map((season) => {
          const isOpen = openSeason === season.seasonNumber;
          const watchedCount = season.episodes.filter((ep) =>
            episodeWatches.includes(ep.id),
          ).length;
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
                    <>
                      <span className="text-xs tabular-nums text-muted-foreground sm:hidden">
                        {Math.round(progressPercent)}%
                      </span>
                      <div className="hidden w-24 sm:block sm:group-hover/season:hidden">
                        <Progress value={progressPercent} />
                      </div>
                    </>
                  )}
                  {totalCount > 0 && watchedCount < totalCount && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkSeason(season);
                      }}
                      className="w-24 rounded-md px-2 py-1 text-center text-[10px] font-medium uppercase tracking-wider text-primary transition-colors hover:bg-primary/10 sm:hidden sm:group-hover/season:block"
                    >
                      Watch all
                    </button>
                  )}
                  {totalCount > 0 && watchedCount === totalCount && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnmarkSeason(season);
                      }}
                      className="w-24 rounded-md px-2 py-1 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive sm:hidden sm:group-hover/season:block"
                    >
                      Unwatch all
                    </button>
                  )}
                  {totalCount > 0 && (
                    <span className="hidden font-mono text-xs tabular-nums text-muted-foreground sm:inline">
                      {watchedCount}/{totalCount}
                    </span>
                  )}
                  {isOpen ? (
                    <IconChevronUp className="size-4 text-muted-foreground" />
                  ) : (
                    <IconChevronDown className="size-4 text-muted-foreground" />
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
                    className="overflow-hidden border-t border-border/50"
                  >
                    {season.episodes.map((ep) => {
                      const isWatched = episodeWatches.includes(ep.id);
                      const { stillPath } = ep;
                      return (
                        <div
                          key={ep.id}
                          className={`flex gap-3 border-b border-border/30 px-4 py-3 last:border-b-0 transition-colors ${isWatched ? "opacity-60" : ""}`}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              handleWatchEpisode(
                                ep.id,
                                season.seasonNumber,
                                ep.episodeNumber,
                                isWatched,
                              )
                            }
                            disabled={watchingEp === ep.id}
                            className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-all ${
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
                          {stillPath && (
                            <div className="hidden h-14 w-24 shrink-0 overflow-hidden rounded-md bg-muted sm:block">
                              <Image
                                src={stillPath}
                                alt={ep.name ?? ""}
                                width={300}
                                height={169}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm">
                              <span className="font-mono text-xs text-muted-foreground">
                                E{String(ep.episodeNumber).padStart(2, "0")}
                              </span>{" "}
                              <span className="font-medium">
                                {ep.name ?? "Untitled"}
                              </span>
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {ep.airDate ?? ""}
                              {ep.airDate && ep.runtimeMinutes ? " · " : ""}
                              {ep.runtimeMinutes ? `${ep.runtimeMinutes}m` : ""}
                            </p>
                            {ep.overview && (
                              <p className="mt-1 hidden line-clamp-2 text-xs leading-relaxed text-muted-foreground/70 sm:block">
                                {ep.overview}
                              </p>
                            )}
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
