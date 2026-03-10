import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache, Suspense } from "react";
import { getSession } from "@/lib/auth/session";
import { serverClient } from "@/lib/orpc/client.server";
import { getThemeCssProperties } from "@/lib/theme";
import { AsyncTitleSeasons } from "./_components/async-title-seasons";
import { TitleActions } from "./_components/title-actions";
import { TitleAvailability } from "./_components/title-availability";
import { TitleCast } from "./_components/title-cast";
import { TitleHero } from "./_components/title-hero";
import { TitleKeyboardShortcuts } from "./_components/title-keyboard-shortcuts";
import { TitleProvider } from "./_components/title-provider";
import { TitleRecommendations } from "./_components/title-recommendations";
import { SeasonsSkeleton, TitleSeasons } from "./_components/title-seasons";
import { TitleTheme } from "./_components/title-theme";

const getCachedTitle = cache((id: string) =>
  serverClient.titles.detail({ id }),
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const { title } = await getCachedTitle(id);
    const year = (title.releaseDate ?? title.firstAirDate)?.slice(0, 4);
    return {
      title: `${title.title}${year ? ` (${year})` : ""} — Sofa`,
      description: title.overview?.slice(0, 160),
      openGraph: {
        title: title.title,
        images: title.posterPath ? [{ url: title.posterPath }] : [],
      },
    };
  } catch {
    return { title: "Not Found — Sofa" };
  }
}

export default async function TitleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Fetch title + user info in parallel
  const session = await getSession();
  let result: Awaited<ReturnType<typeof getCachedTitle>>;
  try {
    result = await getCachedTitle(id);
  } catch {
    notFound();
  }

  const userInfo = session ? await serverClient.titles.userInfo({ id }) : null;

  const { title, seasons, needsHydration, availability, cast } = result;

  const themeStyle = getThemeCssProperties(title.colorPalette);

  return (
    <div className="relative space-y-10" style={themeStyle}>
      <TitleTheme style={themeStyle as Record<string, string>} />
      <TitleProvider
        key={title.id}
        titleId={title.id}
        titleType={title.type}
        titleName={title.title}
        initialStatus={userInfo?.status ?? null}
        initialRating={userInfo?.rating ?? 0}
        initialEpisodeWatches={userInfo?.episodeWatches ?? []}
        seasons={seasons}
      >
        <TitleHero
          title={title}
          trailerVideoKey={title.trailerVideoKey}
          actions={<TitleActions />}
        >
          <TitleAvailability availability={availability} />
        </TitleHero>

        {title.type === "tv" && needsHydration && (
          <Suspense fallback={<SeasonsSkeleton />}>
            <AsyncTitleSeasons titleId={title.id} tmdbId={title.tmdbId} />
          </Suspense>
        )}
        {title.type === "tv" && !needsHydration && seasons.length > 0 && (
          <TitleSeasons />
        )}

        <TitleCast cast={cast} titleType={title.type} />

        <TitleKeyboardShortcuts />
      </TitleProvider>

      <TitleRecommendations titleId={title.id} />
    </div>
  );
}
