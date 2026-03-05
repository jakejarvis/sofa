import { Skeleton } from "@/components/ui/skeleton";

export function TitleCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl bg-card ring-1 ring-white/[0.06]">
      <Skeleton className="aspect-[2/3] w-full rounded-none" />
      <div className="px-3 pb-3 pt-2.5">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="mt-1.5 h-3 w-1/2" />
      </div>
    </div>
  );
}

export function ContinueWatchingSkeleton() {
  return (
    <div className="w-[calc(100vw-3rem)] shrink-0 overflow-hidden rounded-xl border border-border/30 bg-card/50 sm:w-72">
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
  return <Skeleton className="h-24 w-full rounded-xl" />;
}

export function StatsSectionSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
      <Skeleton className="h-6 w-40" />
      <div className="flex gap-4 overflow-hidden">
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
      <Skeleton className="h-6 w-32" />
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

export function RecommendationsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
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
      <Skeleton className="-mx-4 -mt-6 h-72 sm:h-96" />
      <div className="flex flex-col gap-8 sm:flex-row">
        <Skeleton className="h-[330px] w-[220px] shrink-0 rounded-xl" />
        <div className="flex-1 space-y-5">
          <Skeleton className="h-12 w-2/3" />
          <Skeleton className="h-5 w-1/3" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-9 w-32 rounded-lg" />
            <Skeleton className="h-9 w-32 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-10">
      <div>
        <Skeleton className="h-9 w-64" />
        <Skeleton className="mt-2 h-4 w-48" />
      </div>
      <StatsSectionSkeleton />
      <ContinueWatchingSectionSkeleton />
      <TitleGridSectionSkeleton />
    </div>
  );
}
