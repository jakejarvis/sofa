import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import {
  IconBookmarkFilled,
  IconCircleCheckFilled,
  IconDeviceTv,
  IconLoader,
  IconMovie,
  IconPlayerPlayFilled,
  IconPlus,
  IconStarFilled,
} from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { type MotionStyle, type MotionValue, motion } from "motion/react";
import { useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTiltEffect } from "@/hooks/use-tilt-effect";
import { orpc } from "@/lib/orpc/client";
import { thumbHashToUrl } from "@/lib/thumbhash";

export function TitleCardSkeleton() {
  return (
    <div className="bg-card overflow-hidden rounded-xl ring-1 ring-white/[0.06]">
      <Skeleton className="aspect-[2/3] w-full rounded-none" />
      <div className="px-3 pt-2.5 pb-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="mt-1.5 h-3 w-1/2" />
      </div>
    </div>
  );
}

type TitleStatus = "in_watchlist" | "watching" | "caught_up" | "completed";

interface TiltStyles {
  imageStyle: MotionStyle;
  glareBackground: MotionValue<string>;
  glareOpacity: MotionValue<number>;
}

interface CardInnerProps {
  title: string;
  type: string;
  posterPath: string | null;
  posterThumbHash?: string | null;
  releaseDate?: string | null;
  voteAverage?: number | null;
  userStatus?: TitleStatus | null;
  episodeProgress?: { watched: number; total: number } | null;
  tiltStyles?: TiltStyles;
}

export interface TitleCardProps extends CardInnerProps {
  id: string;
}

function useStatusConfig() {
  const { t } = useLingui();
  return {
    in_watchlist: {
      icon: IconBookmarkFilled,
      label: t`On Watchlist`,
      badgeClass: "bg-status-watching/90 text-white",
    },
    watching: {
      icon: IconPlayerPlayFilled,
      label: t`Watching`,
      badgeClass: "bg-status-watching/90 text-white",
    },
    caught_up: {
      icon: IconCircleCheckFilled,
      label: t`Caught Up`,
      badgeClass: "bg-status-watching/90 text-white",
    },
    completed: {
      icon: IconCircleCheckFilled,
      label: t`Completed`,
      badgeClass: "bg-status-completed/90 text-white",
    },
  } as const;
}

function QuickAddButton({ id, userStatus }: { id: string; userStatus?: TitleStatus | null }) {
  const { t } = useLingui();
  const statusConfig = useStatusConfig();
  const [optimisticStatus, setOptimisticStatus] = useState<TitleStatus | null>(null);

  const quickAddMutation = useMutation(
    orpc.titles.quickAdd.mutationOptions({
      onSuccess: () => setOptimisticStatus("in_watchlist"),
    }),
  );

  const addedStatus = optimisticStatus ?? userStatus ?? null;
  const isAdded = addedStatus != null;
  const config = addedStatus ? statusConfig[addedStatus] : null;

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (quickAddMutation.isPending || isAdded) return;
    quickAddMutation.mutate({ id });
  }

  if (isAdded && config) {
    const StatusIcon = config.icon;
    return (
      <Tooltip>
        <TooltipTrigger
          className="absolute end-2 top-2 z-10 flex size-8 cursor-default items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm"
          render={<div />}
        >
          <StatusIcon className="size-4" />
        </TooltipTrigger>
        <TooltipContent side="bottom">{config.label}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger
        onClick={handleClick}
        className="absolute end-2 top-2 z-10 flex size-8 items-center justify-center rounded-full bg-black/50 text-white opacity-60 backdrop-blur-sm transition-opacity hover:bg-black/70 focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
        render={<button type="button" />}
      >
        {!quickAddMutation.isPending && <IconPlus className="size-4" />}
        {quickAddMutation.isPending && <IconLoader className="size-4 animate-spin" />}
      </TooltipTrigger>
      <TooltipContent side="bottom">{t`Add to Watchlist`}</TooltipContent>
    </Tooltip>
  );
}

function ProgressBar({ watched, total }: { watched: number; total: number }) {
  const { t } = useLingui();
  const pct = total > 0 ? (watched / total) * 100 : 0;
  return (
    <Tooltip>
      <TooltipTrigger
        className="absolute right-0 bottom-0 left-0 z-10 h-1 cursor-default bg-white/10"
        render={<div />}
      >
        <div
          className="bg-status-watching h-full transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </TooltipTrigger>
      <TooltipContent side="top">
        {t`${watched}/${plural(total, { one: "# episode", other: "# episodes" })}`}
      </TooltipContent>
    </Tooltip>
  );
}

