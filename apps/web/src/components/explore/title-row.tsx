import { useRef } from "react";
import { TitleCard } from "@/components/title-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { hasReachedHorizontalEnd } from "@/hooks/use-infinite-scroll";

interface TitleRowItem {
  id: string;
  type: "movie" | "tv";
  title: string;
  posterPath: string | null;
  posterThumbHash?: string | null;
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
  onEndReached?: () => void;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
}

export function TitleRow({
  heading,
  icon,
  items,
  userStatuses,
  episodeProgress,
  onEndReached,
  hasNextPage = false,
  isFetchingNextPage = false,
}: TitleRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (items.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-balance font-display text-xl tracking-tight">
          {heading}
        </h2>
      </div>
      <ScrollArea
        scrollFade
        hideScrollbar
        className="-mx-6 sm:-mx-2"
        scrollRef={scrollRef}
        onScrollEnd={() => {
          const viewport = scrollRef.current;

          if (
            !viewport ||
            !onEndReached ||
            !hasNextPage ||
            isFetchingNextPage ||
            !hasReachedHorizontalEnd(viewport)
          ) {
            return;
          }

          onEndReached();
        }}
      >
        <div className="flex gap-4 px-6 py-2 sm:px-2">
          {items.map((item, i) => (
            <div key={item.id} className="w-[140px] shrink-0 sm:w-[160px]">
              <div
                className="animate-stagger-item"
                style={{ "--stagger-index": i } as React.CSSProperties}
              >
                <TitleCard
                  id={item.id}
                  type={item.type}
                  title={item.title}
                  posterPath={item.posterPath}
                  posterThumbHash={item.posterThumbHash}
                  releaseDate={item.releaseDate ?? item.firstAirDate}
                  voteAverage={item.voteAverage}
                  userStatus={userStatuses?.[item.id]}
                  episodeProgress={episodeProgress?.[item.id]}
                />
              </div>
            </div>
          ))}
          {isFetchingNextPage && (
            <div className="flex shrink-0 items-center px-4">
              <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}
        </div>
      </ScrollArea>
    </section>
  );
}
