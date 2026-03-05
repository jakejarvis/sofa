"use client";

import { IconUser, IconUsers } from "@tabler/icons-react";
import { WheelGesturesPlugin } from "embla-carousel-wheel-gestures";
import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import type { CastMember } from "@/lib/types/title";

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
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

interface CastCarouselProps {
  actors: CastMember[];
  titleType: "movie" | "tv";
}

export function CastCarousel({ actors, titleType }: CastCarouselProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <IconUsers className="size-5 text-primary" />
        <h2 className="font-display text-xl tracking-tight">Cast</h2>
      </div>

      {actors.length > 0 && (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <Carousel
            opts={{
              align: "start",
              dragFree: true,
              containScroll: "trimSnaps",
            }}
            plugins={[WheelGesturesPlugin({ forceWheelAxis: "x" })]}
            className="-mx-4 sm:-mx-0"
          >
            <CarouselContent className="px-4 sm:px-0">
              {actors.map((member) => (
                <CarouselItem
                  key={member.id}
                  className="w-[100px] shrink-0 basis-auto pl-4 sm:w-[120px]"
                >
                  <motion.div variants={staggerItem}>
                    <Link
                      href={`/people/${member.personId}`}
                      className="group flex flex-col items-center gap-2"
                    >
                      <div className="size-20 overflow-hidden rounded-full ring-1 ring-white/10 transition-all group-hover:ring-primary/25 sm:size-24">
                        {member.profilePath ? (
                          <Image
                            src={member.profilePath}
                            alt={member.name}
                            width={96}
                            height={96}
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                            <IconUser className="size-8 text-muted-foreground/50" />
                          </div>
                        )}
                      </div>
                      <div className="w-full text-center">
                        <p className="truncate text-xs font-medium">
                          {member.name}
                        </p>
                        {member.character && (
                          <p className="truncate text-[10px] text-muted-foreground">
                            {member.character}
                          </p>
                        )}
                        {titleType === "tv" && member.episodeCount && (
                          <p className="text-[10px] text-muted-foreground/70">
                            {member.episodeCount} ep
                            {member.episodeCount !== 1 ? "s" : ""}
                          </p>
                        )}
                      </div>
                    </Link>
                  </motion.div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </motion.div>
      )}
    </section>
  );
}
