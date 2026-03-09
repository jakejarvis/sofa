import { Skeleton } from "@/components/ui/skeleton";

export default function TitleDetailLoading() {
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
            <Skeleton className="h-5 w-24 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
