import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { CommandPalette } from "@/components/command-palette";
import { MobileTabBar, NavBar } from "@/components/nav-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { UpdateToast } from "@/components/update-toast";
import { authClient } from "@/lib/auth/client";
import { client } from "@/lib/orpc/client";

export const Route = createFileRoute("/_app")({
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession();
    if (!session) throw redirect({ to: "/login" });

    let updateCheck = null;
    if (session.user.role === "admin") {
      try {
        ({ updateCheck } = await client.admin.updateCheck({}));
      } catch {
        // Silently ignore — update check is non-critical
      }
    }
    return { session, updateCheck };
  },
  component: AppLayout,
  pendingComponent: AppShellSkeleton,
});

function AppLayout() {
  const { session, updateCheck } = Route.useRouteContext();
  return (
    <>
      <div className="relative z-0 min-h-screen pb-[calc(3.5rem+env(safe-area-inset-bottom))] sm:pb-0">
        <NavBar
          userName={session.user.name}
          userEmail={session.user.email}
          userImage={session.user.image || undefined}
          userRole={session.user.role || undefined}
        />
        {/* Ambient glow */}
        <div className="pointer-events-none fixed top-1/4 left-1/2 h-[600px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/3 blur-[200px]" />
        <main
          id="main-content"
          className="relative mx-auto max-w-6xl py-6 pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))] sm:pr-[max(1.5rem,env(safe-area-inset-right))] sm:pl-[max(1.5rem,env(safe-area-inset-left))]"
        >
          <Outlet />
        </main>
      </div>
      <MobileTabBar />
      <CommandPalette />
      {session.user.role === "admin" && <UpdateToast data={updateCheck} />}
    </>
  );
}

function AppShellSkeleton() {
  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-50 border-border/50 border-b bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Skeleton className="size-7 rounded" />
          <Skeleton className="h-8 w-32 rounded-lg" />
          <Skeleton className="size-8 rounded-full" />
        </div>
      </div>
    </div>
  );
}
