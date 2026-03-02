import { headers } from "next/headers";
import { Suspense } from "react";
import {
  ContinueWatchingSectionSkeleton,
  StatsSectionSkeleton,
  TitleGridSectionSkeleton,
} from "@/components/skeletons";
import { auth } from "@/lib/auth/server";
import { ContinueWatchingSection } from "./_components/continue-watching-section";
import { LibrarySection } from "./_components/library-section";
import { RecommendationsSection } from "./_components/recommendations-section";
import { StatsSection } from "./_components/stats-section";
import { WelcomeHeader } from "./_components/welcome-header";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  return (
    <div className="space-y-10">
      <WelcomeHeader name={session.user.name} />

      <Suspense fallback={<StatsSectionSkeleton />}>
        <StatsSection userId={session.user.id} />
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
