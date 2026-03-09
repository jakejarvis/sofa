"use client";

import {
  IconDeviceTv,
  IconMovie,
  IconPlus,
  IconStar,
} from "@tabler/icons-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { useProgress } from "@/components/navigation-progress";
import { api } from "@/lib/api-client";

interface HeroBannerProps {
  tmdbId: number;
  type: "movie" | "tv";
  title: string;
  overview: string;
  backdropPath: string | null;
  voteAverage: number;
}

export function HeroBanner({
  tmdbId,
  type,
  title,
  overview,
  backdropPath,
  voteAverage,
}: HeroBannerProps) {
  const router = useRouter();
  const progress = useProgress();
  const [isPending, startTransition] = useTransition();

  function handleNavigate() {
    if (isPending) return;
    progress.start();
    startTransition(async () => {
      try {
        const { id } = await api<{ id: string }>("/titles/resolve", {
          method: "POST",
          body: JSON.stringify({ tmdbId, type }),
        });
        if (id) router.push(`/titles/${id}`);
        else progress.done();
      } catch {
        progress.done();
        toast.error("Failed to load title");
      }
    });
  }

  return (
    <div className="relative -mt-6 mr-[calc(-50vw+50%)] mb-4 ml-[calc(-50vw+50%)] animate-stagger-item overflow-hidden">
      <div className="relative aspect-[21/9] max-h-[420px] min-h-[280px] w-full">
        {backdropPath ? (
          <Image
            src={backdropPath}
            alt={title}
            fill
            priority
            className="object-cover"
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
                        Movie
                      </>
                    ) : (
                      <>
                        <IconDeviceTv aria-hidden className="size-3.5" />
                        TV
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
                    Trending today
                  </span>
                </div>
                <button
                  type="button"
                  className="group/title cursor-pointer text-left"
                  onClick={handleNavigate}
                  disabled={isPending}
                >
                  <h2 className="text-balance font-display text-3xl tracking-tight transition-colors group-hover/title:text-primary sm:text-4xl">
                    {title}
                  </h2>
                </button>
                <p className="mt-2 line-clamp-2 max-w-2xl text-muted-foreground text-sm">
                  {overview}
                </p>
                <button
                  type="button"
                  onClick={handleNavigate}
                  disabled={isPending}
                  className="mt-4 inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 font-medium text-primary-foreground text-sm transition-shadow hover:shadow-md hover:shadow-primary/20 disabled:opacity-70"
                >
                  <IconPlus aria-hidden={true} className="size-4" />
                  Add to Library
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
