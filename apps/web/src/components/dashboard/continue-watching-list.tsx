import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ContinueWatchingCard,
  type ContinueWatchingItemProps,
} from "./continue-watching-card";

function ContinueWatchingSkeleton() {
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

export function ContinueWatchingSectionSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Skeleton className="size-5 rounded" />
        <Skeleton className="h-6 w-40" />
      </div>
      <div className="-mx-4 flex gap-4 overflow-hidden px-4 sm:-mx-0 sm:px-0">
        <ContinueWatchingSkeleton />
        <ContinueWatchingSkeleton />
        <ContinueWatchingSkeleton />
        <ContinueWatchingSkeleton />
      </div>
    </div>
  );
}

export function ContinueWatchingList({
  items,
}: {
  items: ContinueWatchingItemProps[];
}) {
  return (
    <ScrollArea
      scrollFade
      hideScrollbar
      className="-mx-4 sm:-mx-0 [&_[data-slot=scroll-area-content]]:px-px"
    >
      <div className="flex gap-4 px-4 py-2 sm:px-0">
        {items.map((item, i) => (
          <div key={item.title.id} className="shrink-0">
            <div
              className="animate-stagger-item"
              style={{ "--stagger-index": i } as React.CSSProperties}
            >
              <ContinueWatchingCard item={item} />
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
