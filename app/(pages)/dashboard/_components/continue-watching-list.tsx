"use client";

import { motion } from "motion/react";
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
      className="feed-scroll -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:-mx-0 sm:px-0"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {items.map((item) => (
        <motion.div key={item.title.id} variants={staggerItem}>
          <ContinueWatchingCard item={item} />
        </motion.div>
      ))}
    </motion.div>
  );
}
