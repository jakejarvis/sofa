import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { RecommendationsSkeleton } from "@/components/skeletons";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { titles } from "@/lib/db/schema";
import { getTitleWithChildren, importTitle } from "@/lib/services/metadata";
import { getUserTitleInfo } from "@/lib/services/tracking";
import { tmdbImageUrl } from "@/lib/tmdb/image";
import { getTitleThemeStyle } from "@/lib/utils/title-theme";
import { TitleActions } from "./_components/title-actions";
import { TitleAvailability } from "./_components/title-availability";
import { TitleCast } from "./_components/title-cast";
import { TitleHero } from "./_components/title-hero";
import { TitleKeyboardShortcuts } from "./_components/title-keyboard-shortcuts";
import { TitleProvider } from "./_components/title-provider";
import { TitleRecommendations } from "./_components/title-recommendations";
import { TitleSeasons } from "./_components/title-seasons";

const TMDB_ID_PATTERN = /^tmdb-(\d+)-(movie|tv)$/;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  if (TMDB_ID_PATTERN.test(id)) return { title: "Sofa" };

  const title = db.select().from(titles).where(eq(titles.id, id)).get();
  if (!title) return { title: "Not Found — Sofa" };

  const year = (title.releaseDate ?? title.firstAirDate)?.slice(0, 4);
  return {
    title: `${title.title}${year ? ` (${year})` : ""} — Sofa`,
    description: title.overview?.slice(0, 160),
    openGraph: {
      title: title.title,
      images: title.posterPath
        ? [{ url: tmdbImageUrl(title.posterPath, "w500") ?? "" }]
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

  // TMDB ID resolution: tmdb-{id}-{type} → import + redirect
  const tmdbMatch = TMDB_ID_PATTERN.exec(id);
  if (tmdbMatch) {
    const title = await importTitle(
      Number(tmdbMatch[1]),
      tmdbMatch[2] as "movie" | "tv",
    );
    if (!title) notFound();
    redirect(`/titles/${title.id}`);
  }

  // Fetch title + user info in parallel
  const session = await getSession();
  const [result, userInfo] = await Promise.all([
    getTitleWithChildren(id),
    session ? getUserTitleInfo(session.user.id, id) : null,
  ]);
  if (!result) notFound();

  const { title, seasons, availability, cast } = result;

  const themeStyle = getTitleThemeStyle(title.colorPalette);

  return (
    <div className="relative space-y-10" style={themeStyle}>
      <TitleProvider
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

        <TitleCast cast={cast} titleType={title.type} />

        {title.type === "tv" && seasons.length > 0 && <TitleSeasons />}

        <TitleKeyboardShortcuts />
      </TitleProvider>

      <Suspense fallback={<RecommendationsSkeleton />}>
        <TitleRecommendations titleId={title.id} />
      </Suspense>
    </div>
  );
}