function CardInner({
  title,
  type,
  posterPath,
  posterThumbHash,
  releaseDate,
  voteAverage,
  userStatus,
  episodeProgress,
  tiltStyles,
}: CardInnerProps) {
  const statusConfig = useStatusConfig();
  const year = releaseDate?.slice(0, 4);
  const TypeIcon = type === "movie" ? IconMovie : IconDeviceTv;
  const placeholderUrl = thumbHashToUrl(posterThumbHash);

  const ringClass = userStatus ? "ring-primary/25 shadow-sm shadow-primary/5" : "ring-white/[0.06]";

  return (
    <div
      className={`bg-card hover:shadow-primary/5 hover:ring-primary/25 relative overflow-hidden rounded-xl ring-1 transition-[box-shadow,ring-color] duration-200 ease-out hover:shadow-lg ${ringClass}`}
    >
      <div
        className="bg-card aspect-[2/3] overflow-hidden"
        style={
          placeholderUrl
            ? {
                backgroundImage: `url(${placeholderUrl})`,
                backgroundSize: "cover",
              }
            : undefined
        }
      >
        {posterPath ? (
          <motion.div style={tiltStyles?.imageStyle}>
            <img
              src={posterPath}
              alt={title}
              width={300}
              height={450}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </motion.div>
        ) : (
          <div className="from-card via-secondary to-muted relative flex h-full items-center justify-center overflow-hidden bg-gradient-to-br">
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
              }}
            />
            <div className="from-primary/10 absolute inset-0 bg-gradient-to-t via-transparent to-transparent" />
            <div className="relative px-3 text-center">
              <p className="font-display text-foreground/70 text-sm leading-snug tracking-tight">
                {title}
              </p>
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
        {tiltStyles && (
          <motion.div
            className="pointer-events-none absolute inset-0 z-[5] rounded-xl"
            style={{
              background: tiltStyles.glareBackground,
              opacity: tiltStyles.glareOpacity,
            }}
          />
        )}
      </div>

      <div className="px-3 pt-2.5 pb-3">
        <div className="flex items-center gap-1.5">
          {userStatus && (
            <Tooltip>
              <TooltipTrigger
                className="shrink-0 cursor-default"
                render={<div className="flex items-center" />}
              >
                <span className="relative flex size-2">
                  <span
                    className={`absolute inline-flex h-full w-full rounded-full opacity-40 ${userStatus === "completed" ? "bg-status-completed" : "bg-status-watching"}`}
                  />
                  <span
                    className={`relative inline-flex size-2 rounded-full ${userStatus === "completed" ? "bg-status-completed" : "bg-status-watching"}`}
                  />
                </span>
              </TooltipTrigger>
              <TooltipContent>{statusConfig[userStatus].label}</TooltipContent>
            </Tooltip>
          )}
          <p className="line-clamp-1 text-sm leading-snug font-medium">{title}</p>
        </div>
        <div className="text-muted-foreground mt-1.5 flex items-center gap-2 text-xs">
          <TypeIcon aria-hidden={true} className="text-primary/60 size-3.5 shrink-0" />
          {year && <span>{year}</span>}
          {voteAverage != null && voteAverage > 0 && (
            <span className="text-primary/80 ml-auto flex items-center gap-0.5">
              <IconStarFilled aria-hidden={true} className="size-[11px]" />
              {voteAverage.toFixed(1)}
            </span>
          )}
        </div>
      </div>

      {episodeProgress && episodeProgress.watched > 0 && (
        <ProgressBar watched={episodeProgress.watched} total={episodeProgress.total} />
      )}
    </div>
  );
}

export function TitleCard({
  id,
  type,
  title,
  posterPath,
  posterThumbHash,
  releaseDate,
  voteAverage,
  userStatus,
  episodeProgress,
}: TitleCardProps) {
  const {
    ref: tiltRef,
    containerStyle,
    imageStyle,
    glareBackground,
    glareOpacity,
    handlers,
  } = useTiltEffect();

  const cardContent = (
    <motion.div ref={tiltRef} style={containerStyle} {...handlers}>
      <CardInner
        title={title}
        type={type}
        posterPath={posterPath}
        posterThumbHash={posterThumbHash}
        releaseDate={releaseDate}
        voteAverage={voteAverage}
        userStatus={userStatus}
        episodeProgress={episodeProgress}
        tiltStyles={{
          imageStyle,
          glareBackground,
          glareOpacity,
        }}
      />
    </motion.div>
  );

  return (
    <div className="group relative">
      <QuickAddButton id={id} userStatus={userStatus} />
      <Link to="/titles/$id" params={{ id }}>
        {cardContent}
      </Link>
    </div>
  );
}
