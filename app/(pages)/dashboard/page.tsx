"use client";

import {
  IconDeviceTv,
  IconPlayerPlay,
  IconSparkles,
} from "@tabler/icons-react";
import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { DashboardSkeleton } from "@/components/skeletons";
import { StatsSummary } from "@/components/stats-summary";
import { TitleCard } from "@/components/title-card";
import { useSession } from "@/lib/auth/client";

interface ContinueWatchingItem {
  title: {
    id: string;
    title: string;
    posterPath: string | null;
    backdropPath: string | null;
    type: string;
  };
  nextEpisode: {
    id: string;
    seasonNumber: number;
    episodeNumber: number;
    name: string | null;
    stillPath: string | null;
    overview: string | null;
  } | null;
  totalEpisodes: number;
  watchedEpisodes: number;
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

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 200, damping: 24 },
  },
};

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
    return <DashboardSkeleton />;
  }

  const isEmpty =
    continueWatching.length === 0 &&
    newAvailable.length === 0 &&
    recommendations.length === 0;

  return (
    <motion.div
      className="space-y-10"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.15 } },
      }}
    >
      <motion.div variants={sectionVariants}>
        <h1 className="font-display text-3xl tracking-tight">
          Welcome back{session?.user?.name ? `, ${session.user.name}` : ""}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s what&apos;s happening with your library
        </p>
      </motion.div>

      <motion.div variants={sectionVariants}>
        <StatsSummary />
      </motion.div>

      {isEmpty && (
        <motion.div
          variants={sectionVariants}
          className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border/50 py-16 text-center"
        >
          <div className="animate-gentle-float rounded-full bg-primary/10 p-4">
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
        </motion.div>
      )}

      {/* Continue Watching */}
      {continueWatching.length > 0 && (
        <motion.div variants={sectionVariants}>
          <FeedSection
            title="Continue Watching"
            icon={<IconPlayerPlay size={20} className="text-primary" />}
          >
            <motion.div
              className="feed-scroll -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:-mx-0 sm:px-0"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {continueWatching.map((item) => (
                <motion.div key={item.title.id} variants={staggerItem}>
                  <ContinueWatchingCard item={item} />
                </motion.div>
              ))}
            </motion.div>
          </FeedSection>
        </motion.div>
      )}

      {/* In Your Library */}
      {newAvailable.length > 0 && (
        <motion.div variants={sectionVariants}>
          <FeedSection
            title="In Your Library"
            icon={<IconSparkles size={20} className="text-primary" />}
          >
            <motion.div
              className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {newAvailable.slice(0, 10).map((t) => (
                <motion.div key={t.titleId ?? t.id} variants={staggerItem}>
                  <TitleCard
                    id={t.titleId ?? t.id}
                    tmdbId={t.tmdbId ?? 0}
                    type={t.type}
                    title={t.title}
                    posterPath={t.posterPath}
                    releaseDate={t.releaseDate ?? t.firstAirDate}
                    voteAverage={t.voteAverage}
                  />
                </motion.div>
              ))}
            </motion.div>
          </FeedSection>
        </motion.div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <motion.div variants={sectionVariants}>
          <FeedSection
            title="Recommended for You"
            icon={<IconSparkles size={20} className="text-primary" />}
          >
            <motion.div
              className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {recommendations.slice(0, 10).map((t) => (
                <motion.div key={t.id} variants={staggerItem}>
                  <TitleCard
                    id={t.id}
                    tmdbId={t.tmdbId ?? 0}
                    type={t.type}
                    title={t.title}
                    posterPath={t.posterPath}
                    releaseDate={t.releaseDate ?? t.firstAirDate}
                    voteAverage={t.voteAverage}
                  />
                </motion.div>
              ))}
            </motion.div>
          </FeedSection>
        </motion.div>
      )}
    </motion.div>
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
  const stillUrl = item.nextEpisode?.stillPath
    ? `https://image.tmdb.org/t/p/w500${item.nextEpisode.stillPath}`
    : item.title.backdropPath
      ? `https://image.tmdb.org/t/p/w500${item.title.backdropPath}`
      : null;
  const progress =
    item.totalEpisodes > 0
      ? (item.watchedEpisodes / item.totalEpisodes) * 100
      : 0;

  return (
    <Link
      href={`/titles/${item.title.id}`}
      className="group relative w-[calc(100vw-3rem)] shrink-0 overflow-hidden rounded-xl border border-border/30 bg-card/50 transition-all hover:border-primary/20 hover:shadow-lg hover:shadow-black/25 sm:w-72"
    >
      {/* Episode still / backdrop image */}
      <div className="relative aspect-video overflow-hidden bg-muted">
        {stillUrl ? (
          <Image
            src={stillUrl}
            alt={item.nextEpisode?.name ?? item.title.title}
            width={500}
            height={281}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-card via-secondary to-muted">
            <IconPlayerPlay size={32} className="text-muted-foreground/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        {/* Episode label overlay */}
        {item.nextEpisode && (
          <div className="absolute bottom-2.5 left-3 right-3">
            <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-primary">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
              Up next
            </p>
            <p className="mt-0.5 truncate text-sm font-medium text-white">
              <span className="font-mono text-xs text-white/60">
                S{item.nextEpisode.seasonNumber} E
                {item.nextEpisode.episodeNumber}
              </span>{" "}
              {item.nextEpisode.name}
            </p>
          </div>
        )}
      </div>
      {/* Bottom bar with title + progress */}
      <div className="flex items-center gap-3 p-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{item.title.title}</p>
          <p className="text-xs text-muted-foreground">
            {item.watchedEpisodes}/{item.totalEpisodes} episodes
          </p>
        </div>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          <IconPlayerPlay size={14} />
        </div>
      </div>
      {/* Progress bar */}
      {progress > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-muted">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </Link>
  );
}
