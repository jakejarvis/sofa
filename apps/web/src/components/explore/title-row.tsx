import { TitleCard } from "@/components/title-card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TitleRowItem {
  tmdbId: number;
  type: "movie" | "tv";
  title: string;
  posterPath: string | null;
  releaseDate: string | null;
  firstAirDate: string | null;
  voteAverage: number | null;
}

interface TitleRowProps {
  heading: string;
  icon: React.ReactNode;
  items: TitleRowItem[];
  userStatuses?: Record<string, "watchlist" | "in_progress" | "completed">;
  episodeProgress?: Record<string, { watched: number; total: number }>;
}

export function TitleRow({
  heading,
  icon,
  items,
  userStatuses,
  episodeProgress,
}: TitleRowProps) {
  if (items.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-balance font-display text-xl tracking-tight">
          {heading}
        </h2>
      </div>
      <ScrollArea scrollFade hideScrollbar className="-mx-6 sm:-mx-2">
        <div className="flex gap-4 px-6 py-2 sm:px-2">
          {items.map((item, i) => (
            <div
              key={`${item.type}-${item.tmdbId}`}
              className="w-[140px] shrink-0 sm:w-[160px]"
            >
              <div
                className="animate-stagger-item"
                style={{ "--stagger-index": i } as React.CSSProperties}
              >
                <TitleCard
                  tmdbId={item.tmdbId}
                  type={item.type}
                  title={item.title}
                  posterPath={item.posterPath}
                  releaseDate={item.releaseDate ?? item.firstAirDate}
                  voteAverage={item.voteAverage}
                  userStatus={userStatuses?.[`${item.tmdbId}-${item.type}`]}
                  episodeProgress={
                    episodeProgress?.[`${item.tmdbId}-${item.type}`]
                  }
                />
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </section>
  );
}
