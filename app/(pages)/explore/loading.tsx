import { TitleCardSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

function TitleRowSkeleton({ withGenreChips }: { withGenreChips?: boolean }) {
  return (
    <div className="space-y-4">
      <Skeleton className="h-7 w-40" />
      {withGenreChips && (
        <div className="flex gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders
              key={`chip-${i}`}
              className="h-7 w-20 shrink-0 rounded-full"
            />
          ))}
        </div>
      )}
      <div className="flex gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders
          <div key={`card-${i}`} className="w-[140px] shrink-0 sm:w-[160px]">
            <TitleCardSkeleton />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ExploreLoading() {
  return (
    <div className="space-y-10">
      {/* Hero skeleton */}
      <div className="-mx-4 -mt-6 sm:-mx-6">
        <Skeleton className="aspect-[21/9] min-h-[280px] max-h-[420px] w-full rounded-none" />
      </div>

      <TitleRowSkeleton />
      <TitleRowSkeleton withGenreChips />
      <TitleRowSkeleton withGenreChips />
    </div>
  );
}
