import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ContinueWatchingCard,
  type ContinueWatchingItemProps,
} from "./continue-watching-card";

export function ContinueWatchingList({
  items,
}: {
  items: ContinueWatchingItemProps[];
}) {
  return (
    <ScrollArea
      scrollFade
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
