import { Trans } from "@lingui/react/macro";
import { createFileRoute, Link } from "@tanstack/react-router";

import { TitleActions } from "@/components/titles/title-actions";
import { TitleAvailability } from "@/components/titles/title-availability";
import { TitleCast } from "@/components/titles/title-cast";
import { TitleHero } from "@/components/titles/title-hero";
import { TitleKeyboardShortcuts } from "@/components/titles/title-keyboard-shortcuts";
import { TitleProvider } from "@/components/titles/title-provider";
import { TitleRecommendations } from "@/components/titles/title-recommendations";
import { TitleSeasons } from "@/components/titles/title-seasons";
import { TitleTheme } from "@/components/titles/title-theme";
import { Skeleton } from "@/components/ui/skeleton";
import { orpc } from "@/lib/orpc/client";
import { getThemeCssProperties } from "@/lib/theme";

export const Route = createFileRoute("/_app/titles/$id")({
  loader: async ({ params, context }) => {
    const [titleResult, userInfo] = await Promise.all([
      context.queryClient.ensureQueryData(
        orpc.titles.detail.queryOptions({ input: { id: params.id } }),
      ),
      context.queryClient
        .ensureQueryData(orpc.titles.userInfo.queryOptions({ input: { id: params.id } }))
        .catch(() => null),
    ]);
    return { ...titleResult, userInfo };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const { title } = loaderData;
    const year = (title.releaseDate ?? title.firstAirDate)?.slice(0, 4);
    return {
      meta: [{ title: `${title.title}${year ? ` (${year})` : ""} — Sofa` }],
    };
  },
  pendingComponent: TitleDetailLoading,
  errorComponent: TitleErrorComponent,
  notFoundComponent: TitleNotFound,
  component: TitleDetailPage,
});

function TitleDetailPage() {
  const { title, seasons, availability, cast } = Route.useLoaderData();

  const themeStyle = getThemeCssProperties(title.colorPalette);

  return (
    <div className="relative space-y-10" style={themeStyle}>
      <TitleTheme style={themeStyle as Record<string, string>} />
      <TitleProvider
        key={title.id}
        titleId={title.id}
        titleType={title.type}
        titleName={title.title}
        seasons={seasons}
      >
        <TitleHero title={title} trailerVideoKey={title.trailerVideoKey} actions={<TitleActions />}>
          <TitleAvailability availability={availability} />
        </TitleHero>

        {title.type === "tv" && seasons.length > 0 && <TitleSeasons />}

        <TitleCast cast={cast} titleType={title.type} />

        <TitleKeyboardShortcuts />
      </TitleProvider>

      <TitleRecommendations titleId={title.id} />
    </div>
  );
}

function TitleDetailLoading() {
  return (
    <div className="space-y-10">
      <Skeleton className="-mt-6 mr-[calc(-50vw+50%)] ml-[calc(-50vw+50%)] h-80 rounded-none md:h-[28rem]" />
      <div className="flex flex-col gap-4 md:flex-row md:gap-8">
        <Skeleton className="aspect-[2/3] w-[140px] shrink-0 self-center rounded-xl md:w-[220px] md:self-start" />
        <div className="flex-1 space-y-5">
          <div>
            <Skeleton className="h-7 w-2/3 md:h-12" />
            <div className="mt-2 flex items-center gap-2">
              <Skeleton className="h-5 w-6 rounded" />
              <Skeleton className="h-4 w-10" />
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-9 w-28 rounded-lg" />
            <Skeleton className="h-4 w-px" />
            <Skeleton className="h-5 w-24 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

function TitleErrorComponent() {
  return (
    <div className="flex flex-col items-center gap-6 py-24 text-center">
      <h1 className="font-display text-2xl tracking-tight sm:text-3xl">
        <Trans>Failed to load title</Trans>
      </h1>
      <p className="text-muted-foreground mx-auto max-w-sm text-sm leading-relaxed">
        <Trans>Something went wrong while loading this title. Please try again.</Trans>
      </p>
      <Link
        to="/dashboard"
        className="border-border hover:border-primary/40 hover:bg-primary/5 inline-flex h-10 items-center justify-center rounded-lg border px-5 text-sm font-medium transition-colors"
      >
        <Trans>Dashboard</Trans>
      </Link>
    </div>
  );
}

function TitleNotFound() {
  return (
    <div className="flex flex-col items-center gap-6 py-24 text-center">
      <h1
        className="animate-stagger-item font-display text-foreground/[0.06] text-[6rem] leading-[0.85] tracking-tight sm:text-[8rem]"
        style={{ "--stagger-index": 0 } as React.CSSProperties}
      >
        404
      </h1>
      <div
        className="animate-stagger-item -mt-4 space-y-2"
        style={{ "--stagger-index": 1 } as React.CSSProperties}
      >
        <h2 className="font-display text-2xl tracking-tight sm:text-3xl">
          <Trans>Title not found</Trans>
        </h2>
        <p className="text-muted-foreground mx-auto max-w-sm text-sm leading-relaxed">
          <Trans>
            The title you&apos;re looking for doesn&apos;t exist or may have been removed from the
            database.
          </Trans>
        </p>
      </div>
      <div
        className="animate-stagger-item flex items-center gap-3"
        style={{ "--stagger-index": 2 } as React.CSSProperties}
      >
        <Link
          to="/explore"
          className="group bg-primary text-primary-foreground hover:shadow-primary/20 relative inline-flex h-10 items-center justify-center overflow-hidden rounded-lg px-5 text-sm font-medium transition-shadow hover:shadow-lg"
        >
          <span className="relative z-10">
            <Trans>Explore titles</Trans>
          </span>
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        </Link>
        <Link
          to="/dashboard"
          className="border-border hover:border-primary/40 hover:bg-primary/5 inline-flex h-10 items-center justify-center rounded-lg border px-5 text-sm font-medium transition-colors"
        >
          <Trans>Dashboard</Trans>
        </Link>
      </div>
    </div>
  );
}
