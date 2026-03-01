"use client";

import {
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconPlayerPlay,
} from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { TitleDetailSkeleton } from "@/components/skeletons";
import { StarRating } from "@/components/star-rating";
import { StatusButton } from "@/components/status-button";
import { TitleCard } from "@/components/title-card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Progress } from "@/components/ui/progress";
import { useRegisterShortcut } from "@/hooks/use-register-shortcut";

interface Episode {
  id: string;
  episodeNumber: number;
  name: string | null;
  overview: string | null;
  stillPath: string | null;
  airDate: string | null;
  runtimeMinutes: number | null;
}

interface Season {
  id: string;
  seasonNumber: number;
  name: string | null;
  episodes: Episode[];
}

interface AvailabilityOffer {
  providerId: number;
  providerName: string;
  logoPath: string | null;
  offerType: string;
}

interface RecommendedTitle {
  id: string;
  tmdbId: number;
  type: "movie" | "tv";
  title: string;
  posterPath: string | null;
  releaseDate: string | null;
  firstAirDate: string | null;
  voteAverage: number | null;
}

interface Title {
  id: string;
  tmdbId: number;
  type: "movie" | "tv";
  title: string;
  originalTitle: string | null;
  overview: string | null;
  releaseDate: string | null;
  firstAirDate: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  popularity: number | null;
  voteAverage: number | null;
  voteCount: number | null;
  status: string | null;
  seasons: Season[];
  availability: AvailabilityOffer[];
  userStatus?: string | null;
  userRating?: number | null;
  episodeWatches?: string[];
}

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 },
  },
};

