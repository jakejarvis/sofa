import { IconThumbUp } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { TitleCard, TitleCardSkeleton } from "@/components/title-card";
import { Skeleton } from "@/components/ui/skeleton";
import { orpc } from "@/lib/orpc/client";

function RecommendationsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Skeleton className="size-5 rounded" />
        <Skeleton className="h-6 w-36" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        <TitleCardSkeleton />
        <TitleCardSkeleton />
        <TitleCardSkeleton />
        <TitleCardSkeleton />
        <TitleCardSkeleton />
        <TitleCardSkeleton />
      </div>
    </div>
  );
}

export function TitleRecommendations({ titleId }: { titleId: string }) {
  const { data, isLoading } = useQuery(
    orpc.titles.recommendations.queryOptions({ input: { id: titleId } }),
  );

  if (isLoading) return <RecommendationsSkeleton />;
  if (!data || data.recommendations.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <IconThumbUp aria-hidden={true} className="size-5 text-primary" />
        <h2 className="font-display text-xl tracking-tight">Recommended</h2>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {data.recommendations.slice(0, 12).map((rec, i) => (
          <div
            key={rec.id}
            className="animate-stagger-item"
            style={{ "--stagger-index": i } as React.CSSProperties}
          >
            <TitleCard
              id={rec.id}
              tmdbId={rec.tmdbId}
              type={rec.type}
              title={rec.title}
              posterPath={rec.posterPath}
              posterThumbHash={rec.posterThumbHash}
              releaseDate={rec.releaseDate ?? rec.firstAirDate}
              voteAverage={rec.voteAverage}
              userStatus={data.userStatuses[rec.id]}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
