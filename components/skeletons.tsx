import { Skeleton } from "@/components/ui/skeleton";

function SectionHeading({ width = "w-32" }: { width?: string }) {
  return (
    <div className="flex items-center gap-2">
      <Skeleton className="size-5 rounded" />
      <Skeleton className={`h-6 ${width}`} />
    </div>
  );
}

export function TitleCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl bg-card ring-1 ring-white/[0.06]">
      <Skeleton className="aspect-[2/3] w-full rounded-none" />
      <div className="px-3 pt-2.5 pb-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="mt-1.5 h-3 w-1/2" />
      </div>
    </div>
  );
}

export function ContinueWatchingSkeleton() {
  return (
    <div className="w-64 shrink-0 overflow-hidden rounded-xl bg-card/50 ring-1 ring-white/[0.06] sm:w-72">
      <Skeleton className="aspect-video w-full rounded-none" />
      <div className="flex items-center gap-3 p-3">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border/30 bg-card/50 p-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-6 rounded-md" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="mt-2 h-7 w-12" />
    </div>
  );
}

export function StatsSectionSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCardSkeleton />
      <StatCardSkeleton />
      <StatCardSkeleton />
      <StatCardSkeleton />
    </div>
  );
}

export function ContinueWatchingSectionSkeleton() {
  return (
    <div className="space-y-4">
      <SectionHeading width="w-40" />
      <div className="-mx-4 flex gap-4 overflow-hidden px-4 sm:-mx-0 sm:px-0">
        <ContinueWatchingSkeleton />
        <ContinueWatchingSkeleton />
        <ContinueWatchingSkeleton />
        <ContinueWatchingSkeleton />
      </div>
    </div>
  );
}

export function TitleGridSectionSkeleton() {
  return (
    <div className="space-y-4">
      <SectionHeading />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        <TitleCardSkeleton />
        <TitleCardSkeleton />
        <TitleCardSkeleton />
        <TitleCardSkeleton />
        <TitleCardSkeleton />
      </div>
    </div>
  );
}

export function PersonDetailSkeleton() {
  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-6 sm:flex-row sm:gap-8">
        <Skeleton className="size-40 shrink-0 self-center rounded-2xl sm:size-56 sm:self-start" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-9 w-2/3 sm:h-12" />
          <Skeleton className="h-5 w-24 rounded-md" />
          <div className="flex gap-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-36" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SeasonsSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Skeleton className="size-5 rounded" />
        <Skeleton className="h-7 w-28" />
      </div>
      <div className="space-y-2">
        {["s1", "s2", "s3"].map((id) => (
          <div
            key={id}
            className="overflow-hidden rounded-xl border border-border/50 bg-card/50"
          >
            <div className="flex items-center justify-between p-4">
              <Skeleton className="h-4 w-24" />
              <div className="flex items-center gap-3">
                <Skeleton className="hidden h-2 w-24 rounded-full sm:block" />
                <Skeleton className="h-3 w-10" />
                <Skeleton className="size-4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RecommendationsSkeleton() {
  return (
    <div className="space-y-4">
      <SectionHeading width="w-36" />
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

export function TitleDetailSkeleton() {
  return (
    <div className="space-y-10">
      <Skeleton className="-mt-6 mr-[calc(-50vw+50%)] ml-[calc(-50vw+50%)] h-80 rounded-none md:h-[28rem]" />
      <div className="flex flex-col gap-4 md:flex-row md:gap-8">
        <Skeleton className="aspect-[2/3] w-[140px] shrink-0 self-center rounded-xl md:w-[220px] md:self-start" />
        <div className="flex-1 space-y-5">
          <div>
            <Skeleton className="h-7 w-2/3 md:h-12" />
            <div className="mt-2 flex items-center gap-2">
              <Skeleton className="h-5 w-6 rounded" />
              <Skeleton className="h-4 w-10" />
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-9 w-28 rounded-lg" />
            <Skeleton className="h-4 w-px" />
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
                <Skeleton key={i} className="size-5 rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
