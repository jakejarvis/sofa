import { Trans } from "@lingui/react/macro";
import {
  IconDeviceTv,
  IconMovie,
  IconPlus,
  IconStar,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";

interface HeroBannerProps {
  id: string;
  type: "movie" | "tv";
  title: string;
  overview: string;
  backdropPath: string | null;
  voteAverage: number;
}

export function HeroBanner({
  id,
  type,
  title,
  overview,
  backdropPath,
  voteAverage,
}: HeroBannerProps) {
  return (
    <div className="relative -mt-6 mr-[calc(-50vw+50%)] mb-4 ml-[calc(-50vw+50%)] animate-stagger-item overflow-hidden">
      <div className="relative aspect-[21/9] max-h-[420px] min-h-[280px] w-full">
        {backdropPath ? (
          <img
            src={backdropPath}
            alt={title}
            loading="eager"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-card via-secondary to-muted" />
        )}

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-transparent" />

        {/* Content */}
        <div className="absolute inset-0 flex items-end">
          <div className="w-full pb-8">
            <div className="mx-auto max-w-6xl pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))] sm:pr-[max(1.5rem,env(safe-area-inset-right))] sm:pl-[max(1.5rem,env(safe-area-inset-left))]">
              <div
                className="animate-stagger-item"
                style={{ "--stagger-index": 3 } as React.CSSProperties}
              >
                <div className="mb-3 flex items-center gap-2">
                  <span className="inline-flex cursor-default items-center justify-center gap-1 rounded bg-primary/10 px-1.5 py-1 font-medium text-primary text-xs">
                    {type === "movie" ? (
                      <>
                        <IconMovie aria-hidden className="size-3.5" />
                        <Trans>Movie</Trans>
                      </>
                    ) : (
                      <>
                        <IconDeviceTv aria-hidden className="size-3.5" />
                        <Trans>TV</Trans>
                      </>
                    )}
                  </span>
                  {voteAverage > 0 && (
                    <span className="flex items-center gap-1 text-primary text-sm">
                      <IconStar
                        aria-hidden={true}
                        className="size-3.5 fill-primary"
                      />
                      {voteAverage.toFixed(1)}
                    </span>
                  )}
                  <span className="text-muted-foreground text-xs">
                    <Trans>Trending today</Trans>
                  </span>
                </div>
                <Link
                  to="/titles/$id"
                  params={{ id }}
                  className="group/title text-left"
                >
                  <h2 className="text-balance font-display text-3xl tracking-tight transition-colors group-hover/title:text-primary sm:text-4xl">
                    {title}
                  </h2>
                </Link>
                <p className="mt-2 line-clamp-2 max-w-2xl text-muted-foreground text-sm">
                  {overview}
                </p>
                <Link
                  to="/titles/$id"
                  params={{ id }}
                  className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 font-medium text-primary-foreground text-sm transition-shadow hover:shadow-md hover:shadow-primary/20"
                >
                  <IconPlus aria-hidden={true} className="size-4" />
                  <Trans>Add to Library</Trans>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
