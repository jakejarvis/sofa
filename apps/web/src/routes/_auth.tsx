import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";

import { authClient } from "@/lib/auth/client";

export const Route = createFileRoute("/_auth")({
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession();
    if (session) throw redirect({ to: "/dashboard" });
  },
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <main className="min-h-screen">
      <div className="flex min-h-[80vh] items-center justify-center px-4">
        <Outlet />
      </div>
    </main>
  );
}
