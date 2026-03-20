import { Trans, useLingui } from "@lingui/react/macro";
import { IconMovie } from "@tabler/icons-react";
import { useMemo, useState } from "react";

import { TitleCard } from "@/components/title-card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PersonCredit } from "@sofa/api/schemas";

type Filter = "all" | "movie" | "tv";
type Sort = "newest" | "rating";

interface FilmographyGridProps {
  credits: PersonCredit[];
  userStatuses?: Record<string, "in_watchlist" | "watching" | "caught_up" | "completed">;
}

export function FilmographyGrid({ credits, userStatuses }: FilmographyGridProps) {
  const { t } = useLingui();
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

    return [...list].sort((a, b) => {
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
    { value: "all", label: t`All` },
    { value: "movie", label: t`Movies` },
    { value: "tv", label: t`TV` },
  ];

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IconMovie aria-hidden={true} className="text-primary size-5" />
          <h2 className="font-display text-xl tracking-tight text-balance">
            <Trans>Filmography</Trans>
          </h2>
          <span className="text-muted-foreground text-sm">({filtered.length})</span>
        </div>

        <Select
          value={sort}
          onValueChange={(v) => v && setSort(v as Sort)}
          modal={false}
          aria-label="Sort filmography"
        >
          <SelectTrigger size="sm">
            <SelectValue>
              {(value: string | null) =>
                value === "newest" ? t`Newest` : value === "rating" ? t`Rating` : null
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent align="end" alignItemWithTrigger={false} className="p-1">
            <SelectItem value="newest">
              <Trans>Newest</Trans>
            </SelectItem>
            <SelectItem value="rating">
              <Trans>Rating</Trans>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2">
        {filters.map((f) => (
          <Button
            key={f.value}
            variant={filter === f.value ? "default" : "secondary"}
            size="sm"
            onClick={() => setFilter(f.value)}
            className="rounded-full"
          >
            {f.label}
          </Button>
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
            <TitleCard
              id={credit.titleId}
              type={credit.type}
              title={credit.title}
              posterPath={credit.posterPath}
              posterThumbHash={credit.posterThumbHash}
              releaseDate={credit.releaseDate ?? credit.firstAirDate}
              voteAverage={credit.voteAverage}
              userStatus={userStatuses?.[credit.titleId]}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
