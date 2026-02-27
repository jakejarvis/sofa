"use client";

import {
  IconDeviceTv,
  IconPlayerPlay,
  IconSparkles,
} from "@tabler/icons-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { TitleCard } from "@/components/title-card";
import { useSession } from "@/lib/auth/client";

interface ContinueWatchingItem {
  title: {
    id: string;
    title: string;
    posterPath: string | null;
    type: string;
  };
  nextEpisode: {
    id: string;
    seasonNumber: number;
    episodeNumber: number;
    name: string | null;
  } | null;
}

interface FeedTitle {
  id?: string;
  titleId?: string;
  title: string;
  type: string;
  tmdbId?: number;
  posterPath: string | null;
  releaseDate?: string | null;
  firstAirDate?: string | null;
  voteAverage?: number | null;
}

export default function DashboardPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [continueWatching, setContinueWatching] = useState<
    ContinueWatchingItem[]
  >([]);
  const [newAvailable, setNewAvailable] = useState<FeedTitle[]>([]);
  const [recommendations, setRecommendations] = useState<FeedTitle[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeeds = useCallback(async () => {
    setLoading(true);
    try {
      const [cwRes, naRes, recRes] = await Promise.all([
        fetch("/api/feed/continue-watching"),
        fetch("/api/feed/new-available"),
        fetch("/api/feed/recommendations"),
      ]);
      if (cwRes.ok) setContinueWatching(await cwRes.json());
      if (naRes.ok) setNewAvailable(await naRes.json());
      if (recRes.ok) setRecommendations(await recRes.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isPending) return;
    if (!session?.user) {
      router.replace("/login");
      return;
    }
    fetchFeeds();
  }, [session, isPending, router, fetchFeeds]);

  if (isPending || loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const isEmpty =
    continueWatching.length === 0 &&
    newAvailable.length === 0 &&
    recommendations.length === 0;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-3xl tracking-tight">
          Welcome back{session?.user?.name ? `, ${session.user.name}` : ""}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s what&apos;s happening with your library
        </p>
      </div>

      {isEmpty && (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border/50 py-16 text-center">
          <div className="rounded-full bg-primary/10 p-4">
            <IconDeviceTv size={32} className="text-primary" />
          </div>
          <div className="space-y-1">
            <p className="font-medium">Your library is empty</p>
            <p className="text-sm text-muted-foreground">
              Search for movies and TV shows to start tracking
            </p>
          </div>
          <Link
            href="/search"
            className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-all hover:shadow-md hover:shadow-primary/20"
          >
            Start searching
          </Link>
        </div>
      )}

      {/* Continue Watching */}
      {continueWatching.length > 0 && (
        <FeedSection
          title="Continue Watching"
          icon={<IconPlayerPlay size={20} className="text-primary" />}
        >
          <div className="feed-scroll flex gap-4 overflow-x-auto pb-2">
            {continueWatching.map((item) => (
              <ContinueWatchingCard key={item.title.id} item={item} />
            ))}
          </div>
        </FeedSection>
      )}

      {/* New on Streaming */}
      {newAvailable.length > 0 && (
        <FeedSection
          title="In Your Library"
          icon={<IconSparkles size={20} className="text-primary" />}
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {newAvailable.slice(0, 10).map((t) => (
              <TitleCard
                key={t.titleId ?? t.id}
                id={t.titleId ?? t.id}
                tmdbId={t.tmdbId ?? 0}
                type={t.type}
                title={t.title}
                posterPath={t.posterPath}
                releaseDate={t.releaseDate ?? t.firstAirDate}
                voteAverage={t.voteAverage}
              />
            ))}
          </div>
        </FeedSection>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <FeedSection
          title="Recommended for You"
          icon={<IconSparkles size={20} className="text-primary" />}
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {recommendations.slice(0, 10).map((t) => (
              <TitleCard
                key={t.id}
                id={t.id}
                tmdbId={t.tmdbId ?? 0}
                type={t.type}
                title={t.title}
                posterPath={t.posterPath}
                releaseDate={t.releaseDate ?? t.firstAirDate}
                voteAverage={t.voteAverage}
              />
            ))}
          </div>
        </FeedSection>
      )}
    </div>
  );
}

function FeedSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="font-display text-xl tracking-tight">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function ContinueWatchingCard({ item }: { item: ContinueWatchingItem }) {
  const posterUrl = item.title.posterPath
    ? `https://image.tmdb.org/t/p/w300${item.title.posterPath}`
    : null;

  return (
    <Link
      href={`/titles/${item.title.id}`}
      className="group flex w-56 shrink-0 gap-3 rounded-lg border border-border/30 bg-card/50 p-3 transition-all hover:border-primary/20 hover:bg-card"
    >
      <div className="h-20 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
        {posterUrl ? (
          <Image
            src={posterUrl}
            alt={item.title.title}
            width={56}
            height={80}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[8px] text-muted-foreground">
            ?
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="line-clamp-2 text-sm font-medium leading-snug">
          {item.title.title}
        </p>
        {item.nextEpisode && (
          <p className="text-xs text-muted-foreground">
            S{item.nextEpisode.seasonNumber} E{item.nextEpisode.episodeNumber}
          </p>
        )}
        <p className="text-[10px] font-medium uppercase tracking-wider text-primary">
          Up next
        </p>
      </div>
    </Link>
  );
}
