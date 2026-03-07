import { TitleCardSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

function TitleRowSkeleton({ withGenreChips }: { withGenreChips?: boolean }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Skeleton className="size-5 rounded" />
        <Skeleton className="h-6 w-40" />
      </div>
      {withGenreChips && (
        <div className="-mx-4 flex gap-2 overflow-x-hidden px-4 sm:-mx-0 sm:flex-wrap sm:px-0">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders
              key={`chip-${i}`}
              className="h-7 w-20 shrink-0 rounded-full"
            />
          ))}
        </div>
      )}
      <div className="-mx-4 flex gap-4 overflow-hidden px-4 sm:-mx-0 sm:px-0">
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
      {/* Hero skeleton — full viewport width like the actual HeroBanner */}
      <div className="-mt-6 mr-[calc(-50vw+50%)] mb-4 ml-[calc(-50vw+50%)]">
        <Skeleton className="aspect-[21/9] max-h-[420px] min-h-[280px] w-full rounded-none" />
      </div>

      <TitleRowSkeleton />
      <TitleRowSkeleton withGenreChips />
      <TitleRowSkeleton withGenreChips />
    </div>
  );
}
