import { Trans } from "@lingui/react/macro";
import type { ColorPalette, ResolvedTitle } from "@sofa/api/schemas";
import {
  IconCalendarEvent,
  IconCircleCheck,
  IconCircleX,
  IconDeviceTv,
  IconLoader,
  IconMovie,
  IconRefresh,
  IconStarFilled,
} from "@tabler/icons-react";
import type { ReactNode } from "react";

import { ExpandableText } from "@/components/expandable-text";
import { TmdbLogo } from "@/components/tmdb-logo";
import { thumbHashToUrl } from "@/lib/thumbhash";
import { GenreCollapse } from "./genre-collapse";
import { TrailerDialog } from "./trailer-dialog";

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
        <div
          className="relative -mt-6 mr-[calc(-50vw+50%)] ml-[calc(-50vw+50%)] h-80 overflow-hidden md:h-[28rem]"
          style={
            title.backdropThumbHash
              ? {
                  backgroundImage: `url(${thumbHashToUrl(title.backdropThumbHash)})`,
                  backgroundSize: "cover",
                }
              : undefined
          }
        >
          <img
            src={title.backdropPath}
            alt=""
            loading="eager"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
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
            <div className="absolute inset-0 z-10 mb-12 flex items-center justify-center">
              <TrailerDialog videoKey={trailerVideoKey} variant="backdrop" />
            </div>
          )}
        </div>
      )}

      {/* Ambient glow orbs */}
      <AmbientGlow palette={palette} />

      {/* Title header */}
      <div
        className={`flex flex-col gap-4 md:flex-row md:gap-8 ${title.backdropPath ? "relative z-10 -mt-32" : ""}`}
      >
        {title.posterPath && (
          <div className="shrink-0 self-center md:self-start">
            <div
              className="overflow-hidden rounded-xl shadow-2xl ring-1 ring-foreground/5 transition-shadow duration-500 md:rounded-2xl"
              style={{
                boxShadow: palette?.darkVibrant
                  ? `0 25px 60px -12px ${palette.darkVibrant}50, 0 12px 28px -8px rgba(0,0,0,0.5)`
                  : "0 25px 50px -12px rgba(0,0,0,0.5)",
                ...(title.posterThumbHash
                  ? {
                      backgroundImage: `url(${thumbHashToUrl(title.posterThumbHash)})`,
                      backgroundSize: "cover",
                    }
                  : {}),
              }}
            >
              <img
                src={title.posterPath}
                alt={title.title}
                width={220}
                height={330}
                loading="eager"
                decoding="async"
                className="aspect-[2/3] w-[140px] object-cover md:w-[220px]"
              />
            </div>
          </div>
        )}

        <div className="flex-1 space-y-5">
          <div className="space-y-1.5">
            <h1 className="text-balance font-display text-2xl tracking-tight md:text-5xl">
              {title.title}
            </h1>
            {/* Desktop: single row with dot separators */}
            <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 text-muted-foreground text-sm md:gap-x-5">
              <div className="inline-flex cursor-default items-center justify-center gap-1.5 rounded bg-primary/10 px-1 py-1 font-medium text-primary text-xs md:px-1.5">
                {title.type === "movie" ? (
                  <>
                    <IconMovie
                      aria-hidden
                      className="size-3.5 translate-y-[-0.5px]"
                    />
                    <span className="hidden md:inline">
                      <Trans>Movie</Trans>
                    </span>
                  </>
                ) : (
                  <>
                    <IconDeviceTv
                      aria-hidden
                      className="size-3.5 translate-y-[-0.5px]"
                    />
                    <span className="hidden md:inline">
                      <Trans>TV</Trans>
                    </span>
                  </>
                )}
              </div>
              {title.contentRating && (
                <div className="inline-flex border border-muted-foreground/50 px-1.5 font-medium text-[13px]">
                  {title.contentRating}
                </div>
              )}
              {year && <span>{year}</span>}
              {title.genres.length > 0 && (
                <GenreCollapse genres={title.genres} />
              )}
              {title.voteAverage != null && title.voteAverage > 0 && (
                <span className="inline-flex items-center gap-1 text-primary">
                  <IconStarFilled className="size-3.5 translate-y-[-0.5px]" />
                  {title.voteAverage.toFixed(1)}
                </span>
              )}
              {title.status &&
                !(title.type === "movie" && title.status === "Released") &&
                !(
                  title.type === "tv" && title.status === "Returning Series"
                ) && (
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

          {title.overview && <ExpandableText text={title.overview} />}

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

  const glowColor = palette.vibrant ?? palette.darkMuted ?? palette.muted;

  return (
    <>
      {/* Mobile: single full-bleed color wash that flows from the backdrop edge-to-edge */}
      {glowColor && (
        <div
          className="pointer-events-none absolute top-0 right-[calc(-50dvw+50%)] left-[calc(-50dvw+50%)] -z-10 h-[600px] md:hidden"
          style={{
            background: `radial-gradient(ellipse 100% 60% at 50% 0%, ${glowColor}18 0%, transparent 70%)`,
          }}
        />
      )}

      {/* Desktop: multi-orb ambient glow with room to breathe */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 hidden h-[800px] md:block">
        {palette.vibrant && (
          <div
            className="absolute top-16 -left-32 h-[500px] w-[500px] rounded-full opacity-[0.07] blur-[120px]"
            style={{ background: palette.vibrant }}
          />
        )}
        {palette.darkMuted && (
          <div
            className="absolute top-48 -right-24 h-[400px] w-[600px] rounded-full opacity-[0.05] blur-[140px]"
            style={{ background: palette.darkMuted }}
          />
        )}
        {palette.muted && (
          <div
            className="absolute top-[500px] left-1/3 h-[300px] w-[400px] rounded-full opacity-[0.04] blur-[100px]"
            style={{ background: palette.muted }}
          />
        )}
      </div>
    </>
  );
}
