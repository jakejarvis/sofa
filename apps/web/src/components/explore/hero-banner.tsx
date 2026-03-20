import { Trans } from "@lingui/react/macro";
import { IconDeviceTv, IconMovie, IconPlus, IconStar } from "@tabler/icons-react";
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
    <div className="animate-stagger-item relative -mt-6 mr-[calc(-50vw+50%)] mb-4 ml-[calc(-50vw+50%)] overflow-hidden">
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
          <div className="from-card via-secondary to-muted h-full w-full bg-gradient-to-br" />
        )}

        {/* Gradient overlays */}
        <div className="from-background via-background/60 absolute inset-0 bg-gradient-to-t to-transparent" />
        <div className="from-background/80 absolute inset-0 bg-gradient-to-r via-transparent to-transparent" />

        {/* Content */}
        <div className="absolute inset-0 flex items-end">
          <div className="w-full pb-8">
            <div className="mx-auto max-w-6xl pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))] sm:pr-[max(1.5rem,env(safe-area-inset-right))] sm:pl-[max(1.5rem,env(safe-area-inset-left))]">
              <div
                className="animate-stagger-item"
                style={{ "--stagger-index": 3 } as React.CSSProperties}
              >
                <div className="mb-3 flex items-center gap-2">
                  <span className="bg-primary/10 text-primary inline-flex cursor-default items-center justify-center gap-1 rounded px-1.5 py-1 text-xs font-medium">
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
                    <span className="text-primary flex items-center gap-1 text-sm">
                      <IconStar aria-hidden={true} className="fill-primary size-3.5" />
                      {voteAverage.toFixed(1)}
                    </span>
                  )}
                  <span className="text-muted-foreground text-xs">
                    <Trans>Trending today</Trans>
                  </span>
                </div>
                <Link to="/titles/$id" params={{ id }} className="group/title text-start">
                  <h2 className="font-display group-hover/title:text-primary text-3xl tracking-tight text-balance transition-colors sm:text-4xl">
                    {title}
                  </h2>
                </Link>
                <p className="text-muted-foreground mt-2 line-clamp-2 max-w-2xl text-sm">
                  {overview}
                </p>
                <Link
                  to="/titles/$id"
                  params={{ id }}
                  className="bg-primary text-primary-foreground hover:shadow-primary/20 mt-4 inline-flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-medium transition-shadow hover:shadow-md"
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
