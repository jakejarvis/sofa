import { Skeleton } from "@/components/ui/skeleton";

export function TitleCardSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="aspect-[2/3] w-full rounded-xl" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

export function ContinueWatchingSkeleton() {
  return (
    <div className="flex w-56 shrink-0 gap-3 rounded-xl border border-border/30 bg-card/50 p-3">
      <Skeleton className="h-20 w-14 shrink-0 rounded-md" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-12" />
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return <Skeleton className="h-24 w-full rounded-xl" />;
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
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
      {/* Continue watching */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <div className="flex gap-4">
          <ContinueWatchingSkeleton />
          <ContinueWatchingSkeleton />
          <ContinueWatchingSkeleton />
          <ContinueWatchingSkeleton />
        </div>
      </div>
      {/* Grid */}
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
    </div>
  );
}
