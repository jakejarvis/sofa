"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { TitleCardSkeleton } from "@/components/skeletons";
import { TitleCard } from "@/components/title-card";

interface Genre {
  id: number;
  name: string;
}

interface DiscoverResult {
  tmdbId: number;
  type: "movie" | "tv";
  title: string;
  posterPath: string | null;
  releaseDate: string | null;
  voteAverage: number;
}

interface GenreBrowserProps {
  movieGenres: Genre[];
  tvGenres: Genre[];
}

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
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

export function GenreBrowser({ movieGenres, tvGenres }: GenreBrowserProps) {
  const [mediaType, setMediaType] = useState<"movie" | "tv">("movie");
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const [results, setResults] = useState<DiscoverResult[]>([]);
  const [loading, setLoading] = useState(false);

  const genres = mediaType === "movie" ? movieGenres : tvGenres;

  function switchMediaType(type: "movie" | "tv") {
    setMediaType(type);
    setSelectedGenre(null);
    setResults([]);
  }

  useEffect(() => {
    if (selectedGenre === null) {
      setResults([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch(
      `/api/explore/discover?type=${mediaType}&genre=${selectedGenre}&sort_by=popularity.desc`,
    )
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          setResults(data.results ?? []);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedGenre, mediaType]);

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl tracking-tight">Browse by Genre</h2>
        <div className="flex items-center rounded-lg border border-border/50 bg-card/50 p-0.5">
          <button
            type="button"
            onClick={() => switchMediaType("movie")}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
              mediaType === "movie"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Movies
          </button>
          <button
            type="button"
            onClick={() => switchMediaType("tv")}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
              mediaType === "tv"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            TV Shows
          </button>
        </div>
      </div>

      {/* Genre chips */}
      <div className="feed-scroll -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-0 sm:flex-wrap sm:px-0">
        {genres.map((genre) => (
          <button
            key={genre.id}
            type="button"
            onClick={() =>
              setSelectedGenre(selectedGenre === genre.id ? null : genre.id)
            }
            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-all ${
              selectedGenre === genre.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/50 bg-card/50 text-muted-foreground hover:border-primary/20 hover:text-foreground"
            }`}
          >
            {genre.name}
          </button>
        ))}
      </div>

      {/* Results */}
      {loading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders
            <TitleCardSkeleton key={`genre-skel-${i}`} />
          ))}
        </div>
      )}

      {!loading && results.length > 0 && (
        <motion.div
          className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {results.slice(0, 20).map((r) => (
            <motion.div key={`${r.type}-${r.tmdbId}`} variants={staggerItem}>
              <TitleCard
                tmdbId={r.tmdbId}
                type={r.type}
                title={r.title}
                posterPath={r.posterPath}
                releaseDate={r.releaseDate}
                voteAverage={r.voteAverage}
                href={`/titles/tmdb-${r.tmdbId}-${r.type}`}
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      {!loading && selectedGenre !== null && results.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No titles found for this genre.
        </p>
      )}
    </section>
  );
}
