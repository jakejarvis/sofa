import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth")({
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
