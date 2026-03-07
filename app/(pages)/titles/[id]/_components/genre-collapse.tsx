"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function GenreCollapse({ genres }: { genres: string[] }) {
  if (genres.length === 0) return null;
  if (genres.length === 1) return <span>{genres[0]}</span>;

  const remaining = genres.slice(1);

  return (
    <span className="inline-flex items-center gap-1">
      <span>{genres[0]}</span>
      <Popover>
        <PopoverTrigger
          openOnHover
          delay={0}
          closeDelay={300}
          className="cursor-default text-muted-foreground/70 transition-colors hover:text-muted-foreground"
          aria-label={`${remaining.length} more genre${remaining.length > 1 ? "s" : ""}`}
        >
          +{remaining.length}
        </PopoverTrigger>
        <PopoverContent className="flex w-auto min-w-28 max-w-48 flex-col gap-0 p-1">
          {remaining.map((genre) => (
            <span
              key={genre}
              className="px-2 py-1 text-popover-foreground text-xs"
            >
              {genre}
            </span>
          ))}
        </PopoverContent>
      </Popover>
    </span>
  );
}
