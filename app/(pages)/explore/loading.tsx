import { TitleCardSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function ExploreLoading() {
  return (
    <div className="space-y-10">
      {/* Hero skeleton */}
      <div className="-mx-4 -mt-6 sm:-mx-6">
        <Skeleton className="aspect-[21/9] min-h-[280px] max-h-[420px] w-full rounded-none" />
      </div>

      {/* Title row skeletons */}
      {[1, 2, 3].map((section) => (
        <div key={section} className="space-y-4">
          <Skeleton className="h-7 w-40" />
          <div className="flex gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders
              <div key={`row-${section}-${i}`} className="w-[160px] shrink-0">
                <TitleCardSkeleton />
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Genre browser skeleton */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-8 w-36 rounded-lg" />
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders
              key={`chip-${i}`}
              className="h-7 w-20 shrink-0 rounded-full"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
