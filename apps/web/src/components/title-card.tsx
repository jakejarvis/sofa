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
import { Link, useNavigate } from "@tanstack/react-router";
import { type MotionStyle, type MotionValue, motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useProgress } from "@/components/navigation-progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTiltEffect } from "@/hooks/use-tilt-effect";
import { orpc } from "@/lib/orpc/client";

export function TitleCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl bg-card ring-1 ring-white/[0.06]">
      <Skeleton className="aspect-[2/3] w-full rounded-none" />
      <div className="px-3 pt-2.5 pb-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="mt-1.5 h-3 w-1/2" />
      </div>
    </div>
  );
}

type TitleStatus = "watchlist" | "in_progress" | "completed";

interface TiltStyles {
  imageStyle: MotionStyle;
  glareBackground: MotionValue<string>;
  glareOpacity: MotionValue<number>;
}

interface CardInnerProps {
  title: string;
  type: string;
  posterPath: string | null;
  releaseDate?: string | null;
  voteAverage?: number | null;
  userStatus?: TitleStatus | null;
  episodeProgress?: { watched: number; total: number } | null;
  tiltStyles?: TiltStyles;
}

export interface TitleCardProps extends CardInnerProps {
  id?: string;
  tmdbId: number;
}

const statusConfig = {
  watchlist: {
    icon: IconBookmarkFilled,
    label: "On Watchlist",
    badgeClass: "bg-status-watching/90 text-white",
  },
  in_progress: {
    icon: IconPlayerPlayFilled,
    label: "Watching",
    badgeClass: "bg-status-watching/90 text-white",
  },
  completed: {
    icon: IconCircleCheckFilled,
    label: "Completed",
    badgeClass: "bg-status-completed/90 text-white",
  },
} as const;

function QuickAddButton({
  tmdbId,
  type,
  userStatus,
}: {
  tmdbId: number;
  type: "movie" | "tv";
  userStatus?: TitleStatus | null;
}) {
  const [addedStatus, setAddedStatus] = useState<TitleStatus | null>(
    userStatus ?? null,
  );

  // Sync local state when prop changes (e.g. after navigation or SWR revalidation)
  useEffect(() => {
    if (userStatus) {
      setAddedStatus(userStatus);
    }
  }, [userStatus]);

  const quickAddMutation = useMutation(
    orpc.titles.quickAdd.mutationOptions({
      onSuccess: () => setAddedStatus("watchlist"),
    }),
  );

  const isAdded = addedStatus != null;
  const config = addedStatus ? statusConfig[addedStatus] : null;

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (quickAddMutation.isPending || isAdded) return;
    quickAddMutation.mutate({ tmdbId, type });
  }

  if (isAdded && config) {
    const StatusIcon = config.icon;
    return (
      <Tooltip>
        <TooltipTrigger
          className="absolute top-2 right-2 z-10 flex size-8 cursor-default items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm"
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
        className="absolute top-2 right-2 z-10 flex size-8 items-center justify-center rounded-full bg-black/50 text-white opacity-60 backdrop-blur-sm transition-opacity hover:bg-black/70 focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
        render={<button type="button" />}
      >
        {!quickAddMutation.isPending && <IconPlus className="size-4" />}
        {quickAddMutation.isPending && (
          <IconLoader className="size-4 animate-spin" />
        )}
      </TooltipTrigger>
      <TooltipContent side="bottom">Add to Watchlist</TooltipContent>
    </Tooltip>
  );
}

function ProgressBar({ watched, total }: { watched: number; total: number }) {
  const pct = total > 0 ? (watched / total) * 100 : 0;
  return (
    <Tooltip>
      <TooltipTrigger
        className="absolute right-0 bottom-0 left-0 z-10 h-1 cursor-default bg-white/10"
        render={<div />}
      >
        <div
          className="h-full bg-status-watching transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </TooltipTrigger>
      <TooltipContent side="top">
        {watched}/{total} episodes
      </TooltipContent>
    </Tooltip>
  );
}

function CardInner({
  title,
  type,
  posterPath,
  releaseDate,
  voteAverage,
  userStatus,
  episodeProgress,
  tiltStyles,
}: CardInnerProps) {
  const year = releaseDate?.slice(0, 4);
  const TypeIcon = type === "movie" ? IconMovie : IconDeviceTv;

  const ringClass = userStatus
    ? "ring-primary/25 shadow-sm shadow-primary/5"
    : "ring-white/[0.06]";

  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-card ring-1 transition-[box-shadow,ring-color] duration-200 ease-out hover:shadow-lg hover:shadow-primary/5 hover:ring-primary/25 ${ringClass}`}
    >
      <div className="aspect-[2/3] overflow-hidden bg-card">
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
          <div className="relative flex h-full items-center justify-center overflow-hidden bg-gradient-to-br from-card via-secondary to-muted">
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/10 via-transparent to-transparent" />
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
          <p className="line-clamp-1 font-medium text-sm leading-snug">
            {title}
          </p>
        </div>
        <div className="mt-1.5 flex items-center gap-2 text-muted-foreground text-xs">
          <TypeIcon
            aria-hidden={true}
            className="size-3.5 shrink-0 text-primary/60"
          />
          {year && <span>{year}</span>}
          {voteAverage != null && voteAverage > 0 && (
            <span className="ml-auto flex items-center gap-0.5 text-primary/80">
              <IconStarFilled aria-hidden={true} className="size-[11px]" />
              {voteAverage.toFixed(1)}
            </span>
          )}
        </div>
      </div>

      {episodeProgress && episodeProgress.watched > 0 && (
        <ProgressBar
          watched={episodeProgress.watched}
          total={episodeProgress.total}
        />
      )}
    </div>
  );
}

export function TitleCard({
  id,
  tmdbId,
  type,
  title,
  posterPath,
  releaseDate,
  voteAverage,
  userStatus,
  episodeProgress,
}: TitleCardProps) {
  const tilt = useTiltEffect();
  const navigate = useNavigate();
  const progress = useProgress();
  const resolveMutation = useMutation(
    orpc.titles.resolve.mutationOptions({
      onSuccess: ({ id: resolvedId }) => {
        if (resolvedId)
          void navigate({ to: "/titles/$id", params: { id: resolvedId } });
        else progress.done();
      },
      onError: () => {
        progress.done();
        toast.error("Failed to load title");
      },
    }),
  );

  const cardContent = (
    <motion.div ref={tilt.ref} style={tilt.containerStyle} {...tilt.handlers}>
      <CardInner
        title={title}
        type={type}
        posterPath={posterPath}
        releaseDate={releaseDate}
        voteAverage={voteAverage}
        userStatus={userStatus}
        episodeProgress={episodeProgress}
        tiltStyles={{
          imageStyle: tilt.imageStyle,
          glareBackground: tilt.glareBackground,
          glareOpacity: tilt.glareOpacity,
        }}
      />
    </motion.div>
  );

  return (
    <div className="group relative">
      <QuickAddButton
        tmdbId={tmdbId}
        type={type as "movie" | "tv"}
        userStatus={userStatus}
      />
      {id ? (
        <Link to="/titles/$id" params={{ id }}>
          {cardContent}
        </Link>
      ) : (
        <button
          type="button"
          disabled={resolveMutation.isPending}
          className={`w-full text-left ${resolveMutation.isPending ? "pointer-events-none opacity-70" : "cursor-pointer"}`}
          onClick={() => {
            progress.start();
            resolveMutation.mutate({ tmdbId, type: type as "movie" | "tv" });
          }}
        >
          {cardContent}
        </button>
      )}
    </div>
  );
}
