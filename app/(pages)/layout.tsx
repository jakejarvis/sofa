import { Provider as StoreProvider } from "jotai";
import { redirect } from "next/navigation";
import { CommandPalette } from "@/components/command-palette";
import { MobileTabBar } from "@/components/mobile-tab-bar";
import { NavBar } from "@/components/nav-bar";
import { ProgressProvider } from "@/components/navigation-progress";
import { UpdateToast } from "@/components/update-toast";
import { getSession } from "@/lib/auth/session";

export default async function PagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <StoreProvider>
      <ProgressProvider>
        <div className="relative z-0 min-h-screen pb-[calc(3.5rem+env(safe-area-inset-bottom))] sm:pb-0">
          <NavBar />
          {/* Ambient glow — hidden on mobile where it overwhelms the viewport */}
          <div className="pointer-events-none fixed left-1/2 top-1/4 -translate-x-1/2 -translate-y-1/2 hidden h-[600px] w-[800px] rounded-full bg-primary/3 blur-[200px] sm:block" />
          <main
            id="main-content"
            className="relative mx-auto max-w-6xl px-[max(1rem,env(safe-area-inset-left))] py-6 sm:px-[max(1.5rem,env(safe-area-inset-right))]"
          >
            {children}
          </main>
        </div>
        <MobileTabBar />
        <CommandPalette />
        <UpdateToast />
      </ProgressProvider>
    </StoreProvider>
  );
}
