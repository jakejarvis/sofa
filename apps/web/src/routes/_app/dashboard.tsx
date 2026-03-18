import { createFileRoute } from "@tanstack/react-router";

import { ContinueWatchingSection } from "@/components/dashboard/continue-watching-section";
import { LibrarySection } from "@/components/dashboard/library-section";
import { RecommendationsSection } from "@/components/dashboard/recommendations-section";
import { StatsSection } from "@/components/dashboard/stats-section";
import { WelcomeHeader } from "@/components/dashboard/welcome-header";

export const Route = createFileRoute("/_app/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { session } = Route.useRouteContext();
  return (
    <div className="space-y-10">
      <WelcomeHeader name={session.user.name} />
      <StatsSection />
      <ContinueWatchingSection />
      <LibrarySection />
      <RecommendationsSection />
    </div>
  );
}
