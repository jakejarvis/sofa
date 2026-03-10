import { IconLock } from "@tabler/icons-react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { AuthForm } from "@/components/auth-form";
import { authClient } from "@/lib/auth/client";
import { client } from "@/lib/orpc/client";

export const Route = createFileRoute("/_auth/register")({
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession();
    if (session) throw redirect({ to: "/dashboard" });

    const authConfig = await client.system.authConfig({});
    return { authConfig };
  },
  component: RegisterPage,
});

function RegisterPage() {
  const { authConfig } = Route.useRouteContext();

  if (!authConfig.registrationOpen) {
    return (
      <div className="relative mx-auto w-full max-w-sm">
        <div className="absolute -inset-4 rounded-2xl bg-primary/3 blur-2xl" />
        <div className="relative space-y-6 rounded-xl border border-border/50 bg-card/80 p-8 text-center backdrop-blur-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <IconLock aria-hidden={true} className="size-6 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-balance font-display text-xl tracking-tight">
              Registration Closed
            </h1>
            <p className="text-muted-foreground text-sm">
              New accounts are not being accepted right now. Contact the admin
              if you need access.
            </p>
          </div>
          <Link
            to="/login"
            className="inline-flex h-10 items-center rounded-lg bg-primary px-6 font-medium text-primary-foreground text-sm transition-all hover:shadow-md hover:shadow-primary/20"
          >
            Sign in instead
          </Link>
        </div>
      </div>
    );
  }

  return (
    <AuthForm
      mode="register"
      authConfig={{
        oidcEnabled: authConfig.oidcEnabled,
        oidcProviderName: authConfig.oidcProviderName,
        passwordLoginDisabled: authConfig.passwordLoginDisabled,
      }}
    />
  );
}
