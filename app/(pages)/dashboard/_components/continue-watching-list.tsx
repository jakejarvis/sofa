"use client";

import { WheelGesturesPlugin } from "embla-carousel-wheel-gestures";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
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
    <Carousel
      opts={{ align: "start", dragFree: true, containScroll: "trimSnaps" }}
      plugins={[WheelGesturesPlugin({ forceWheelAxis: "x" })]}
      className="-mx-4 sm:-mx-0"
    >
      <CarouselContent className="px-4 sm:px-0">
        {items.map((item, i) => (
          <CarouselItem key={item.title.id} className="basis-auto pl-4">
            <div
              className="animate-stagger-item"
              style={{ "--stagger-index": i } as React.CSSProperties}
            >
              <ContinueWatchingCard item={item} />
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}
