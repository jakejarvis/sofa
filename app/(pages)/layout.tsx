import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CommandPalette } from "@/components/command-palette";
import { MobileTabBar } from "@/components/mobile-tab-bar";
import { NavBar } from "@/components/nav-bar";
import { ProgressProvider } from "@/components/navigation-progress";
import { UpdateToast } from "@/components/update-toast";
import { getSession } from "@/lib/auth/session";

export default function PagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense>
      <ProgressProvider>
        <AuthenticatedShell>{children}</AuthenticatedShell>
      </ProgressProvider>
    </Suspense>
  );
}

async function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <>
      <div className="relative z-0 min-h-screen pb-[calc(3.5rem+env(safe-area-inset-bottom))] sm:pb-0">
        <NavBar
          userName={session.user.name}
          userEmail={session.user.email}
          userImage={session.user.image || undefined}
        />
        {/* Ambient glow — smaller on mobile to add warmth without overwhelming */}
        <div className="pointer-events-none fixed top-1/4 left-1/2 h-[600px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/3 blur-[200px]" />
        <main
          id="main-content"
          className="relative mx-auto max-w-6xl py-6 pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))] sm:pr-[max(1.5rem,env(safe-area-inset-right))] sm:pl-[max(1.5rem,env(safe-area-inset-left))]"
        >
          {children}
        </main>
      </div>
      <MobileTabBar />
      <CommandPalette />
      {session.user.role === "admin" && <UpdateToast />}
    </>
  );
}
