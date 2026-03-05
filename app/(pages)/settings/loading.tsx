import { Skeleton } from "@/components/ui/skeleton";

function SectionSkeleton({
  headingWidth,
  children,
}: {
  headingWidth: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Skeleton className="size-4 rounded" />
        <Skeleton className={`h-3.5 ${headingWidth}`} />
      </div>
      {children}
    </div>
  );
}

export default function SettingsLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Skeleton className="size-5 rounded" />
          <Skeleton className="h-9 w-40" />
        </div>
        <Skeleton className="mt-1 h-4 w-64" />
      </div>

      {/* Account card */}
      <SectionSkeleton headingWidth="w-16">
        <Skeleton className="h-[76px] w-full rounded-xl" />
      </SectionSkeleton>

      {/* Integrations cards */}
      <SectionSkeleton headingWidth="w-24">
        <div className="space-y-3">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      </SectionSkeleton>
    </div>
  );
}
