"use client";

import { IconStar, IconStarFilled } from "@tabler/icons-react";
import { motion } from "motion/react";
import { useState } from "react";

const springTransition = {
  type: "spring" as const,
  stiffness: 400,
  damping: 15,
};

interface StarRatingProps {
  value: number;
  onChange: (value: number) => void;
}

export function StarRating({ value, onChange }: StarRatingProps) {
  const [hover, setHover] = useState(0);

  return (
    <div
      className="flex items-center gap-0.5"
      role="radiogroup"
      aria-label="Rating"
      onMouseLeave={() => setHover(0)}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= (hover || value);
        return (
          <motion.button
            key={star}
            type="button"
            role="radio"
            aria-checked={star === value}
            aria-label={`Rate ${star} star${star !== 1 ? "s" : ""}`}
            onClick={() => onChange(star === value ? 0 : star)}
            onMouseEnter={() => setHover(star)}
            className="p-0.5"
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            animate={
              filled && star === value ? { scale: [1, 1.25, 1] } : { scale: 1 }
            }
            transition={
              filled && star === value
                ? { type: "tween", duration: 0.3, ease: "easeInOut" }
                : springTransition
            }
          >
            {filled ? (
              <IconStarFilled className="size-4.5 text-primary" />
            ) : (
              <IconStar className="size-4.5 text-muted-foreground/30" />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
