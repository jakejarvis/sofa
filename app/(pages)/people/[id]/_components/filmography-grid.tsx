"use client";

import { IconMovie } from "@tabler/icons-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { PersonCredit } from "@/lib/types/title";

type Filter = "all" | "movie" | "tv";
type Sort = "newest" | "rating";

interface FilmographyGridProps {
  credits: PersonCredit[];
}

export function FilmographyGrid({ credits }: FilmographyGridProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("newest");

  const filtered = useMemo(() => {
    let list = credits;
    if (filter !== "all") {
      list = list.filter((c) => c.type === filter);
    }

    // Deduplicate by titleId (keep the first credit per title)
    const seen = new Set<string>();
    list = list.filter((c) => {
      if (seen.has(c.titleId)) return false;
      seen.add(c.titleId);
      return true;
    });

    return list.sort((a, b) => {
      if (sort === "rating") {
        return (b.voteAverage ?? 0) - (a.voteAverage ?? 0);
      }
      const dateA = a.releaseDate ?? a.firstAirDate ?? "";
      const dateB = b.releaseDate ?? b.firstAirDate ?? "";
      return dateB.localeCompare(dateA);
    });
  }, [credits, filter, sort]);

  if (credits.length === 0) return null;

  const filters: { value: Filter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "movie", label: "Movies" },
    { value: "tv", label: "TV" },
  ];

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IconMovie className="size-5 text-primary" />
          <h2 className="font-display text-xl tracking-tight">Filmography</h2>
          <span className="text-sm text-muted-foreground">
            ({filtered.length})
          </span>
        </div>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          className="rounded-lg border border-border/50 bg-card px-2 py-1 text-xs text-foreground"
        >
          <option value="newest">Newest</option>
          <option value="rating">Rating</option>
        </select>
      </div>

      <div className="flex gap-2">
        {filters.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filter === f.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div
        key={`${filter}-${sort}`}
        className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
      >
        {filtered.map((credit, i) => (
          <div
            key={credit.titleId}
            className="animate-stagger-item"
            style={{ "--stagger-index": i } as React.CSSProperties}
          >
            <Link href={`/titles/${credit.titleId}`} className="group">
              <div className="overflow-hidden rounded-xl bg-card ring-1 ring-white/[0.06] transition-all group-hover:ring-primary/25">
                <div className="aspect-[2/3] w-full bg-muted">
                  {credit.posterPath ? (
                    <Image
                      src={credit.posterPath}
                      alt={credit.title}
                      width={200}
                      height={300}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground/30">
                      <IconMovie className="size-10" />
                    </div>
                  )}
                </div>
                <div className="px-3 pb-3 pt-2.5">
                  <p className="truncate text-xs font-medium">{credit.title}</p>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span className="uppercase">{credit.type}</span>
                    {(credit.releaseDate ?? credit.firstAirDate) && (
                      <span>
                        {(credit.releaseDate ?? credit.firstAirDate)?.slice(
                          0,
                          4,
                        )}
                      </span>
                    )}
                  </div>
                  {credit.character && (
                    <p className="mt-1 truncate text-[10px] text-muted-foreground/70">
                      as {credit.character}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
