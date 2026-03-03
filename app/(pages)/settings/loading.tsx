import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Header */}
      <div>
        <Skeleton className="h-9 w-40" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>

      {/* Account card */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>

      {/* Media server cards */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    </div>
  );
}
