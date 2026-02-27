"use client";

import { IconStar, IconStarFilled } from "@tabler/icons-react";
import { useState } from "react";

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
          <button
            key={star}
            type="button"
            onClick={() => onChange(star === value ? 0 : star)}
            onMouseEnter={() => setHover(star)}
            className="p-0.5 transition-transform hover:scale-110"
          >
            {filled ? (
              <IconStarFilled size={18} className="text-primary" />
            ) : (
              <IconStar size={18} className="text-muted-foreground/30" />
            )}
          </button>
        );
      })}
    </div>
  );
}
