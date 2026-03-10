import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LandingPage } from "@/components/landing-page";
import { getSession } from "@/lib/auth/session";
import { client } from "@/lib/orpc/client";

export default function Home() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}

async function HomeContent() {
  const session = await getSession();
  if (session?.user) redirect("/dashboard");

  const info = await client.system.publicInfo({});
  if (!info.tmdbConfigured) redirect("/setup");

  return (
    <LandingPage
      posterUrls={info.posterUrls}
      freshInstall={info.userCount === 0}
      registrationOpen={info.registrationOpen}
    />
  );
}
