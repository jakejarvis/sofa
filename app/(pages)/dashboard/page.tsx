import type { SearchParams } from "nuqs/server";
import { Suspense } from "react";
import {
  ContinueWatchingSectionSkeleton,
  StatsSectionSkeleton,
  TitleGridSectionSkeleton,
} from "@/components/skeletons";
import { getSession } from "@/lib/auth/session";
import { ContinueWatchingSection } from "./_components/continue-watching-section";
import { LibrarySection } from "./_components/library-section";
import { RecommendationsSection } from "./_components/recommendations-section";
import { StatsSection } from "./_components/stats-section";
import { WelcomeHeader } from "./_components/welcome-header";
import { loadDashboardSearchParams } from "./search-params";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getSession();
  if (!session) return null;

  const { moviePeriod, episodePeriod } =
    await loadDashboardSearchParams(searchParams);

  return (
    <div className="space-y-10">
      <WelcomeHeader name={session.user.name} />

      <Suspense fallback={<StatsSectionSkeleton />}>
        <StatsSection
          userId={session.user.id}
          moviePeriod={moviePeriod}
          episodePeriod={episodePeriod}
        />
      </Suspense>

      <Suspense fallback={<ContinueWatchingSectionSkeleton />}>
        <ContinueWatchingSection userId={session.user.id} />
      </Suspense>

      <Suspense fallback={<TitleGridSectionSkeleton />}>
        <LibrarySection userId={session.user.id} />
      </Suspense>

      <Suspense fallback={<TitleGridSectionSkeleton />}>
        <RecommendationsSection userId={session.user.id} />
      </Suspense>
    </div>
  );
}
