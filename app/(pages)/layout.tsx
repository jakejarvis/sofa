import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { CommandPalette } from "@/components/command-palette";
import { MobileTabBar } from "@/components/mobile-tab-bar";
import { NavBar } from "@/components/nav-bar";
import { UpdateToast } from "@/components/update-toast";
import { auth } from "@/lib/auth/server";

export default async function PagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  return (
    <>
      <div className="min-h-screen pb-14 sm:pb-0">
        <NavBar />
        {/* Ambient glow */}
        <div className="pointer-events-none fixed left-1/2 top-1/4 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[800px] rounded-full bg-primary/3 blur-[200px]" />
        <main className="relative mx-auto max-w-6xl px-4 py-6 sm:px-6">
          {children}
        </main>
      </div>
      <MobileTabBar />
      <CommandPalette />
      <UpdateToast />
    </>
  );
}
