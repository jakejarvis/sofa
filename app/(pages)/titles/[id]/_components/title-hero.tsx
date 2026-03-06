import {
  IconCalendarEvent,
  IconCircleCheck,
  IconCircleX,
  IconLoader,
  IconRefresh,
  IconStarFilled,
} from "@tabler/icons-react";
import Image from "next/image";
import type { ReactNode } from "react";
import { TmdbLogo } from "@/components/tmdb-logo";
import type { ColorPalette, ResolvedTitle } from "@/lib/types/title";
import { GenreCollapse } from "./genre-collapse";
import { TrailerDialog } from "./trailer-dialog";
import { TypeBadge } from "./type-badge";

export function TitleHero({
  title,
  trailerVideoKey,
  actions,
  children,
}: {
  title: ResolvedTitle;
  trailerVideoKey?: string | null;
  actions: ReactNode;
  children?: ReactNode;
}) {
  const dateStr = title.releaseDate ?? title.firstAirDate;
  const year = dateStr?.slice(0, 4);
  const palette = title.colorPalette;

  return (
    <>
      {/* Backdrop hero */}
      {title.backdropPath && (
        <div className="relative -mt-6 ml-[calc(-50vw+50%)] mr-[calc(-50vw+50%)] h-80 overflow-hidden sm:h-[28rem]">
          <Image
            src={title.backdropPath}
            alt=""
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/30" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-background/15" />
          {palette?.darkMuted && (
            <div
              className="absolute inset-0 opacity-40 mix-blend-multiply"
              style={{
                background: `radial-gradient(ellipse at 25% 85%, ${palette.darkMuted} 0%, transparent 65%)`,
              }}
            />
          )}
          {palette?.vibrant && (
            <div
              className="absolute inset-0 opacity-[0.08]"
              style={{
                background: `radial-gradient(ellipse at 50% 70%, ${palette.vibrant} 0%, transparent 55%)`,
              }}
            />
          )}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            }}
          />
          {trailerVideoKey && (
            <div className="absolute inset-0 z-10 flex items-center justify-center">
              <TrailerDialog videoKey={trailerVideoKey} variant="backdrop" />
            </div>
          )}
        </div>
      )}

      {/* Ambient glow orbs */}
      <AmbientGlow palette={palette} />

      {/* Title header */}
      <div
        className={`flex flex-row gap-4 sm:gap-8 ${title.backdropPath ? "-mt-32 relative z-10" : ""}`}
      >
        {title.posterPath && (
          <div className="shrink-0">
            <div
              className="overflow-hidden rounded-xl sm:rounded-2xl ring-1 ring-foreground/5 shadow-2xl transition-shadow duration-500"
              style={{
                boxShadow: palette?.darkVibrant
                  ? `0 25px 60px -12px ${palette.darkVibrant}50, 0 12px 28px -8px rgba(0,0,0,0.5)`
                  : "0 25px 50px -12px rgba(0,0,0,0.5)",
              }}
            >
              <Image
                src={title.posterPath}
                alt={title.title}
                width={220}
                height={330}
                className="h-auto w-[120px] sm:w-[220px]"
                priority
              />
            </div>
          </div>
        )}

        <div className="flex-1 space-y-5">
          <div>
            <h1 className="font-display text-2xl tracking-tight text-balance sm:text-5xl">
              {title.title}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
              <TypeBadge type={title.type} />
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 [&>*+*]:before:mr-2 [&>*+*]:before:text-border [&>*+*]:before:content-['·']">
                {title.contentRating && <span>{title.contentRating}</span>}
                {year && <span>{year}</span>}
                {title.genres.length > 0 && (
                  <GenreCollapse genres={title.genres} />
                )}
                {title.voteAverage != null && title.voteAverage > 0 && (
                  <span className="inline-flex items-center gap-1 text-primary">
                    <IconStarFilled className="size-3.5" />
                    {title.voteAverage.toFixed(1)}
                  </span>
                )}
                {title.status &&
                  !(title.type === "movie" && title.status === "Released") && (
                    <span className="inline-flex items-center gap-1">
                      <StatusIcon status={title.status} />
                      {title.status}
                    </span>
                  )}
                <a
                  href={`https://www.themoviedb.org/${title.type === "movie" ? "movie" : "tv"}/${title.tmdbId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="View on TMDB"
                  className="inline-flex items-center opacity-70 transition-opacity hover:opacity-40"
                >
                  <TmdbLogo className="h-2.5 w-auto" />
                </a>
              </div>
            </div>
          </div>

          {title.overview && (
            <p className="max-w-2xl break-words leading-relaxed text-muted-foreground">
              {title.overview}
            </p>
          )}

          {actions}

          {children}
        </div>
      </div>
    </>
  );
}

const statusIcons: Record<string, React.ReactNode> = {
  Ended: <IconCircleCheck className="size-3.5" />,
  Canceled: <IconCircleX className="size-3.5" />,
  "Returning Series": <IconRefresh className="size-3.5" />,
  "In Production": <IconLoader className="size-3.5" />,
  "Post Production": <IconLoader className="size-3.5" />,
  Planned: <IconCalendarEvent className="size-3.5" />,
  Pilot: <IconCalendarEvent className="size-3.5" />,
  Rumored: <IconCalendarEvent className="size-3.5" />,
};

function StatusIcon({ status }: { status: string }) {
  return statusIcons[status] ?? null;
}

function AmbientGlow({ palette }: { palette: ColorPalette | null }) {
  if (!palette) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[800px] overflow-hidden">
      {palette.vibrant && (
        <div
          className="absolute -left-32 top-16 h-[500px] w-[500px] rounded-full opacity-[0.07] blur-[120px]"
          style={{ background: palette.vibrant }}
        />
      )}
      {palette.darkMuted && (
        <div
          className="absolute -right-24 top-48 h-[400px] w-[600px] rounded-full opacity-[0.05] blur-[140px]"
          style={{ background: palette.darkMuted }}
        />
      )}
      {palette.muted && (
        <div
          className="absolute left-1/3 top-[500px] h-[300px] w-[400px] rounded-full opacity-[0.04] blur-[100px]"
          style={{ background: palette.muted }}
        />
      )}
    </div>
  );
}
