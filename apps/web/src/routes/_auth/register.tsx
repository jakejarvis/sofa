import { Trans } from "@lingui/react/macro";
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
        <div className="bg-primary/3 absolute -inset-4 rounded-2xl blur-2xl" />
        <div className="border-border/50 bg-card/80 relative space-y-6 rounded-xl border p-8 text-center backdrop-blur-sm">
          <div className="bg-primary/10 mx-auto flex h-12 w-12 items-center justify-center rounded-full">
            <IconLock aria-hidden={true} className="text-primary size-6" />
          </div>
          <div className="space-y-2">
            <h1 className="font-display text-xl tracking-tight text-balance">
              <Trans>Registration Closed</Trans>
            </h1>
            <p className="text-muted-foreground text-sm">
              <Trans>
                New accounts are not being accepted right now. Contact the admin if you need access.
              </Trans>
            </p>
          </div>
          <Link
            to="/login"
            className="bg-primary text-primary-foreground hover:shadow-primary/20 inline-flex h-10 items-center rounded-lg px-6 text-sm font-medium transition-all hover:shadow-md"
          >
            <Trans>Sign in instead</Trans>
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
