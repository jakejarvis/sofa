import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache, Suspense } from "react";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { titles } from "@/lib/db/schema";
import { getOrFetchTitle } from "@/lib/services/metadata";
import { getUserTitleInfo } from "@/lib/services/tracking";
import { getThemeCssProperties } from "@/lib/theme";
import { tmdbImageUrl } from "@/lib/tmdb/image";
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

const getCachedOrFetchTitle = cache((id: string) => getOrFetchTitle(id));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const title = db.select().from(titles).where(eq(titles.id, id)).get();
  if (!title) return { title: "Not Found — Sofa" };

  const year = (title.releaseDate ?? title.firstAirDate)?.slice(0, 4);
  return {
    title: `${title.title}${year ? ` (${year})` : ""} — Sofa`,
    description: title.overview?.slice(0, 160),
    openGraph: {
      title: title.title,
      images: title.posterPath
        ? [{ url: tmdbImageUrl(title.posterPath, "posters") ?? "" }]
        : [],
    },
  };
}

export default async function TitleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Fetch title + user info in parallel
  const session = await getSession();
  const [result, userInfo] = await Promise.all([
    getCachedOrFetchTitle(id),
    session ? getUserTitleInfo(session.user.id, id) : null,
  ]);
  if (!result) notFound();

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
