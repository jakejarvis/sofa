import { createFileRoute, redirect } from "@tanstack/react-router";
import { LandingPage } from "@/components/landing-page";
import { authClient } from "@/lib/auth/client";
import { client } from "@/lib/orpc/client";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession();
    if (session?.user) throw redirect({ to: "/dashboard" });
    const info = await client.system.publicInfo({});
    if (!info.tmdbConfigured) throw redirect({ to: "/setup" });
    return { info };
  },
  component: IndexPage,
});

function IndexPage() {
  const { info } = Route.useRouteContext();
  return (
    <LandingPage
      posterUrls={info.posterUrls}
      freshInstall={info.userCount === 0}
      registrationOpen={info.registrationOpen}
    />
  );
}
