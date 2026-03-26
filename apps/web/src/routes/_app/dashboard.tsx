import { createFileRoute } from "@tanstack/react-router";

import { ContinueWatchingSectionSkeleton } from "@/components/dashboard/continue-watching-list";
import { ContinueWatchingSection } from "@/components/dashboard/continue-watching-section";
import { LibrarySection } from "@/components/dashboard/library-section";
import { RecommendationsSection } from "@/components/dashboard/recommendations-section";
import { StatsSectionSkeleton } from "@/components/dashboard/stats-display";
import { StatsSection } from "@/components/dashboard/stats-section";
import { TitleGridSectionSkeleton } from "@/components/dashboard/title-grid";
import { UpcomingSection } from "@/components/dashboard/upcoming-section";
import { WelcomeHeader } from "@/components/dashboard/welcome-header";
import { RouteError } from "@/components/route-error";
import { Skeleton } from "@/components/ui/skeleton";
import { orpc } from "@/lib/orpc/client";

export const Route = createFileRoute("/_app/dashboard")({
  staleTime: 30_000,
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(orpc.tracking.stats.queryOptions()),
      context.queryClient.ensureQueryData(orpc.library.continueWatching.queryOptions()),
      context.queryClient.ensureQueryData(orpc.discover.recommendations.queryOptions()),
      context.queryClient.ensureQueryData(
        orpc.library.upcoming.queryOptions({ input: { days: 7, limit: 5 } }),
      ),
      context.queryClient.ensureQueryData(
        orpc.library.list.queryOptions({ input: { page: 1, limit: 10 } }),
      ),
    ]);
  },
  head: () => ({ meta: [{ title: "Dashboard — Sofa" }] }),
  pendingComponent: DashboardSkeleton,
  errorComponent: RouteError,
  component: DashboardPage,
});

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-2 h-4 w-48" />
      </div>
      <StatsSectionSkeleton />
      <ContinueWatchingSectionSkeleton />
      <TitleGridSectionSkeleton />
      <TitleGridSectionSkeleton />
    </div>
  );
}

function DashboardPage() {
  const { session } = Route.useRouteContext();
  return (
    <div className="space-y-6">
      <WelcomeHeader name={session.user.name} />
      <StatsSection />
      <ContinueWatchingSection />
      <UpcomingSection />
      <LibrarySection />
      <RecommendationsSection />
    </div>
  );
}
