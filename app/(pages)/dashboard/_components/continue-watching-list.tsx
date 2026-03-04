"use client";

import { WheelGesturesPlugin } from "embla-carousel-wheel-gestures";
import { motion } from "motion/react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import {
  ContinueWatchingCard,
  type ContinueWatchingItemProps,
} from "./continue-watching-card";

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 },
  },
};

export function ContinueWatchingList({
  items,
}: {
  items: ContinueWatchingItemProps[];
}) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <Carousel
        opts={{ align: "start", dragFree: true, containScroll: "trimSnaps" }}
        plugins={[WheelGesturesPlugin({ forceWheelAxis: "x" })]}
        className="-mx-4 sm:-mx-0"
      >
        <CarouselContent className="px-4 sm:px-0">
          {items.map((item) => (
            <CarouselItem key={item.title.id} className="basis-auto pl-4">
              <motion.div variants={staggerItem}>
                <ContinueWatchingCard item={item} />
              </motion.div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </motion.div>
  );
}