export default function TitleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [title, setTitle] = useState<Title | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendedTitle[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [openSeason, setOpenSeason] = useState<number | null>(null);
  const [watchingEp, setWatchingEp] = useState<string | null>(null);

  const fetchTitle = useCallback(async () => {
    setLoading(true);
    try {
      const [titleRes, statusRes] = await Promise.all([
        fetch(`/api/titles/${id}`),
        fetch(`/api/titles/${id}/status`),
      ]);
      const titleData = await titleRes.json();
      let statusData = { status: null, rating: null, episodeWatches: [] };
      if (statusRes.ok) {
        statusData = await statusRes.json();
      }
      setTitle({
        ...titleData,
        userStatus: statusData.status,
        userRating: statusData.rating,
        episodeWatches: statusData.episodeWatches ?? [],
      });
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchRecommendations = useCallback(async () => {
    try {
      const res = await fetch(`/api/titles/${id}/recommendations`);
      if (res.ok) {
        const data = await res.json();
        setRecommendations(data ?? []);
      }
    } catch {
      // silent
    }
  }, [id]);

  useEffect(() => {
    fetchTitle();
    fetchRecommendations();
  }, [fetchTitle, fetchRecommendations]);

  // Keyboard shortcuts
  const statusCycle = useMemo(
    () => ["watchlist", "in_progress", "completed"] as const,
    [],
  );

  const handleStatusChange = useCallback(
    async (status: string | null) => {
      // Optimistic update
      setTitle((t) => (t ? { ...t, userStatus: status } : t));
      try {
        const res = await fetch(`/api/titles/${id}/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        if (!res.ok) throw new Error();
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
        // Revert
        setTitle((t) =>
          t ? { ...t, userStatus: title?.userStatus ?? null } : t,
        );
        toast.error("Failed to update status");
      }
    },
    [id, title?.userStatus],
  );

  const handleRating = useCallback(
    async (ratingStars: number) => {
      const prev = title?.userRating ?? 0;
      // Optimistic update
      setTitle((t) => (t ? { ...t, userRating: ratingStars } : t));
      try {
        const res = await fetch(`/api/titles/${id}/rating`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ratingStars }),
        });
        if (!res.ok) throw new Error();
        toast.success(
          ratingStars > 0
            ? `Rated ${ratingStars} star${ratingStars > 1 ? "s" : ""}`
            : "Rating removed",
        );
      } catch {
        setTitle((t) => (t ? { ...t, userRating: prev } : t));
        toast.error("Failed to update rating");
      }
    },
    [id, title?.userRating],
  );

  const handleWatchMovie = useCallback(async () => {
    setTitle((t) => (t ? { ...t, userStatus: "completed" } : t));
    try {
      const res = await fetch(`/api/movies/${id}/watch`, { method: "POST" });
      if (!res.ok) throw new Error();
      toast.success(`Marked "${title?.title}" as watched`);
    } catch {
      setTitle((t) =>
        t ? { ...t, userStatus: title?.userStatus ?? null } : t,
      );
      toast.error("Failed to mark as watched");
    }
  }, [id, title?.title, title?.userStatus]);

  const handleWatchEpisode = useCallback(
    async (
      episodeId: string,
      seasonNum: number,
      epNum: number,
      isWatched: boolean,
    ) => {
      setWatchingEp(episodeId);
      if (isWatched) {
        // Optimistic unwatch
        setTitle((t) => {
          if (!t) return t;
          return {
            ...t,
            episodeWatches: (t.episodeWatches ?? []).filter(
              (w) => w !== episodeId,
            ),
            userStatus:
              t.userStatus === "completed" ? "in_progress" : t.userStatus,
          };
        });
        try {
          const res = await fetch(`/api/episodes/${episodeId}/watch`, {
            method: "DELETE",
          });
          if (!res.ok) throw new Error();
          toast.success(`Unwatched S${seasonNum} E${epNum}`);
        } catch {
          setTitle((t) => {
            if (!t) return t;
            const watches = [...(t.episodeWatches ?? [])];
            if (!watches.includes(episodeId)) watches.push(episodeId);
            return { ...t, episodeWatches: watches };
          });
          toast.error("Failed to unmark episode");
        }
      } else {
        // Optimistic watch
        setTitle((t) => {
          if (!t) return t;
          const watches = [...(t.episodeWatches ?? [])];
          if (!watches.includes(episodeId)) watches.push(episodeId);
          return {
            ...t,
            episodeWatches: watches,
            userStatus: t.userStatus ?? "in_progress",
          };
        });
        try {
          const res = await fetch(`/api/episodes/${episodeId}/watch`, {
            method: "POST",
          });
          if (!res.ok) throw new Error();
          toast.success(`Watched S${seasonNum} E${epNum}`);
        } catch {
          setTitle((t) => {
            if (!t) return t;
            return {
              ...t,
              episodeWatches: (t.episodeWatches ?? []).filter(
                (w) => w !== episodeId,
              ),
            };
          });
          toast.error("Failed to mark episode");
        }
      }
      setWatchingEp(null);
    },
    [],
  );

  // Page keyboard shortcuts
  useRegisterShortcut("title-cycle-status", {
    keys: ["w"],
    description: "Cycle status",
    action: () => {
      if (!title) return;
      const currentIdx = statusCycle.indexOf(
        title.userStatus as (typeof statusCycle)[number],
      );
      const nextStatus =
        currentIdx === statusCycle.length - 1
          ? null
          : statusCycle[currentIdx + 1];
      handleStatusChange(nextStatus);
    },
    scope: "Title",
  });

  useRegisterShortcut("title-mark-watched", {
    keys: ["m"],
    description: "Mark watched",
    action: () => {
      if (!title) return;
      if (title.type === "movie") {
        handleWatchMovie();
      }
    },
    scope: "Title",
  });

  useRegisterShortcut("title-escape", {
    keys: ["Escape"],
    description: "Go back",
    action: () => router.back(),
    scope: "Title",
  });

  // Rating shortcuts 1-5
  for (const n of [1, 2, 3, 4, 5]) {
    // biome-ignore lint/correctness/useHookAtTopLevel: loop is stable
    useRegisterShortcut(`title-rate-${n}`, {
      keys: [String(n)],
      description: `Rate ${n} star${n > 1 ? "s" : ""}`,
      action: () => handleRating(n),
      scope: "Title",
    });
  }

  if (loading) {
    return <TitleDetailSkeleton />;
  }
  if (!title) {
    return (
      <p className="py-24 text-center text-muted-foreground">Title not found</p>
    );
  }

  const posterUrl = title.posterPath
    ? `https://image.tmdb.org/t/p/w500${title.posterPath}`
    : null;
  const backdropUrl = title.backdropPath
    ? `https://image.tmdb.org/t/p/w1280${title.backdropPath}`
    : null;
  const dateStr = title.releaseDate ?? title.firstAirDate;
  const year = dateStr?.slice(0, 4);

  async function handleMarkSeason(season: Season) {
    const unwatched = season.episodes.filter(
      (ep) => !title?.episodeWatches?.includes(ep.id),
    );
    if (unwatched.length === 0) return;

    // Optimistic update
    setTitle((t) => {
      if (!t) return t;
      const watches = [...(t.episodeWatches ?? [])];
      for (const ep of unwatched) {
        if (!watches.includes(ep.id)) watches.push(ep.id);
      }
      return { ...t, episodeWatches: watches };
    });

    try {
      const res = await fetch(`/api/seasons/${season.id}/watch`, {
        method: "POST",
      });
      if (!res.ok) throw new Error();
      toast.success(
        `Watched all of ${season.name ?? `Season ${season.seasonNumber}`}`,
      );
    } catch {
      toast.error("Failed to mark some episodes");
    }
  }

  async function handleUnmarkSeason(season: Season) {
    const seasonEpIds = season.episodes.map((ep) => ep.id);

    // Optimistic update
    setTitle((t) => {
      if (!t) return t;
      return {
        ...t,
        episodeWatches: (t.episodeWatches ?? []).filter(
          (w) => !seasonEpIds.includes(w),
        ),
        userStatus: t.userStatus === "completed" ? "in_progress" : t.userStatus,
      };
    });

    try {
      const res = await fetch(`/api/seasons/${season.id}/watch`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success(
        `Unwatched all of ${season.name ?? `Season ${season.seasonNumber}`}`,
      );
    } catch {
      toast.error("Failed to unmark some episodes");
    }
  }

  // Group availability by offerType
  const availByType: Record<string, AvailabilityOffer[]> = {};
  for (const offer of title.availability ?? []) {
    if (!availByType[offer.offerType]) availByType[offer.offerType] = [];
    availByType[offer.offerType].push(offer);
  }

  const offerLabels: Record<string, string> = {
    flatrate: "Stream",
    rent: "Rent",
    buy: "Buy",
    free: "Free",
    ads: "With Ads",
  };

  return (
    <div className="space-y-10">
      {/* Breadcrumb */}
      <Breadcrumb className="relative z-20">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/dashboard" />}>
              Home
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{title.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Backdrop hero */}
      {backdropUrl && (
        <div className="relative -mx-4 -mt-4 h-80 overflow-hidden sm:-mx-6 sm:h-[28rem]">
          <Image
            src={backdropUrl}
            alt=""
            fill
            className="object-cover"
            priority
          />
          {/* Multi-layer gradient for text readability on any backdrop */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/30" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-background/15" />
          {/* Film grain overlay */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            }}
          />
        </div>
      )}

      {/* Title header */}
      <motion.div
        className={`flex flex-col gap-8 sm:flex-row ${backdropUrl ? "-mt-32 relative z-10" : ""}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring" as const, stiffness: 200, damping: 24 }}
      >
        {posterUrl && (
          <div className="shrink-0">
            <div className="overflow-hidden rounded-2xl ring-1 ring-foreground/5 shadow-2xl shadow-black/50">
              <Image
                src={posterUrl}
                alt={title.title}
                width={220}
                height={330}
                className="h-auto w-[180px] sm:w-[220px]"
                priority
              />
            </div>
          </div>
        )}

        <div className="flex-1 space-y-5">
          <div>
            <h1 className="font-display text-4xl tracking-tight sm:text-5xl">
              {title.title}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-primary">
                {title.type}
              </span>
              {year && <span>{year}</span>}
              {title.voteAverage != null && title.voteAverage > 0 && (
                <span className="flex items-center gap-1 text-primary">
                  ★ {title.voteAverage.toFixed(1)}
                  {title.voteCount != null && (
                    <span className="text-muted-foreground">
                      ({title.voteCount.toLocaleString()})
                    </span>
                  )}
                </span>
              )}
              {title.status && (
                <span className="rounded border border-border/50 px-2 py-0.5 text-xs">
                  {title.status}
                </span>
              )}
            </div>
          </div>

          {title.overview && (
            <p className="max-w-2xl leading-relaxed text-muted-foreground">
              {title.overview}
            </p>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <StatusButton
              currentStatus={title.userStatus ?? null}
              onChange={handleStatusChange}
            />
            {title.type === "movie" && (
              <button
                type="button"
                onClick={handleWatchMovie}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-all active:scale-[0.97] hover:shadow-md hover:shadow-primary/20"
              >
                <IconPlayerPlay size={15} />
                Mark Watched
              </button>
            )}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Rate:</span>
              <StarRating
                value={title.userRating ?? 0}
                onChange={handleRating}
              />
            </div>
          </div>

          {/* Availability */}
          {Object.keys(availByType).length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Where to Watch
              </h3>
              <div className="flex flex-wrap gap-4">
                {Object.entries(availByType).map(([type, offers]) => (
                  <div key={type} className="space-y-1.5">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                      {offerLabels[type] ?? type}
                    </span>
                    <div className="flex gap-1.5">
                      {offers.map((offer) => (
                        <ProviderBadge
                          key={offer.providerId}
                          name={offer.providerName}
                          logoPath={offer.logoPath}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Seasons & Episodes (TV) */}
      {title.type === "tv" && title.seasons.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-display text-2xl tracking-tight">Seasons</h2>
          <div className="space-y-2">
            {title.seasons.map((season) => {
              const isOpen = openSeason === season.seasonNumber;
              const watchedCount = season.episodes.filter((ep) =>
                title.episodeWatches?.includes(ep.id),
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
                    className="flex w-full cursor-pointer items-center justify-between p-4 text-left transition-colors hover:bg-accent/50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium">
                        {season.name ?? `Season ${season.seasonNumber}`}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {watchedCount}/{totalCount}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {totalCount > 0 && (
                        <>
                          <span className="text-xs tabular-nums text-muted-foreground sm:hidden">
                            {Math.round(progressPercent)}%
                          </span>
                          <div className="hidden w-24 sm:block">
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
                          className="rounded-md px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-primary transition-colors hover:bg-primary/10"
                        >
                          Mark all
                        </button>
                      )}
                      {totalCount > 0 && watchedCount === totalCount && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUnmarkSeason(season);
                          }}
                          className="rounded-md px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        >
                          Unmark all
                        </button>
                      )}
                      {isOpen ? (
                        <IconChevronUp
                          size={16}
                          className="text-muted-foreground"
                        />
                      ) : (
                        <IconChevronDown
                          size={16}
                          className="text-muted-foreground"
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
                          type: "spring" as const,
                          stiffness: 300,
                          damping: 30,
                        }}
                        className="overflow-hidden border-t border-border/50"
                      >
                        {season.episodes.map((ep) => {
                          const isWatched = title.episodeWatches?.includes(
                            ep.id,
                          );
                          const stillUrl = ep.stillPath
                            ? `https://image.tmdb.org/t/p/w300${ep.stillPath}`
                            : null;
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
                                    !!isWatched,
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
                                      type: "spring" as const,
                                      stiffness: 500,
                                      damping: 15,
                                    }}
                                  >
                                    <IconCheck size={14} />
                                  </motion.div>
                                )}
                              </button>
                              {stillUrl && (
                                <div className="hidden h-14 w-24 shrink-0 overflow-hidden rounded-md bg-muted sm:block">
                                  <Image
                                    src={stillUrl}
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
                                  {ep.runtimeMinutes
                                    ? `${ep.runtimeMinutes}m`
                                    : ""}
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
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-display text-2xl tracking-tight">Recommended</h2>
          <motion.div
            className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {recommendations.slice(0, 12).map((rec) => (
              <motion.div key={rec.id} variants={staggerItem}>
                <TitleCard
                  id={rec.id}
                  tmdbId={rec.tmdbId}
                  type={rec.type}
                  title={rec.title}
                  posterPath={rec.posterPath}
                  releaseDate={rec.releaseDate ?? rec.firstAirDate}
                  voteAverage={rec.voteAverage}
                />
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}
    </div>
  );
}

function ProviderBadge({
  name,
  logoPath,
}: {
  name: string;
  logoPath: string | null;
}) {
  const logoUrl = logoPath ? `https://image.tmdb.org/t/p/w92${logoPath}` : null;

  return (
    <div className="group relative">
      <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-border/30 bg-card transition-transform hover:scale-105">
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt={name}
            width={40}
            height={40}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-[8px] font-medium text-muted-foreground">
            {name.slice(0, 2)}
          </span>
        )}
      </div>
      <div className="pointer-events-none absolute -top-8 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md bg-popover px-2 py-1 text-[10px] font-medium text-popover-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100">
        {name}
      </div>
    </div>
  );
}
