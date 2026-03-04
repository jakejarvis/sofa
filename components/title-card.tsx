"use client";

import { IconDeviceTv, IconMovie, IconStarFilled } from "@tabler/icons-react";
import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";

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
}

export function TitleCard({
  id,
  type,
  title,
  posterPath,
  releaseDate,
  voteAverage,
  href,
  onImport,
}: TitleCardProps) {
  const year = releaseDate?.slice(0, 4);
  const TypeIcon = type === "movie" ? IconMovie : IconDeviceTv;

  const content = (
    <motion.div
      className="group relative overflow-hidden rounded-xl bg-card ring-1 ring-white/[0.06] transition-shadow hover:ring-primary/25 hover:shadow-lg hover:shadow-primary/5"
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
    return <Link href={href ?? `/titles/${id}`}>{content}</Link>;
  }

  if (onImport) {
    return (
      <button type="button" onClick={onImport} className="w-full text-left">
        {content}
      </button>
    );
  }

  return content;
}
