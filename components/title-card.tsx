"use client";

import {
  IconCheck,
  IconDeviceTv,
  IconLoader,
  IconMovie,
  IconPlus,
  IconStarFilled,
} from "@tabler/icons-react";
import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { quickAddToWatchlist } from "@/lib/actions/watchlist";

interface TitleCardProps {
  id?: string;
  tmdbId: number;
  type: string;
  title: string;
  posterPath: string | null;
  releaseDate?: string | null;
  voteAverage?: number | null;
  href?: string;
  onImport?: () => void;
  showQuickAdd?: boolean;
}

type QuickAddState = "idle" | "loading" | "added";

function QuickAddButton({
  tmdbId,
  type,
}: {
  tmdbId: number;
  type: "movie" | "tv";
}) {
  const [state, setState] = useState<QuickAddState>("idle");

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (state === "loading" || state === "added") return;
    setState("loading");
    try {
      await quickAddToWatchlist(tmdbId, type);
      setState("added");
    } catch {
      setState("idle");
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger
        onClick={handleClick}
        className="absolute top-2 right-2 z-10 flex size-8 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 hover:bg-black/70"
        render={<button type="button" />}
      >
        {state === "idle" && <IconPlus className="size-4" />}
        {state === "loading" && <IconLoader className="size-4 animate-spin" />}
        {state === "added" && <IconCheck className="size-4 text-green-400" />}
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {state === "added" ? "Added to Watchlist" : "Add to Watchlist"}
      </TooltipContent>
    </Tooltip>
  );
}

export function TitleCard({
  id,
  tmdbId,
  type,
  title,
  posterPath,
  releaseDate,
  voteAverage,
  href,
  onImport,
  showQuickAdd,
}: TitleCardProps) {
  const year = releaseDate?.slice(0, 4);
  const TypeIcon = type === "movie" ? IconMovie : IconDeviceTv;

  const cardInner = (
    <motion.div
      className="relative overflow-hidden rounded-xl bg-card ring-1 ring-white/[0.06] transition-shadow hover:ring-primary/25 hover:shadow-lg hover:shadow-primary/5"
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <div className="aspect-[2/3] overflow-hidden bg-card">
        {posterPath ? (
          <Image
            src={posterPath}
            alt={title}
            width={300}
            height={450}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="relative flex h-full items-center justify-center overflow-hidden bg-gradient-to-br from-card via-secondary to-muted">
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/10 via-transparent to-transparent" />
            <div className="relative px-3 text-center">
              <p className="font-display text-sm leading-snug tracking-tight text-foreground/70">
                {title}
              </p>
            </div>
          </div>
        )}
        {/* Hover gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
      </div>

      {/* Metadata */}
      <div className="px-3 pb-3 pt-2.5">
        <p className="line-clamp-1 text-sm font-medium leading-snug">{title}</p>
        <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
          <TypeIcon className="size-3.5 shrink-0 text-primary/60" />
          {year && <span>{year}</span>}
          {voteAverage != null && voteAverage > 0 && (
            <span className="ml-auto flex items-center gap-0.5 text-primary/80">
              <IconStarFilled className="size-[11px]" />
              {voteAverage.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );

  if (href || id) {
    return (
      <div className="relative group">
        {showQuickAdd && (
          <QuickAddButton tmdbId={tmdbId} type={type as "movie" | "tv"} />
        )}
        <Link href={href ?? `/titles/${id}`}>{cardInner}</Link>
      </div>
    );
  }

  if (onImport) {
    return (
      <button type="button" onClick={onImport} className="w-full text-left">
        {cardInner}
      </button>
    );
  }

  return cardInner;
}
