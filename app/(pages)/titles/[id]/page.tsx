"use client";

import {
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconPlayerPlay,
} from "@tabler/icons-react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { StarRating } from "@/components/star-rating";
import { StatusButton } from "@/components/status-button";
import { TitleCard } from "@/components/title-card";

interface Episode {
  id: string;
  episodeNumber: number;
  name: string | null;
  overview: string | null;
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

export default function TitleDetailPage() {
  const { id } = useParams<{ id: string }>();
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber border-t-transparent" />
      </div>
    );
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

  async function handleStatusChange(status: string | null) {
    await fetch(`/api/titles/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setTitle((t) => (t ? { ...t, userStatus: status } : t));
  }

  async function handleRating(ratingStars: number) {
    await fetch(`/api/titles/${id}/rating`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ratingStars }),
    });
    setTitle((t) => (t ? { ...t, userRating: ratingStars } : t));
  }

  async function handleWatchMovie() {
    await fetch(`/api/movies/${id}/watch`, { method: "POST" });
    setTitle((t) => (t ? { ...t, userStatus: "completed" } : t));
  }

  async function handleWatchEpisode(episodeId: string) {
    setWatchingEp(episodeId);
    await fetch(`/api/episodes/${episodeId}/watch`, { method: "POST" });
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
    setWatchingEp(null);
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
      {/* Backdrop hero */}
      {backdropUrl && (
        <div className="relative -mx-4 -mt-6 h-72 overflow-hidden sm:h-96">
          <Image
            src={backdropUrl}
            alt=""
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/80 to-transparent" />
        </div>
      )}

      {/* Title header */}
      <div
        className={`flex flex-col gap-8 sm:flex-row ${backdropUrl ? "-mt-32 relative z-10" : ""}`}
      >
        {posterUrl && (
          <div className="shrink-0">
            <div className="overflow-hidden rounded-xl shadow-2xl shadow-black/40">
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
              <span className="rounded bg-amber/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-amber">
                {title.type}
              </span>
              {year && <span>{year}</span>}
              {title.voteAverage != null && title.voteAverage > 0 && (
                <span className="flex items-center gap-1 text-amber">
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
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-amber px-4 text-sm font-medium text-background transition-all hover:shadow-md hover:shadow-amber/20"
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
      </div>

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

              return (
                <div
                  key={season.id}
                  className="overflow-hidden rounded-lg border border-border/50 bg-card/50"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setOpenSeason(isOpen ? null : season.seasonNumber)
                    }
                    className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-accent/50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium">
                        {season.name ?? `Season ${season.seasonNumber}`}
                      </span>
                      {watchedCount > 0 && (
                        <span className="text-xs text-amber">
                          {watchedCount}/{totalCount}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {totalCount} ep
                      </span>
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
                  </button>

                  {isOpen && (
                    <div className="border-t border-border/50">
                      {season.episodes.map((ep) => {
                        const isWatched = title.episodeWatches?.includes(ep.id);
                        return (
                          <div
                            key={ep.id}
                            className="flex items-center gap-3 border-b border-border/30 px-4 py-3 last:border-b-0"
                          >
                            <button
                              type="button"
                              onClick={() => handleWatchEpisode(ep.id)}
                              disabled={watchingEp === ep.id}
                              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-all ${
                                isWatched
                                  ? "border-amber bg-amber text-background"
                                  : "border-border/50 hover:border-amber/50 hover:bg-amber/5"
                              }`}
                            >
                              {isWatched && <IconCheck size={14} />}
                            </button>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm">
                                <span className="font-mono text-xs text-muted-foreground">
                                  E{String(ep.episodeNumber).padStart(2, "0")}
                                </span>{" "}
                                <span className="font-medium">
                                  {ep.name ?? "Untitled"}
                                </span>
                              </p>
                              {ep.airDate && (
                                <p className="text-xs text-muted-foreground">
                                  {ep.airDate}
                                  {ep.runtimeMinutes
                                    ? ` · ${ep.runtimeMinutes}m`
                                    : ""}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
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
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {recommendations.slice(0, 12).map((rec) => (
              <TitleCard
                key={rec.id}
                id={rec.id}
                tmdbId={rec.tmdbId}
                type={rec.type}
                title={rec.title}
                posterPath={rec.posterPath}
                releaseDate={rec.releaseDate ?? rec.firstAirDate}
                voteAverage={rec.voteAverage}
              />
            ))}
          </div>
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
    <div
      className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-border/30 bg-card transition-transform hover:scale-105"
      title={name}
    >
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
  );
}
